import { describe, it, expect } from 'vitest';
import { handleChatQuery } from '@/lib/chat/service';
import { buildChatSystemInstruction } from '@/lib/chat/instruction';
import {
  SlidingWindowRateLimiter,
  getClientIp,
  chatRateLimiter,
  advisoryRateLimiter,
  airQualityRateLimiter,
  planRateLimiter,
} from '@/lib/rate-limit';
import { generateCommunityAdvisory } from '@/lib/community/advisory-generator';
import { NextRequest } from 'next/server';
import { MOCK_AIR_QUALITY, MOCK_PLAN_PROFILE } from './chat-fixtures';

describe('Rate Limiter', () => {
  it('allows requests within limit and rejects once limit is exceeded', () => {
    const limiter = new SlidingWindowRateLimiter(3, 60);
    const testKey = 'test-ip-1';

    const res1 = limiter.check(testKey);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check(testKey);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check(testKey);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = limiter.check(testKey);
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.resetSeconds).toBeGreaterThan(0);

    limiter.reset();
    const resAfterReset = limiter.check(testKey);
    expect(resAfterReset.success).toBe(true);
  });

  it('correctly extracts client IP from request headers', () => {
    const reqWithForwarded = new NextRequest('http://localhost:3000/api/chat', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
    });
    expect(getClientIp(reqWithForwarded)).toBe('70.41.3.18');

    const reqWithRealIp = new NextRequest('http://localhost:3000/api/chat', {
      headers: { 'x-real-ip': '198.51.100.22' },
    });
    expect(getClientIp(reqWithRealIp)).toBe('198.51.100.22');

    const reqWithNoHeaders = new NextRequest('http://localhost:3000/api/chat');
    expect(getClientIp(reqWithNoHeaders)).toBe('127.0.0.1');
  });

  it('exports singleton rate limiters for all API endpoints', () => {
    expect(chatRateLimiter.check('ip-test').limit).toBe(15);
    expect(advisoryRateLimiter.check('ip-test').limit).toBe(20);
    expect(airQualityRateLimiter.check('ip-test').limit).toBe(60);
    expect(planRateLimiter.check('ip-test').limit).toBe(30);
  });
});

describe('Chat Service & Medical Policy', () => {
  it('builds system instruction containing topic boundaries, zero-hallucination rules, and medical doctor advice', () => {
    const prompt = buildChatSystemInstruction(MOCK_PLAN_PROFILE, 'Noida');

    expect(prompt).toContain('Asthma');
    expect(prompt).toContain('Noida');
    expect(prompt).toContain('TOPIC BOUNDARIES');
    expect(prompt).toContain('NO NUMERICAL GUESSING');
    expect(prompt).toContain('MEDICAL DISCLAIMER');
    expect(prompt).toContain('doctor');
  });

  it('handles medical questions in fallback mode by advising consulting a doctor alongside precautions', async () => {
    const response = await handleChatQuery(
      {
        message: 'My child has a bad cough and difficulty breathing in this smog, what should I do?',
        place: 'Noida',
        householdProfile: MOCK_PLAN_PROFILE,
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined,
      }
    );

    expect(response.reply).toContain('doctor');
    expect(response.reply).toContain('medical');
    expect(response.reply).toMatch(/(HEPA|inhaler|indoors|sealed)/i);
  });

  it('handles outdoor play timing questions with hourly forecast analysis in fallback mode', async () => {
    const response = await handleChatQuery(
      {
        message: 'Can my daughter play outside at 5pm today?',
        place: 'Noida',
        householdProfile: MOCK_PLAN_PROFILE,
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined,
      }
    );

    expect(response.reply.length).toBeGreaterThan(50);
    expect(response.toolsExecuted.length).toBeGreaterThan(0);
    expect(response.toolsExecuted[0].toolName).toBe('getAirQualityAndForecast');
  });
});

describe('Community Advisory Generator', () => {
  it('generates English advisory for school group with WhatsApp emojis and bullet points', async () => {
    const advisory = await generateCommunityAdvisory(
      {
        place: 'Sector 62, Noida',
        audience: 'school_group',
        language: 'en',
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined,
      }
    );

    expect(advisory.headline).toContain('School');
    expect(advisory.advisoryText).toContain('School & Parent Smog Advisory');
    expect(advisory.advisoryText).toContain('385');
    expect(advisory.advisoryText).toContain('Very Poor');
    expect(advisory.advisoryText).toContain('N95');
    expect(advisory.advisoryText).toContain('1️⃣');
    expect(advisory.advisoryText).toContain('SaafHawa');
  });

  it('generates Hindi advisory for housing society with proper Devnagari WhatsApp formatting', async () => {
    const advisory = await generateCommunityAdvisory(
      {
        place: 'Sector 62, Noida',
        audience: 'housing_society',
        language: 'hi',
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined,
      }
    );

    expect(advisory.headline).toContain('आवासीय सोसायटी');
    expect(advisory.advisoryText).toContain('385');
    expect(advisory.advisoryText).toContain('कचरा या सूखे पत्ते बिल्कुल न जलाएं');
    expect(advisory.advisoryText).toContain('N95');
    expect(advisory.advisoryText).toContain('साफ़ हवा');
  });
});

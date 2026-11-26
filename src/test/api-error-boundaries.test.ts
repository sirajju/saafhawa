import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postPlan } from '@/app/api/plan/route';
import { POST as postChat } from '@/app/api/chat/route';
import { POST as postAdvisory } from '@/app/api/community-advisory/route';
import { planRateLimiter, chatRateLimiter, advisoryRateLimiter } from '@/lib/rate-limit';

describe('API Route Error Boundaries (400, 413, 429)', () => {
  beforeEach(() => {
    planRateLimiter.reset();
    chatRateLimiter.reset();
    advisoryRateLimiter.reset();
  });

  const LARGE_PAYLOAD = JSON.stringify({
    place: 'Delhi',
    padding: 'x'.repeat(66000),
  });

  describe('POST /api/plan', () => {
    it('returns 400 when body does not match PlanRequest schema', async () => {
      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: '' }), // Invalid place length
      });
      const res = await postPlan(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid');
    });

    it('returns 413 when payload exceeds 64KB limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: LARGE_PAYLOAD,
      });
      const res = await postPlan(req);
      expect(res.status).toBe(413);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      const ip = '198.51.100.1';
      // Exhaust rate limit (planRateLimiter max is 30)
      for (let i = 0; i < 35; i++) {
        planRateLimiter.check(ip);
      }
      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ place: 'Delhi' }),
      });
      const res = await postPlan(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });
  });

  describe('POST /api/chat', () => {
    it('returns 400 when body is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      });
      const res = await postChat(req);
      expect(res.status).toBe(400);
    });

    it('returns 413 when payload exceeds 64KB limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: LARGE_PAYLOAD,
      });
      const res = await postChat(req);
      expect(res.status).toBe(413);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      const ip = '198.51.100.2';
      // chatRateLimiter max is 15
      for (let i = 0; i < 20; i++) {
        chatRateLimiter.check(ip);
      }
      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ message: 'Hello', place: 'Delhi' }),
      });
      const res = await postChat(req);
      expect(res.status).toBe(429);
    });
  });

  describe('POST /api/community-advisory', () => {
    it('returns 400 when body is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/community-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place: '' }),
      });
      const res = await postAdvisory(req);
      expect(res.status).toBe(400);
    });

    it('returns 413 when payload exceeds 64KB limit', async () => {
      const req = new NextRequest('http://localhost:3000/api/community-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: LARGE_PAYLOAD,
      });
      const res = await postAdvisory(req);
      expect(res.status).toBe(413);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      const ip = '198.51.100.3';
      // advisoryRateLimiter max is 20
      for (let i = 0; i < 25; i++) {
        advisoryRateLimiter.check(ip);
      }
      const req = new NextRequest('http://localhost:3000/api/community-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ place: 'Delhi', audience: 'general_public', language: 'en' }),
      });
      const res = await postAdvisory(req);
      expect(res.status).toBe(429);
    });
  });
});

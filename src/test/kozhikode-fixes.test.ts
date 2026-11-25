import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { reverseGeocodeCoordinates } from '@/lib/air-quality/reverse-geocoder';
import { geocodeOpenMeteoPlace } from '@/lib/air-quality/open-meteo-client';
import { generateFallbackChatResponse } from '@/lib/chat/fallback';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';
import { getRuleBasedFallbackActions } from '@/lib/plan/fallback';
import { ChatRequestSchema } from '@/lib/chat/types';
import { MOCK_PROFILE } from '@/test/plan-fixtures';
import { POST as postChat } from '@/app/api/chat/route';
import { POST as postAdvisory } from '@/app/api/community-advisory/route';
import { chatRateLimiter, advisoryRateLimiter } from '@/lib/rate-limit';

describe('Kozhikode Issues Reproduction & Verification', () => {
  beforeEach(() => {
    chatRateLimiter.reset();
    advisoryRateLimiter.reset();
  });

  it('Issue 1: reverse-geocodes coordinates (11.2551, 75.8287) to Kozhikode, Kerala', async () => {
    const rev = await reverseGeocodeCoordinates(11.2551, 75.8287);
    expect(rev?.formattedAddress).toBe('Kozhikode, Kerala');

    const geo = await geocodeOpenMeteoPlace('11.2551, 75.8287');
    expect(geo.formattedAddress).toBe('Kozhikode, Kerala');
  });

  it('Issue 2: community advisory accepts coordinates and generates advisory without failing', async () => {
    const req = new NextRequest('http://localhost:3000/api/community-advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place: '11.2551, 75.8287',
        audience: 'school_group',
        language: 'en',
      }),
    });

    const res = await postAdvisory(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.headline).toContain('Kozhikode');
    expect(data.advisoryText).toContain('Kozhikode');
  });

  it('Issue 3: chat fallback does not invent AQI 250 or print undefined when lookup fails', async () => {
    const failingFetcher = vi.fn().mockRejectedValue(new Error('Network lookup failed'));
    const res = await generateFallbackChatResponse(
      {
        message: 'Can my kids play outside today?',
        place: 'UnknownPlaceXYZ',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      failingFetcher
    );

    expect(res.reply).toContain("I couldn't get air quality for this place right now");
    expect(res.reply).not.toContain('250');
    expect(res.reply).not.toContain('Unhealthy');
    expect(res.reply).not.toContain('undefined');
    expect(res.reply).not.toContain('null');
  });

  it('Issue 4: sends two chat questions in a row through real /api/chat with long reply in history', async () => {
    // Turn 1
    const req1 = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the air quality in Kozhikode today?',
        place: 'Kozhikode',
      }),
    });
    const res1 = await postChat(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.reply).toBeDefined();

    // Turn 2 with previous answer in history
    const req2 = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can the children play outside?',
        place: 'Kozhikode',
        conversationHistory: [
          { role: 'user', content: 'What is the air quality in Kozhikode today?' },
          { role: 'assistant', content: data1.reply },
        ],
      }),
    });
    const res2 = await postChat(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.reply).toBeDefined();
    expect(data2.error).toBeUndefined();
  });

  it('Issue 4: validates chat request when conversation history includes long assistant reply (>500 chars)', () => {
    const longAssistantReply = 'Here is a detailed explanation of clean air techniques for your family. '.repeat(10);
    expect(longAssistantReply.length).toBeGreaterThan(500);

    const parsed = ChatRequestSchema.parse({
      message: 'What about windows?',
      place: 'Kozhikode',
      householdProfile: MOCK_PROFILE,
      conversationHistory: [
        { role: 'user', content: 'Can we go outside?' },
        { role: 'assistant', content: longAssistantReply },
      ],
    });

    expect(parsed.message).toBe('What about windows?');
    expect(parsed.conversationHistory.length).toBe(2);
    expect(parsed.conversationHistory[1].content.length).toBeLessThanOrEqual(1000);
  });

  it('Issue 5: scales hero advice to Satisfactory AQI 54 without pushing best window or stay indoors tonight', () => {
    const forecast = Array.from({ length: 24 }, (_, i) => ({
      dateTime: new Date(Date.now() + i * 3600000).toISOString(),
      aqi: 50 + (i % 8),
      category: 'Satisfactory',
      dominantPollutant: 'pm25',
    }));

    const advice = buildForecastAdvice(54, forecast, {
      ...MOCK_PROFILE,
      hasAsthmaOrRespiratoryCondition: true,
    });

    expect(advice.plainAdvice.toLowerCase()).not.toContain('avoid strenuous outdoor activities tonight');
    expect(advice.plainAdvice.toLowerCase()).not.toContain('cleanest window: tomorrow');
    expect(advice.plainAdvice.toLowerCase()).toContain('satisfactory');
    expect(advice.plainAdvice.toLowerCase()).toContain('asthma');
  });

  it('Issue 5: rule-based fallback does not push N95 masks or sealed windows when air is clean/satisfactory', () => {
    const mockCleanReport = {
      location: { name: 'Kozhikode, Kerala', latitude: 11.2551, longitude: 75.8287 },
      current: {
        dateTime: new Date().toISOString(),
        aqi: 54,
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        indexCode: 'cpcb',
        indexDisplayName: 'CPCB AQI',
        pm25: { value: 16, units: 'µg/m³' },
        pm10: { value: 35, units: 'µg/m³' },
      },
      hourlyForecast: Array.from({ length: 24 }, (_, i) => ({
        dateTime: new Date(Date.now() + i * 3600000).toISOString(),
        aqi: 50 + (i % 6),
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        indexCode: 'cpcb',
        indexDisplayName: 'CPCB AQI',
        pm25: { value: 15, units: 'µg/m³' },
        pm10: { value: 30, units: 'µg/m³' },
      })),
    };

    const actions = getRuleBasedFallbackActions(MOCK_PROFILE, mockCleanReport);
    const actionIds = actions.map((a) => a.actionId);
    expect(actionIds).not.toContain('wear_n95_mask_outside');
    expect(actionIds).not.toContain('seal_windows_during_peak_inversion');
    expect(actionIds).not.toContain('keep_children_indoors_morning_smog');
  });

  it('Issue 5: chat fallback does not recommend N95 mask or staying indoors when AQI is 54 (Satisfactory)', async () => {
    const cleanFetcher = vi.fn().mockResolvedValue({
      location: { name: 'Kozhikode, Kerala', latitude: 11.2551, longitude: 75.8287 },
      current: {
        dateTime: new Date().toISOString(),
        aqi: 54,
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        pm25: { value: 16, units: 'µg/m³' },
        pm10: { value: 35, units: 'µg/m³' },
      },
      hourlyForecast: [],
    });

    const res = await generateFallbackChatResponse(
      {
        message: 'Can the kids play outside in Kozhikode?',
        place: 'Kozhikode',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      cleanFetcher
    );

    expect(res.reply.toLowerCase()).toContain('satisfactory');
    expect(res.reply.toLowerCase()).not.toContain('not safe');
    expect(res.reply.toLowerCase()).not.toContain('wear an n95 mask');
  });
});

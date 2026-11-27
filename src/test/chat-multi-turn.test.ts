import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type * as airQualityService from '@/lib/air-quality/service';
import { ChatRequestSchema } from '@/lib/chat/types';
import { MOCK_PROFILE } from '@/test/plan-fixtures';
import { POST as postChat } from '@/app/api/chat/route';
import { chatRateLimiter } from '@/lib/rate-limit';

const { mockReport } = vi.hoisted(() => ({
  mockReport: {
    location: {
      name: 'Kozhikode, Kerala, India',
      latitude: 11.2551,
      longitude: 75.8287,
      timeZone: 'Asia/Kolkata',
    },
    current: {
      dateTime: '2026-11-26T10:00:00.000Z',
      aqi: 54,
      category: 'Satisfactory',
      dominantPollutant: 'pm25',
      dataSource: 'Open-Meteo (CAMS model)',
      pm25: { value: 16, units: 'µg/m³' },
      pm10: { value: 35, units: 'µg/m³' },
    },
    hourlyForecast: [],
  },
}));

vi.mock('@/lib/air-quality/service', async (importOriginal) => {
  const actual = await importOriginal<typeof airQualityService>();
  return {
    ...actual,
    getAirQualityByLocation: vi.fn().mockResolvedValue(mockReport),
  };
});

vi.mock('@/lib/air-quality/reverse-geocoder', () => ({
  reverseGeocodeCoordinates: vi.fn().mockResolvedValue({
    formattedAddress: 'Kozhikode, Kerala, India',
    latitude: 11.2551,
    longitude: 75.8287,
  }),
}));

describe('Chat Multi-Turn Conversation History', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
    chatRateLimiter.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sends two chat questions in a row through real /api/chat with long reply in history', async () => {
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

  it('validates chat request when conversation history includes long assistant reply (>500 chars)', () => {
    const longAssistantReply =
      'Here is a detailed explanation of clean air techniques for your family. '.repeat(10);
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
});

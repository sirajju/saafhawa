import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type * as airQualityService from '@/lib/air-quality/service';
import { POST as postAdvisory } from '@/app/api/community-advisory/route';
import { advisoryRateLimiter } from '@/lib/rate-limit';

const { mockReport } = vi.hoisted(() => ({
  mockReport: {
    location: {
      name: 'Kozhikode, Kerala, India (11.2551, 75.8287)',
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
    formattedAddress: 'Kozhikode, Kerala, India (11.2551, 75.8287)',
    latitude: 11.2551,
    longitude: 75.8287,
  }),
}));

describe('Community Advisory with Geographic Coordinates', () => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('AI_API_KEY', '');
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '');
    advisoryRateLimiter.reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts coordinates and generates advisory without failing', async () => {
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
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { airQualityCache } from '@/lib/air-quality/cache';
import { getAirQualityByLocation } from '@/lib/air-quality/service';
import { AirQualityReportSchema } from '@/lib/air-quality/types';
import { airQualityRateLimiter } from '@/lib/rate-limit';
import { GET } from '@/app/api/air-quality/route';
import { NextRequest } from 'next/server';
import {
  MOCK_GEOCODE_SUCCESS,
  MOCK_GEOCODE_OVER_LIMIT,
  MOCK_CURRENT_CONDITIONS_WITH_CPCB,
  generateMockHourlyForecast,
} from './air-quality-fixtures';

describe('Air Quality - Service Orchestration', () => {
  const originalEnv = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    airQualityCache.clear();
    airQualityRateLimiter.reset();
    process.env.GOOGLE_MAPS_API_KEY = 'valid-test-key';
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalEnv;
  });

  it('returns built-in sample Delhi report when no GOOGLE_MAPS_API_KEY is configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const report = await getAirQualityByLocation('110001');

    expect(report.isSampleData).toBe(true);
    expect(report.location.name).toContain('New Delhi');
    expect(report.current.aqi).toBe(342);
    expect(report.current.category).toBe('Very Poor');
    expect(report.hourlyForecast.length).toBe(24);
  });

  it('returns clean report using ind_cpcb when available and includes indexCode', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_GEOCODE_SUCCESS,
        });
      }
      if (url.includes('currentConditions:lookup')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB,
        });
      }
      if (url.includes('forecast:lookup')) {
        return Promise.resolve({
          ok: true,
          json: async () => generateMockHourlyForecast(24),
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const report = await getAirQualityByLocation('110001', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(() => AirQualityReportSchema.parse(report)).not.toThrow();
    expect(report.current.indexCode).toBe('ind_cpcb');
    expect(report.current.aqi).toBe(342);
    expect(report.current.category).toBe('Very Poor');
    expect(report.current.pm25).toEqual({ value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' });
    expect(report.current.pm10).toEqual({ value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' });

    expect(report.hourlyForecast).toHaveLength(24);
    expect(report.hourlyForecast[0].indexCode).toBe('ind_cpcb');
    expect(report.hourlyForecast[0].aqi).toBe(320);
  });

  it('recovers gracefully if forecast fails: returns current conditions with empty forecast', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_GEOCODE_SUCCESS,
        });
      }
      if (url.includes('currentConditions:lookup')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB,
        });
      }
      if (url.includes('forecast:lookup')) {
        return Promise.reject(new Error('Forecast service timeout / 500'));
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    const report = await getAirQualityByLocation('Connaught Place', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(report.location.name).toContain('Connaught Place');
    expect(report.current.aqi).toBe(342);
    expect(report.hourlyForecast).toEqual([]);
  });

  it('caps query length and rejects queries > 120 characters', async () => {
    const longPlace = 'A'.repeat(121);
    await expect(getAirQualityByLocation(longPlace)).rejects.toThrow(
      /Place name or pincode cannot exceed 120 characters/
    );
  });
});

describe('Air Quality - API Route GET /api/air-quality', () => {
  const originalEnv = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    airQualityCache.clear();
    airQualityRateLimiter.reset();
    process.env.GOOGLE_MAPS_API_KEY = 'valid-test-key';
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalEnv;
  });

  it('accepts only the "place" parameter and returns 200 on success', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_GEOCODE_SUCCESS,
        });
      }
      if (url.includes('currentConditions:lookup')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB,
        });
      }
      if (url.includes('forecast:lookup')) {
        return Promise.resolve({
          ok: true,
          json: async () => generateMockHourlyForecast(24),
        });
      }
      return Promise.reject(new Error('Unexpected'));
    });

    vi.stubGlobal('fetch', mockFetch);

    const req = new NextRequest('http://localhost:3000/api/air-quality?place=110001');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.location.name).toContain('Connaught Place');
    expect(data.current.aqi).toBe(342);

    vi.unstubAllGlobals();
  });

  it('returns 400 when "place" query param is missing or invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/air-quality?query=110001');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid Request');
    expect(data.message).toContain('Query parameter "place" is required');
  });

  it('returns 429 when quota is exceeded without leaking raw Google error text', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_GEOCODE_OVER_LIMIT,
    });

    vi.stubGlobal('fetch', mockFetch);

    const req = new NextRequest('http://localhost:3000/api/air-quality?place=110001');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe('Too Many Requests');
    expect(JSON.stringify(data)).not.toContain('Raw Google internal quota error text');

    vi.unstubAllGlobals();
  });

  it('returns 503 when network/provider is unavailable without leaking internals', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Connection failed ECONNRESET'));

    vi.stubGlobal('fetch', mockFetch);

    const req = new NextRequest('http://localhost:3000/api/air-quality?place=110001');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toBe('Service Unavailable');
    expect(JSON.stringify(data)).not.toContain('ECONNRESET');

    vi.unstubAllGlobals();
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { airQualityCache } from '@/lib/air-quality/cache';
import { airQualityRateLimiter } from '@/lib/rate-limit';
import { GET } from '@/app/api/air-quality/route';
import { NextRequest } from 'next/server';
import {
  MOCK_GEOCODE_SUCCESS,
  MOCK_GEOCODE_OVER_LIMIT,
  MOCK_CURRENT_CONDITIONS_WITH_CPCB,
  generateMockHourlyForecast,
} from './air-quality-fixtures';

describe('Air Quality - API Route Integration', () => {
  const originalEnv = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    airQualityCache.clear();
    airQualityRateLimiter.reset();
    process.env.GOOGLE_MAPS_API_KEY = 'valid-test-key';
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalEnv;
  });

  it('handles valid place query and responds with 200 clean payload', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode')) {
        return Promise.resolve({ ok: true, json: async () => MOCK_GEOCODE_SUCCESS });
      }
      if (url.includes('currentConditions:lookup')) {
        return Promise.resolve({ ok: true, json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB });
      }
      if (url.includes('forecast:lookup')) {
        return Promise.resolve({ ok: true, json: async () => generateMockHourlyForecast(6) });
      }
      return Promise.reject(new Error('Unknown URL'));
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
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('postalpincode.in')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              Status: 'Success',
              PostOffice: [
                { District: 'Central Delhi', State: 'Delhi', Division: 'New Delhi Central' },
              ],
            },
          ],
        });
      }
      if (url.includes('maps.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => MOCK_GEOCODE_OVER_LIMIT,
        });
      }
      // When falling back to Open-Meteo, rate limit is reached
      return Promise.resolve({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });
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

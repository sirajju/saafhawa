import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SimpleTtlCache, normalizeLocationKey, airQualityCache } from '@/lib/air-quality/cache';
import {
  geocodePlace,
  fetchCurrentConditions,
  fetchHourlyForecast,
  computeForecastPeriod,
} from '@/lib/air-quality/google-client';
import { extractPrimaryIndex, getAirQualityByLocation } from '@/lib/air-quality/service';
import {
  AirQualityReportSchema,
  QuotaExceededError,
  ProviderUnavailableError,
  LocationNotFoundError,
} from '@/lib/air-quality/types';
import { airQualityRateLimiter } from '@/lib/rate-limit';
import { GET } from '@/app/api/air-quality/route';
import { NextRequest } from 'next/server';

// Realistic fixtures matching official Google API specifications
// Central Pollution Control Board (CPCB) India scale: 0-500
// Universal AQI (UAQI) scale: 0-100
const MOCK_GEOCODE_SUCCESS = {
  status: 'OK',
  results: [
    {
      formatted_address: 'Connaught Place, New Delhi, Delhi 110001, India',
      geometry: {
        location: {
          lat: 28.6315,
          lng: 77.2167,
        },
      },
      place_id: 'ChIJ123456',
    },
  ],
};

const MOCK_GEOCODE_ZERO_RESULTS = {
  status: 'ZERO_RESULTS',
  results: [],
};

const MOCK_GEOCODE_OVER_LIMIT = {
  status: 'OVER_QUERY_LIMIT',
  error_message: 'Raw Google internal quota error text that must never reach client',
  results: [],
};

// Current conditions with both ind_cpcb and uaqi available
const MOCK_CURRENT_CONDITIONS_WITH_CPCB = {
  dateTime: '2026-11-23T08:00:00Z',
  regionCode: 'in',
  indexes: [
    {
      code: 'ind_cpcb',
      displayName: 'India National AQI (CPCB)',
      aqi: 342, // Realistic CPCB index for severe winter smog (301-400: Very Poor)
      aqiDisplay: '342',
      category: 'Very Poor',
      dominantPollutant: 'pm25',
    },
    {
      code: 'uaqi',
      displayName: 'Universal AQI',
      aqi: 78, // Realistic Universal AQI (61-80: Very poor air quality)
      aqiDisplay: '78',
      category: 'Very poor air quality',
      dominantPollutant: 'pm25',
    },
  ],
  pollutants: [
    {
      code: 'pm25',
      displayName: 'PM2.5',
      fullName: 'Fine particulate matter',
      concentration: {
        value: 185.5,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    },
    {
      code: 'pm10',
      displayName: 'PM10',
      fullName: 'Inhalable particulate matter',
      concentration: {
        value: 320.0,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    },
  ],
};

// Current conditions when only Universal AQI is returned
const MOCK_CURRENT_CONDITIONS_UAQI_ONLY = {
  dateTime: '2026-11-23T08:00:00Z',
  regionCode: 'us',
  indexes: [
    {
      code: 'uaqi',
      displayName: 'Universal AQI',
      aqi: 45, // Fair air quality on 0-100 UAQI scale
      aqiDisplay: '45',
      category: 'Fair air quality',
      dominantPollutant: 'pm25',
    },
  ],
  pollutants: [
    {
      code: 'pm25',
      displayName: 'PM2.5',
      concentration: {
        value: 12.0,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    },
  ],
};

const generateMockHourlyForecast = (hours = 24) => ({
  regionCode: 'in',
  hourlyForecasts: Array.from({ length: hours }, (_, i) => {
    const hourStr = String(i).padStart(2, '0');
    return {
      dateTime: `2026-11-23T${hourStr}:00:00Z`,
      indexes: [
        {
          code: 'ind_cpcb',
          displayName: 'India National AQI (CPCB)',
          aqi: 320 + i * 2, // Realistic CPCB progression
          category: 'Very Poor',
          dominantPollutant: 'pm25',
        },
        {
          code: 'uaqi',
          displayName: 'Universal AQI',
          aqi: 70 + Math.floor(i / 2),
          category: 'Very poor air quality',
          dominantPollutant: 'pm25',
        },
      ],
      pollutants: [
        {
          code: 'pm25',
          displayName: 'PM2.5',
          concentration: {
            value: 170.0 + i * 2,
            units: 'MICROGRAMS_PER_CUBIC_METER',
          },
        },
        {
          code: 'pm10',
          displayName: 'PM10',
          concentration: {
            value: 290.0 + i * 3,
            units: 'MICROGRAMS_PER_CUBIC_METER',
          },
        },
      ],
    };
  }),
});

describe('Air Quality - Capped TTL Cache', () => {
  let testCache: SimpleTtlCache<string>;

  beforeEach(() => {
    testCache = new SimpleTtlCache<string>(15, 3); // Max 3 items for easy capacity testing
  });

  it('normalizes location query keys properly', () => {
    expect(normalizeLocationKey('  New Delhi   110001  ')).toBe('new delhi 110001');
    expect(normalizeLocationKey('Delhi')).toBe('delhi');
  });

  it('stores and retrieves cached entries within TTL', () => {
    testCache.set('delhi', 'report-delhi');
    const cached = testCache.get('delhi');
    expect(cached).not.toBeNull();
    expect(cached?.value).toBe('report-delhi');
  });

  it('evicts oldest entries when capacity exceeds maxEntries limit', () => {
    testCache.set('item1', 'val1');
    testCache.set('item2', 'val2');
    testCache.set('item3', 'val3');
    expect(testCache.size()).toBe(3);

    // Adding 4th item should evict oldest (item1)
    testCache.set('item4', 'val4');
    expect(testCache.size()).toBe(3);
    expect(testCache.get('item1')).toBeNull();
    expect(testCache.get('item2')?.value).toBe('val2');
    expect(testCache.get('item4')?.value).toBe('val4');
  });
});

describe('Air Quality - Index Selection & Null Handling', () => {
  it('selects India local AQI (ind_cpcb) as the primary index when available', () => {
    const selected = extractPrimaryIndex(MOCK_CURRENT_CONDITIONS_WITH_CPCB.indexes);
    expect(selected.indexCode).toBe('ind_cpcb');
    expect(selected.aqi).toBe(342);
    expect(selected.category).toBe('Very Poor');
    expect(selected.dominantPollutant).toBe('pm25');
  });

  it('falls back to Universal AQI (uaqi) when ind_cpcb is not available', () => {
    const selected = extractPrimaryIndex(MOCK_CURRENT_CONDITIONS_UAQI_ONLY.indexes);
    expect(selected.indexCode).toBe('uaqi');
    expect(selected.aqi).toBe(45);
    expect(selected.category).toBe('Fair air quality');
  });

  it('returns AQI as null (not 0) when no index is returned', () => {
    const selected = extractPrimaryIndex([]);
    expect(selected.aqi).toBeNull();
    expect(selected.category).toBeNull();
    expect(selected.dominantPollutant).toBeNull();
    expect(selected.indexCode).toBeNull();
  });
});

describe('Air Quality - Google Client & Resilience', () => {
  it('computes explicit 24-hour forecast period', () => {
    const mockDate = new Date('2026-11-23T14:30:00Z');
    const period = computeForecastPeriod(24, mockDate);
    expect(period.startTime).toBe('2026-11-23T14:00:00.000Z');
    expect(period.endTime).toBe('2026-11-24T13:00:00.000Z');
  });

  it('sends explicit period in forecast request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => generateMockHourlyForecast(24),
    });

    await fetchHourlyForecast(28.6315, 77.2167, 'test-key', 24, {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody).toHaveProperty('period');
    expect(callBody.period).toHaveProperty('startTime');
    expect(callBody.period).toHaveProperty('endTime');
    expect(callBody.pageSize).toBe(24);
  });

  it('throws LocationNotFoundError when geocoding returns ZERO_RESULTS', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_GEOCODE_ZERO_RESULTS,
    });

    await expect(
      geocodePlace('unknown place 999999', 'test-key', {
        fetchFn: mockFetch as unknown as typeof fetch,
      })
    ).rejects.toThrow(LocationNotFoundError);
  });

  it('throws QuotaExceededError when Google returns OVER_QUERY_LIMIT or 429', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_GEOCODE_OVER_LIMIT,
    });

    await expect(
      geocodePlace('110001', 'test-key', {
        fetchFn: mockFetch as unknown as typeof fetch,
      })
    ).rejects.toThrow(QuotaExceededError);
  });

  it('throws ProviderUnavailableError on network errors', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fetch failed ECONNREFUSED'));

    await expect(
      geocodePlace('110001', 'test-key', {
        fetchFn: mockFetch as unknown as typeof fetch,
      })
    ).rejects.toThrow(ProviderUnavailableError);
  });

  it('times out long-running Google API calls', async () => {
    const mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            const err = new Error('The operation was aborted due to timeout');
            err.name = 'AbortError';
            reject(err);
          }, 50);
        })
    );

    await expect(
      fetchCurrentConditions(28.6315, 77.2167, 'test-key', {
        fetchFn: mockFetch as unknown as typeof fetch,
        timeoutMs: 10,
      })
    ).rejects.toThrow(ProviderUnavailableError);
  });
});

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

    // Validates against Zod schema
    expect(() => AirQualityReportSchema.parse(report)).not.toThrow();

    // Verifies CPCB index priority
    expect(report.current.indexCode).toBe('ind_cpcb');
    expect(report.current.aqi).toBe(342);
    expect(report.current.category).toBe('Very Poor');
    expect(report.current.pm25).toEqual({ value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' });
    expect(report.current.pm10).toEqual({ value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' });

    // Verifies 24 hourly forecast items
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
    expect(report.hourlyForecast).toEqual([]); // Empty forecast returned on failure
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
    // Verify no raw Google internal error text leaked
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

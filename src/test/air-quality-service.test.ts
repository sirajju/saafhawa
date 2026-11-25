import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { airQualityCache } from '@/lib/air-quality/cache';
import { getAirQualityByLocation } from '@/lib/air-quality/service';
import { AirQualityReportSchema } from '@/lib/air-quality/types';
import {
  MOCK_GEOCODE_SUCCESS,
  MOCK_CURRENT_CONDITIONS_WITH_CPCB,
  generateMockHourlyForecast,
} from './air-quality-fixtures';

describe('Air Quality - Service Orchestration', () => {
  const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY;
  const originalWaqiToken = process.env.WAQI_TOKEN;

  beforeEach(() => {
    airQualityCache.clear();
    process.env.GOOGLE_MAPS_API_KEY = 'valid-test-key';
    delete process.env.WAQI_TOKEN;
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalMapsKey;
    process.env.WAQI_TOKEN = originalWaqiToken;
  });

  it('fetches real-time data via Open-Meteo when no keys are configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('postalpincode.in')) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ Status: 'Success', PostOffice: [{ District: 'Central Delhi', State: 'Delhi', Division: 'New Delhi Central' }] }],
        });
      }
      if (url.includes('geocoding-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [{ name: 'New Delhi', latitude: 28.61, longitude: 77.21, timezone: 'Asia/Kolkata', country_code: 'IN' }] }),
        });
      }
      if (url.includes('air-quality-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            current: { time: '2026-11-25T12:00', pm2_5: 180, pm10: 310 },
            hourly: { time: ['2026-11-25T12:00', '2026-11-25T13:00'], pm2_5: [180, 175], pm10: [310, 300] },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    const report = await getAirQualityByLocation('110001', { fetchFn: mockFetch });

    expect(report.location.name).toContain('New Delhi');
    expect(report.current.dataSource).toBe('Open-Meteo (CAMS model)');
    expect(report.current.pm25?.value).toBe(180);
    expect(report.current.category).toBe('Very Poor');
  });

  it('prioritizes nearest CPCB ground station when WAQI_TOKEN is configured', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    process.env.WAQI_TOKEN = 'test-waqi-token';

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('geocoding-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [{ name: 'New Delhi', latitude: 28.63, longitude: 77.22, timezone: 'Asia/Kolkata', country_code: 'IN' }] }),
        });
      }
      if (url.includes('api.waqi.info/feed/geo:')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'ok',
            data: {
              aqi: 320,
              city: { name: 'Anand Vihar, Delhi, India', geo: [28.65, 77.3] },
              iaqi: { pm25: { v: 195 }, pm10: { v: 310 } },
              time: { iso: '2026-11-25T13:00:00+05:30' },
            },
          }),
        });
      }
      if (url.includes('air-quality-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            current: { pm2_5: 80, pm10: 90 },
            hourly: { time: ['2026-11-25T13:00'], pm2_5: [80], pm10: [90] },
          }),
        });
      }
      return Promise.reject(new Error('Unknown: ' + url));
    });

    const report = await getAirQualityByLocation('Delhi', { fetchFn: mockFetch });

    expect(report.location.name).toContain('Anand Vihar, Delhi, India');
    expect(report.current.dataSource).toContain('CPCB Ground Station (Anand Vihar, Delhi, India)');
    expect(report.current.aqi).toBe(320);
    expect(report.current.pm25?.value).toBe(195);
  });

  it('falls back to Open-Meteo when Google fails or exceeds quota', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'valid-test-key';

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('googleapis.com')) return Promise.reject(new Error('Google 429 Quota Exceeded'));
      if (url.includes('geocoding-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [{ name: 'Mumbai', latitude: 19.07, longitude: 72.88, timezone: 'Asia/Kolkata', country_code: 'IN' }] }),
        });
      }
      if (url.includes('air-quality-api.open-meteo.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ current: { pm2_5: 95, pm10: 160 }, hourly: { time: ['2026-11-25T12:00'], pm2_5: [95], pm10: [160] } }),
        });
      }
      return Promise.reject(new Error('Unknown URL: ' + url));
    });

    const report = await getAirQualityByLocation('Mumbai', { fetchFn: mockFetch });
    expect(report.location.name).toContain('Mumbai');
    expect(report.current.dataSource).toBe('Open-Meteo (CAMS model)');
    expect(report.current.aqi).toBeGreaterThan(0);
  });

  it('returns clean report using ind_cpcb when available and includes indexCode', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode')) return Promise.resolve({ ok: true, json: async () => MOCK_GEOCODE_SUCCESS });
      if (url.includes('currentConditions:lookup')) return Promise.resolve({ ok: true, json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB });
      if (url.includes('forecast:lookup')) return Promise.resolve({ ok: true, json: async () => generateMockHourlyForecast(12) });
      return Promise.reject(new Error('Unknown URL'));
    });

    const report = await getAirQualityByLocation('Connaught Place', { fetchFn: mockFetch });
    expect(() => AirQualityReportSchema.parse(report)).not.toThrow();
    expect(report.location.name).toBe('Connaught Place, New Delhi, Delhi 110001, India');
    expect(report.current.aqi).toBe(342);
    expect(report.current.indexCode).toBe('ind_cpcb');
    expect(report.hourlyForecast.length).toBe(12);
  });

  it('falls back gracefully to current conditions with empty forecast when forecast fails', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode')) return Promise.resolve({ ok: true, json: async () => MOCK_GEOCODE_SUCCESS });
      if (url.includes('currentConditions:lookup')) return Promise.resolve({ ok: true, json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB });
      if (url.includes('forecast:lookup')) return Promise.reject(new Error('Simulated network timeout'));
      return Promise.reject(new Error('Unknown URL'));
    });

    const report = await getAirQualityByLocation('110001', { fetchFn: mockFetch });
    expect(report.current.aqi).toBe(342);
    expect(report.hourlyForecast).toEqual([]);
  });
});

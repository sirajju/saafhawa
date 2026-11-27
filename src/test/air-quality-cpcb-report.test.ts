import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { airQualityCache } from '@/lib/air-quality/cache';
import { getAirQualityByLocation } from '@/lib/air-quality/service';
import { AirQualityReportSchema } from '@/lib/air-quality/types';
import {
  MOCK_GEOCODE_SUCCESS,
  MOCK_CURRENT_CONDITIONS_WITH_CPCB,
  generateMockHourlyForecast,
} from './air-quality-fixtures';

describe('Air Quality - CPCB Report & Forecast Fallback', () => {
  const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    airQualityCache.clear();
    process.env.GOOGLE_MAPS_API_KEY = 'valid-test-key';
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalMapsKey;
  });

  it('returns clean report using ind_cpcb when available and includes indexCode', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('maps.googleapis.com/maps/api/geocode'))
        return Promise.resolve({ ok: true, json: async () => MOCK_GEOCODE_SUCCESS });
      if (url.includes('currentConditions:lookup'))
        return Promise.resolve({ ok: true, json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB });
      if (url.includes('forecast:lookup'))
        return Promise.resolve({ ok: true, json: async () => generateMockHourlyForecast(12) });
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
      if (url.includes('maps.googleapis.com/maps/api/geocode'))
        return Promise.resolve({ ok: true, json: async () => MOCK_GEOCODE_SUCCESS });
      if (url.includes('currentConditions:lookup'))
        return Promise.resolve({ ok: true, json: async () => MOCK_CURRENT_CONDITIONS_WITH_CPCB });
      if (url.includes('forecast:lookup'))
        return Promise.reject(new Error('Simulated network timeout'));
      return Promise.reject(new Error('Unknown URL'));
    });

    const report = await getAirQualityByLocation('110001', { fetchFn: mockFetch });
    expect(report.current.aqi).toBe(342);
    expect(report.hourlyForecast).toEqual([]);
  });
});

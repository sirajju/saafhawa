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
  const originalEnv = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    airQualityCache.clear();
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
          json: async () => generateMockHourlyForecast(12),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const report = await getAirQualityByLocation('Connaught Place', { fetchFn: mockFetch });

    expect(() => AirQualityReportSchema.parse(report)).not.toThrow();
    expect(report.location.name).toBe('Connaught Place, New Delhi, Delhi 110001, India');
    expect(report.current.aqi).toBe(342);
    expect(report.current.indexCode).toBe('ind_cpcb');
    expect(report.current.indexDisplayName).toBe('India National AQI (CPCB)');
    expect(report.current.category).toBe('Very Poor');
    expect(report.current.dominantPollutant).toBe('pm25');
    expect(report.current.pm25?.value).toBe(185.5);
    expect(report.current.pm10?.value).toBe(320);
    expect(report.hourlyForecast.length).toBe(12);
  });

  it('falls back gracefully to current conditions with empty forecast when forecast fails', async () => {
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
        return Promise.reject(new Error('Simulated network timeout'));
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const report = await getAirQualityByLocation('110001', { fetchFn: mockFetch });

    expect(report.current.aqi).toBe(342);
    expect(report.hourlyForecast).toEqual([]);
  });
});

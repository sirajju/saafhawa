import { describe, it, expect, vi } from 'vitest';
import {
  geocodePlace,
  fetchCurrentConditions,
  fetchHourlyForecast,
  computeForecastPeriod,
} from '@/lib/air-quality/google-client';
import {
  QuotaExceededError,
  ProviderUnavailableError,
  LocationNotFoundError,
} from '@/lib/air-quality/types';
import {
  MOCK_GEOCODE_ZERO_RESULTS,
  MOCK_GEOCODE_OVER_LIMIT,
  generateMockHourlyForecast,
} from './air-quality-fixtures';

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

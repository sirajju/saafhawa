import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTimeZone } from '@/lib/air-quality/google-client';
import { formatHourInPlaceLocalTime, executeGetAirQualityTool } from '@/lib/chat/tools';
import { airQualityCache } from '@/lib/air-quality/cache';

describe('Time Zone - Location-Aware Hourly Forecast Formatting', () => {
  beforeEach(() => {
    airQualityCache.clear();
    vi.restoreAllMocks();
  });

  it('formats hourly timestamps in the location specific time zone and rounds to the hour', () => {
    // 2026-11-25 12:00:00 UTC
    const sampleUtcDate = '2026-11-25T12:00:00Z';

    // India time: UTC + 5:30 -> 17:30 (rounds to 5 PM)
    const indiaFormatted = formatHourInPlaceLocalTime(sampleUtcDate, 'Asia/Kolkata');
    expect(indiaFormatted).toMatch(/5\s*PM/);

    // New York time (EST): UTC - 5:00 -> 07:00 (7 AM)
    const nyFormatted = formatHourInPlaceLocalTime(sampleUtcDate, 'America/New_York');
    expect(nyFormatted).toMatch(/7\s*AM/);

    // London time (GMT): UTC + 0 -> 12:00 (12 PM)
    const londonFormatted = formatHourInPlaceLocalTime(sampleUtcDate, 'Europe/London');
    expect(londonFormatted).toMatch(/12\s*PM/);
  });

  it('rounds odd minutes to the nearest hour without showing minutes', () => {
    // 10:04 AM UTC -> rounds to 10 AM
    const oddMinutes1 = '2026-11-25T10:04:00Z';
    const formatted1 = formatHourInPlaceLocalTime(oddMinutes1, 'UTC');
    expect(formatted1).toMatch(/10\s*AM/);
    expect(formatted1).not.toContain(':04');

    // 10:45 AM UTC -> rounds up to 11 AM
    const oddMinutes2 = '2026-11-25T10:45:00Z';
    const formatted2 = formatHourInPlaceLocalTime(oddMinutes2, 'UTC');
    expect(formatted2).toMatch(/11\s*AM/);
    expect(formatted2).not.toContain(':45');
  });

  it('falls back to India time (Asia/Kolkata) when invalid time zone is supplied', () => {
    const sampleUtcDate = '2026-11-25T12:00:00Z';
    const fallbackFormatted = formatHourInPlaceLocalTime(sampleUtcDate, 'Invalid/TimeZone_DoesNotExist');

    // Should gracefully fall back to Asia/Kolkata without throwing
    expect(fallbackFormatted).toMatch(/5\s*PM/);
  });

  it('fetchTimeZone calls Google Time Zone API with coordinates, timestamp, and API key', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'OK',
        timeZoneId: 'America/New_York',
        timeZoneName: 'Eastern Standard Time',
      }),
    });

    const tz = await fetchTimeZone(40.7128, -74.006, 'fake-maps-key', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0];
    expect(calledUrl).toContain('location=40.7128%2C-74.006');
    expect(calledUrl).toContain('key=fake-maps-key');
    expect(calledUrl).toContain('timestamp=');
    expect(tz).toBe('America/New_York');
  });

  it('fetchTimeZone returns null on HTTP or quota failure, and service falls back to Asia/Kolkata', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const tz = await fetchTimeZone(28.6315, 77.2167, 'fake-maps-key', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    expect(tz).toBeNull();
  });

  it('executeGetAirQualityTool applies location timeZone to forecastHours', async () => {
    const mockReport = {
      location: {
        name: 'New York, USA',
        latitude: 40.7128,
        longitude: -74.006,
        timeZone: 'America/New_York',
      },
      current: {
        dateTime: '2026-11-25T12:00:00Z',
        aqi: 45,
        category: 'Good',
        dominantPollutant: 'pm25',
        indexCode: 'usa_epa',
        indexDisplayName: 'US EPA AQI',
        pm25: { value: 10.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
        pm10: { value: 20.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
        isSampleData: false,
      },
      hourlyForecast: [
        {
          dateTime: '2026-11-25T12:00:00Z',
          aqi: 45,
          category: 'Good',
          dominantPollutant: 'pm25',
          indexCode: 'usa_epa',
          indexDisplayName: 'US EPA AQI',
          pm25: { value: 10.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
          pm10: { value: 20.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
        },
      ],
      isSampleData: false,
    };

    const result = await executeGetAirQualityTool(
      { place: 'New York' },
      'New York',
      async () => mockReport
    );

    // 12:00 UTC formatted in America/New_York is 7 AM
    expect(result.forecastHours[0].hour).toMatch(/7\s*AM/);
  });
});

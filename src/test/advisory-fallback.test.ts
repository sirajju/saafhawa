import { describe, it, expect } from 'vitest';

describe('Community Advisory Fallback and Cache Bypassing', () => {
  it('returns generationMethod and fallbackReason, never caching template fallback', async () => {
    const { generateCommunityAdvisory } = await import('../lib/community/advisory-generator');
    const { getCachedAdvisory, buildAdvisoryCacheKey } = await import('../lib/gemini/cache');

    const mockReport = {
      location: { name: 'Kozhikode', latitude: 11.25, longitude: 75.78, timeZone: 'Asia/Kolkata' },
      current: {
        dateTime: '2026-11-26T10:00:00.000Z',
        aqi: 95,
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        dataSource: 'Open-Meteo',
      },
      forecast: [],
    };

    const res = await generateCommunityAdvisory(
      { place: 'Kozhikode', audience: 'housing_society', language: 'en' },
      {
        apiKey: '', // forces fallback
        airQualityFetcher: async () => mockReport as unknown as import('../lib/air-quality/types').AirQualityReport,
      }
    );

    expect(res.generationMethod).toBe('template');
    expect(res.fallbackReason).toBe('no_key');

    // Confirm it was NOT stored in the advisory cache
    const cacheKey = buildAdvisoryCacheKey('Kozhikode', 'housing_society', 'en');
    expect(getCachedAdvisory(cacheKey)).toBeNull();
  });
});

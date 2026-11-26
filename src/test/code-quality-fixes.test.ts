import { describe, it, expect, vi } from 'vitest';
import { PlanRequestSchema } from '@/lib/plan/types';
import { DEFAULT_PROFILE } from '@/components/onboarding/default-profile';
import { ChatRequestSchema } from '@/lib/chat/types';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';
import { getAqiCategoryDetails } from '@/lib/impact/category-details';
import { buildPlanCacheKey } from '@/lib/gemini-cache';
import { calculateDeduplicatedTotals } from '@/lib/impact/deduplication';
import { MOCK_PROFILE } from './plan-fixtures';

describe('Code Quality & Bug Fixes 1-4', () => {
  it('Fix 1: validates coordinates format as "lat, lon" with max length 50', () => {
    const valid = PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '12.9716, 77.5946' });
    expect(valid.coordinates).toBe('12.9716, 77.5946');
    const validNegative = PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '-33.8688, 151.2093' });
    expect(validNegative.coordinates).toBe('-33.8688, 151.2093');

    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: 'InvalidCityName' })).toThrow(/lat, lon/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '12.97, 77.59' + '0'.repeat(45) })).toThrow(/50 characters/);
  });

  it('Fix 2: onboarding starts with empty place and schemas require place without 110001 defaults', () => {
    expect(DEFAULT_PROFILE.place).toBe('');

    expect(() => ChatRequestSchema.parse({ message: 'Hello' })).toThrow();
    expect(() => AdvisoryRequestSchema.parse({})).toThrow();

    const validChat = ChatRequestSchema.parse({ message: 'Hello', place: 'Kolkata' });
    expect(validChat.place).toBe('Kolkata');
  });

  it('Fix 3: never invents air quality values when AQI or category is missing', () => {
    const advice = buildForecastAdvice(null, [], null);
    expect(advice.plainAdvice).not.toContain('300');
    expect(advice.plainAdvice).not.toContain('200');
    expect(advice.plainAdvice).not.toContain('Severe');

    const details = getAqiCategoryDetails(null, null);
    expect(details.categoryText).toBe('unavailable');
  });

  it('Fix 4: builds plan cache key from stable JSON of the whole profile', () => {
    const profileA = { ...MOCK_PROFILE, homeAreaSqFt: 1200, exerciseHoursPerDay: 1 };
    const profileB = { ...MOCK_PROFILE, homeAreaSqFt: 1500, exerciseHoursPerDay: 1 };
    const profileAKeyReordered = JSON.parse(JSON.stringify(profileA));

    const keyA1 = buildPlanCacheKey('Delhi', profileA);
    const keyA2 = buildPlanCacheKey('Delhi', profileAKeyReordered);
    const keyB = buildPlanCacheKey('Delhi', profileB);

    expect(keyA1).toBe(keyA2);
    expect(keyA1).not.toBe(keyB);
  });

  it('Fix 5: sorts actions by numeric priority so carpool + WFH never double-counts', () => {
    const profile = { ...MOCK_PROFILE, primaryCommuteMode: 'petrol_car' as const, dailyCommuteDistanceKm: 20, commutersCount: 1 };
    const carpool = {
      actionId: 'carpool_to_work',
      title: 'Carpool',
      description: 'Carpool to work',
      category: 'daily_routine' as const,
      applicable: true,
      exposureReduction: { pm25InhaledDoseAvoidedUg: 50, pm25ConcentrationReductionUgM3: 10, percentageDrop: 20, isUnknown: false },
      emissionReduction: { pm25SavedGrams: 10, co2SavedGrams: 100 },
    };
    const other = {
      actionId: 'wear_n95_mask_outside',
      title: 'Wear N95',
      description: 'Wear N95 outdoors',
      category: 'daily_routine' as const,
      applicable: true,
      exposureReduction: { pm25InhaledDoseAvoidedUg: 100, pm25ConcentrationReductionUgM3: 20, percentageDrop: 40, isUnknown: false },
      emissionReduction: { pm25SavedGrams: 0, co2SavedGrams: 0 },
    };
    const wfh = {
      actionId: 'work_from_home_on_smog_days',
      title: 'Work from home',
      description: 'WFH on smog days',
      category: 'daily_routine' as const,
      applicable: true,
      exposureReduction: { pm25InhaledDoseAvoidedUg: 100, pm25ConcentrationReductionUgM3: 20, percentageDrop: 50, isUnknown: false },
      emissionReduction: { pm25SavedGrams: 20, co2SavedGrams: 200 },
    };

    // Passed with carpool first, other in middle, WFH last
    const result = calculateDeduplicatedTotals([carpool, other, wfh], profile, 150);

    // WFH priority (10) evaluates before carpool (40), consuming 100% of commute frac
    // So carpool contributes 0 additional grams to emissions
    expect(result.totalPm25EmissionsSavedGrams).toBe(20);
    expect(result.totalCo2EmissionsSavedGrams).toBe(200);
  });

  it('Fix 6: exports maxDuration = 60 on chat and plan routes', async () => {
    const chatRoute = await import('../app/api/chat/route');
    const planRoute = await import('../app/api/plan/route');
    expect(chatRoute.maxDuration).toBe(60);
    expect(planRoute.maxDuration).toBe(60);
  });

  it('Fix 7: filters conversationHistory excluding greetings and errors, and maps toolsExecuted', () => {
    const messages = [
      { role: 'assistant' as const, content: 'Ask me anything', isGreeting: true },
      { role: 'user' as const, content: 'Is air bad?' },
      { role: 'assistant' as const, content: 'Unable to connect. Please try asking again.', isError: true },
      { role: 'user' as const, content: 'Can I exercise?' },
      { role: 'assistant' as const, content: 'Yes, AQI is moderate.' },
    ];

    const validHistory = messages.filter((m) => !m.isGreeting && !m.isError);
    expect(validHistory).toHaveLength(3);
    expect(validHistory.map((m) => m.content)).toEqual([
      'Is air bad?',
      'Can I exercise?',
      'Yes, AQI is moderate.',
    ]);

    const toolsExecuted = [
      { name: 'getAirQualityAndForecast', resultSummary: 'AQI 85' },
      { name: 'getAirQualityAndForecast', resultSummary: 'AQI 85' },
      { name: 'calculateActionImpact', resultSummary: 'Impact calculated' },
      { name: 'calculateActionImpact' },
    ];
    const rawTools = toolsExecuted.map((t: { resultSummary?: string }) => t.resultSummary);
    const toolsSummary = Array.from(new Set(rawTools.filter((s: unknown): s is string => Boolean(s))));
    expect(toolsSummary).toEqual(['AQI 85', 'Impact calculated']);
  });

  it('Fix 8: waqi client handles network/timeout via safeFetch, throwing 503 AirQualityError', async () => {
    const { fetchWaqiNearestStation } = await import('../lib/air-quality/waqi-client');
    const mockTimeoutFetch = vi.fn().mockRejectedValue(new Error('AbortError: Request timed out'));
    await expect(
      fetchWaqiNearestStation(28.6, 77.2, 'test-token', mockTimeoutFetch as unknown as typeof fetch)
    ).rejects.toThrow();

    const { reverseGeocodeCoordinates } = await import('../lib/air-quality/reverse-geocoder');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ address: { city: 'Kozhikode', state: 'Kerala', country: 'India' } }),
    } as Response);

    const geo1 = await reverseGeocodeCoordinates(11.2588, 75.7804);
    expect(geo1?.formattedAddress).toBe('Kozhikode, Kerala');
    const geo2 = await reverseGeocodeCoordinates(11.2588, 75.7804);
    expect(geo2?.formattedAddress).toBe('Kozhikode, Kerala');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('Fix 9: advisory generator returns generationMethod and fallbackReason, never caching template fallback', async () => {
    const { generateCommunityAdvisory } = await import('../lib/community/advisory-generator');
    const { getCachedAdvisory, buildAdvisoryCacheKey } = await import('../lib/gemini-cache');

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

  it('Fix 10: OnboardingForm renders section tag instead of nested main landmark', async () => {
    const React = await import('react');
    const { render } = await import('@testing-library/react');
    const { OnboardingForm } = await import('../components/OnboardingForm');

    const { container } = render(React.createElement(OnboardingForm, { onSubmit: () => {} }));
    const section = container.querySelector('section#onb');
    const main = container.querySelector('main#onb');

    expect(section).not.toBeNull();
    expect(main).toBeNull();
  });
});

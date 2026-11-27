import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { getRuleBasedFallbackActions } from '@/lib/plan/fallback';
import { clearGeminiCache } from '@/lib/gemini/cache';
import { POST } from '@/app/api/plan/route';
import { planRateLimiter } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { MOCK_AIR_QUALITY, MOCK_PROFILE, MOCK_GEMINI_OUTPUT } from './plan-fixtures';

describe('Plan Module - Gemini Generation & Fallback', () => {
  beforeEach(() => {
    clearGeminiCache();
  });
  it('processes Gemini structured output, drops unknown IDs, and attaches calculator impact figures', async () => {
    const mockGenerator = vi.fn().mockResolvedValue(MOCK_GEMINI_OUTPUT);
    const mockAirQualityFetcher = vi.fn().mockResolvedValue(MOCK_AIR_QUALITY);

    const plan = await generateHouseholdPlan(MOCK_PROFILE, {
      geminiGenerator: mockGenerator,
      airQualityFetcher: mockAirQualityFetcher,
      apiKey: 'test-gemini-key',
    });

    expect(plan.generationMethod).toBe('gemini');
    expect(mockGenerator).toHaveBeenCalled();

    const actionIds = plan.actions.map((a) => a.actionId);
    expect(actionIds).not.toContain('unknown_hallucinated_action_123');
    expect(plan.actions.length).toBe(6);

    for (const action of plan.actions) {
      expect(action.exposureReduction).toHaveProperty('pm25InhaledDoseAvoidedUg');
      expect(action.emissionReduction).toHaveProperty('pm25SavedGrams');
      expect(action.emissionReduction).toHaveProperty('co2SavedGrams');
      expect(action.suggestedTimeOfDay).toBeTruthy();
      expect(action.reason).toBeTruthy();
    }

    expect(plan.summary.totalActionsCount).toBe(6);
    expect(plan.summary.totalPm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
    expect(plan.summary.totalCo2EmissionsSavedKg).toBeGreaterThan(0);
  });

  it('falls back to rule-based selection when Gemini API fails or throws', async () => {
    const mockFailingGenerator = vi
      .fn()
      .mockRejectedValue(new Error('Gemini API 503 Quota/Unavailable'));
    const mockAirQualityFetcher = vi.fn().mockResolvedValue(MOCK_AIR_QUALITY);

    const plan = await generateHouseholdPlan(MOCK_PROFILE, {
      geminiGenerator: mockFailingGenerator,
      airQualityFetcher: mockAirQualityFetcher,
      apiKey: 'test-gemini-key',
    });

    expect(plan.generationMethod).toBe('rule_based_fallback');
    expect(plan.actions.length).toBeGreaterThanOrEqual(6);
    expect(plan.actions.length).toBeLessThanOrEqual(8);

    const actionIds = plan.actions.map((a) => a.actionId);
    expect(actionIds).toContain('wear_n95_mask_outside');
    expect(actionIds).toContain('keep_children_indoors_morning_smog');
    expect(actionIds).toContain('diy_corsi_rosenthal_box');
    expect(plan.summary.totalPm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
  });

  it('rule-based fallback engine selects top 6-8 relevant actions with reasons', () => {
    const fallbackActions = getRuleBasedFallbackActions(MOCK_PROFILE, MOCK_AIR_QUALITY);
    expect(fallbackActions.length).toBeGreaterThanOrEqual(6);
    expect(fallbackActions.length).toBeLessThanOrEqual(8);

    for (const item of fallbackActions) {
      expect(item.actionId).toBeTruthy();
      expect(item.suggestedTimeOfDay).toBeTruthy();
      expect(item.reason).toBeTruthy();
      expect(item.reason).not.toMatch(/\d+\s*(µg|mg|kg|ppm)/);
    }
  });
});

describe('Plan Module - POST /api/plan Route Handler', () => {
  beforeEach(() => {
    planRateLimiter.reset();
    clearGeminiCache();
  });

  it('generates complete rule-based plan when Gemini key is not configured', async () => {
    const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const plan = await generateHouseholdPlan(MOCK_PROFILE, {
      airQualityFetcher: async () => ({
        location: {
          name: '110001',
          formattedAddress: 'Connaught Place, New Delhi',
          latitude: 28.6139,
          longitude: 77.209,
          timeZone: 'Asia/Kolkata',
        },
        current: {
          dateTime: new Date().toISOString(),
          aqi: 342,
          category: 'Very Poor',
          dominantPollutant: 'pm25',
          indexCode: 'ind_cpcb',
          indexDisplayName: 'India National AQI (CPCB)',
          pm25: { value: 185.5, units: 'ug/m3' },
          pm10: { value: 320, units: 'ug/m3' },
          dataSource: 'Open-Meteo (CAMS model)',
        },
        hourlyForecast: [],
      }),
    });

    expect(plan.generationMethod).toBe('rule_based_fallback');
    expect(plan.actions.length).toBeGreaterThanOrEqual(6);
    expect(plan.summary.totalPm25InhaledDoseAvoidedUg).toBeGreaterThan(0);

    process.env.GOOGLE_MAPS_API_KEY = originalMapsKey;
    process.env.GEMINI_API_KEY = originalGeminiKey;
  });

  it('returns 200 with full plan on valid POST request', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-maps-key');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');

    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(MOCK_PROFILE),
    });

    vi.spyOn(
      await import('@/lib/air-quality/service'),
      'getAirQualityByLocation'
    ).mockResolvedValue(MOCK_AIR_QUALITY);

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('location');
    expect(data).toHaveProperty('actions');
    expect(data).toHaveProperty('summary');
    expect(data.actions.length).toBeGreaterThanOrEqual(6);

    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns 400 when body is invalid JSON or fails validation', async () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adultsCount: 0 }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid Household Profile');
  });
});

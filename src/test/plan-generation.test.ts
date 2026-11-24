import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateHouseholdPlan,
  getRuleBasedFallbackActions,
} from '@/lib/plan';
import { POST } from '@/app/api/plan/route';
import { planRateLimiter } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Plan Module - Gemini Generation & Fallback', () => {
  it('processes Gemini structured output, drops unknown IDs, and attaches calculator impact figures', async () => {
    const mockGeminiJson = JSON.stringify({
      selectedActions: [
        {
          actionId: 'wear_n95_mask_outside',
          suggestedTimeOfDay: 'Morning Commute',
          reason: 'Protects the family and asthma patient from dense outdoor particulate smog.',
        },
        {
          actionId: 'keep_children_indoors_morning_smog',
          suggestedTimeOfDay: 'Morning',
          reason: 'Protects your child from hazardous early morning temperature inversion peaks.',
        },
        {
          actionId: 'diy_corsi_rosenthal_box',
          suggestedTimeOfDay: 'All Day',
          reason: 'An affordable DIY cleaner providing high air filtration without buying expensive purifiers.',
        },
        {
          actionId: 'eliminate_incense_and_mosquito_coils',
          suggestedTimeOfDay: 'All Day',
          reason: 'Avoids heavy indoor particulate accumulation in a home with asthma sufferers.',
        },
        {
          actionId: 'swap_car_for_metro',
          suggestedTimeOfDay: 'Commute Hours',
          reason: 'Replaces daily road traffic with clean electric transit to reduce tailpipe emissions.',
        },
        {
          actionId: 'unknown_hallucinated_action_123',
          suggestedTimeOfDay: 'Afternoon',
          reason: 'This should be ignored.',
        },
        {
          actionId: 'use_exhaust_fan_cooking',
          suggestedTimeOfDay: 'Meal Preparation',
          reason: 'Vents intense cooking and tadka aerosols directly outside.',
        },
      ],
    });

    const mockGenerator = vi.fn().mockResolvedValue(mockGeminiJson);
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
    const mockFailingGenerator = vi.fn().mockRejectedValue(new Error('Gemini API 503 Quota/Unavailable'));
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
  });

  it('generates complete rule-based plan with sample data when no keys are configured', async () => {
    const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY;
    const originalGeminiKey = process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const plan = await generateHouseholdPlan(MOCK_PROFILE);

    expect(plan.generationMethod).toBe('rule_based_fallback');
    expect(plan.isSampleData).toBe(true);
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

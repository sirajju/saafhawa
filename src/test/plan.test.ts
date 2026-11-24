import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildPlanPrompt,
  generateHouseholdPlan,
  getRuleBasedFallbackActions,
  PlanRequest,
  PlanRequestSchema,
} from '@/lib/plan';
import { AirQualityReport } from '@/lib/air-quality/types';
import { POST } from '@/app/api/plan/route';
import { planRateLimiter } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

const MOCK_AIR_QUALITY: AirQualityReport = {
  location: {
    name: 'Connaught Place, New Delhi, Delhi 110001, India',
    latitude: 28.6315,
    longitude: 77.2167,
  },
  current: {
    dateTime: '2026-11-23T08:00:00Z',
    aqi: 342,
    category: 'Very Poor',
    dominantPollutant: 'pm25',
    indexCode: 'ind_cpcb',
    indexDisplayName: 'India National AQI (CPCB)',
    pm25: { value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
    pm10: { value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
  },
  hourlyForecast: [
    {
      dateTime: '2026-11-23T09:00:00Z',
      aqi: 350,
      category: 'Very Poor',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: { value: 190.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
      pm10: { value: 330.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
    },
  ],
};

const MOCK_PROFILE: PlanRequest = {
  place: '110001',
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 1,
  hasAsthmaOrRespiratoryCondition: true,
  primaryCommuteMode: 'petrol_car',
  dailyCommuteDistanceKm: 25,
  cookingFuel: 'lpg',
  heatingFuel: 'none',
  hasAirPurifier: false,
  hasKitchenChimneyOrExhaust: false,
  usesIncenseOrMosquitoCoils: true,
  hasGardenOrOpenWasteBurning: false,
  windowSealingQuality: 'average',
  dailyOutdoorHoursPerPerson: 1.5,
  doesOutdoorExercise: false,
  exerciseHoursPerDay: 0,
  homeAreaSqFt: 1000,
  canWorkFromHome: true,
  hasCarpoolOption: true,
  budget: 'low',
};

describe('Plan Module - Zod Validation', () => {
  it('validates a complete household profile correctly', () => {
    const validated = PlanRequestSchema.parse(MOCK_PROFILE);
    expect(validated.place).toBe('110001');
    expect(validated.adultsCount).toBe(2);
    expect(validated.hasAsthmaOrRespiratoryCondition).toBe(true);
  });

  it('rejects profiles with invalid or empty place names', () => {
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, place: '' })).toThrow();
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, place: 'a' })).toThrow();
  });

  it('rejects profiles with place name > 120 characters', () => {
    expect(() =>
      PlanRequestSchema.parse({ ...MOCK_PROFILE, place: 'X'.repeat(121) })
    ).toThrow();
  });

  it('rejects profiles with adultsCount < 1', () => {
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, adultsCount: 0 })).toThrow();
  });
});

describe('Plan Module - Prompt Builder', () => {
  it('builds system instruction and user prompt containing profile, AQI, and strict constraints', () => {
    const { systemInstruction, userPrompt } = buildPlanPrompt(MOCK_PROFILE, MOCK_AIR_QUALITY);

    // Negative constraints
    expect(systemInstruction).toContain('DO NOT include, calculate, or mention any numbers');
    expect(systemInstruction).toContain('Select ONLY valid action IDs');

    // Profile details
    expect(userPrompt).toContain('Connaught Place');
    expect(userPrompt).toContain('Asthma / Respiratory condition');
    expect(userPrompt).toContain('1 Child(ren)');
    expect(userPrompt).toContain('1 Senior(s)');
    expect(userPrompt).toContain('petrol_car');
    expect(userPrompt).toContain('Current AQI: 342');
    expect(userPrompt).toContain('wear_n95_mask_outside');
  });
});

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
          actionId: 'unknown_hallucinated_action_123', // Should be dropped!
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

    // Verifies the unknown action was dropped
    const actionIds = plan.actions.map((a) => a.actionId);
    expect(actionIds).not.toContain('unknown_hallucinated_action_123');
    expect(plan.actions.length).toBe(6);

    // Verifies scientific calculations are attached by our calculator in code
    for (const action of plan.actions) {
      expect(action.exposureReduction).toHaveProperty('pm25InhaledDoseAvoidedUg');
      expect(action.emissionReduction).toHaveProperty('pm25SavedGrams');
      expect(action.emissionReduction).toHaveProperty('co2SavedGrams');
      expect(action.suggestedTimeOfDay).toBeTruthy();
      expect(action.reason).toBeTruthy();
    }

    // Verify summary totals
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

    // Because asthma & child are in profile, fallback should prioritize N95, kids indoor, and clean air filter
    const actionIds = plan.actions.map((a) => a.actionId);
    expect(actionIds).toContain('wear_n95_mask_outside');
    expect(actionIds).toContain('keep_children_indoors_morning_smog');
    expect(actionIds).toContain('diy_corsi_rosenthal_box');

    // Calculator impact figures attached
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
      // Ensure no numbers leaked in friendly explanation
      expect(item.reason).not.toMatch(/\d+\s*(µg|mg|kg|ppm)/);
    }
  });
});

describe('Plan Module - POST /api/plan Route Handler', () => {
  beforeEach(() => {
    planRateLimiter.reset();
  });

  it('returns 200 with full plan on valid POST request', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-maps-key');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');

    // Mock internal generator and air quality in service call
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(MOCK_PROFILE),
    });

    // Provide air quality spy
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
      body: JSON.stringify({ adultsCount: 0 }), // Missing place and invalid adults
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid Household Profile');
  });
});

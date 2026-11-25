import { describe, it, expect, vi } from 'vitest';
import { generateHouseholdPlan } from '@/lib/plan';
import { PlanRequest } from '@/lib/plan/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

const BASE_PROFILE: PlanRequest = { ...MOCK_PROFILE, place: 'Delhi' };

describe('Household Personalization & Explainability', () => {
  it('personalizes plan for single adult living alone with car commute', async () => {
    const singleProfile: PlanRequest = {
      ...BASE_PROFILE,
      adultsCount: 1,
      childrenCount: 0,
      elderlyCount: 0,
      commutersCount: 1,
      hasAsthmaOrRespiratoryCondition: false,
      primaryCommuteMode: 'petrol_car',
      dailyCommuteDistanceKm: 20,
      budget: 'moderate',
    };

    const plan = await generateHouseholdPlan(singleProfile, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    for (const action of plan.actions) {
      expect(action.reason.toLowerCase()).not.toContain('family members');
      expect(action.reason.toLowerCase()).not.toContain('children');
      expect(action.reason.toLowerCase()).not.toContain('women and children');
      expect(action.basisExplanation).toBeDefined();
      expect(action.costLabel).toBeDefined();
    }

    const text = plan.actions.map(a => `${a.title} ${a.reason} ${a.basisExplanation}`).join(' ');
    expect(text).toMatch(/car|alone|solo|commute/i);
  });

  it('respects zero budget and prioritizes seniors for elderly couple on biomass', async () => {
    const elderlyProfile: PlanRequest = {
      ...BASE_PROFILE,
      adultsCount: 2,
      childrenCount: 0,
      elderlyCount: 2,
      commutersCount: 0,
      cookingFuel: 'biomass',
      budget: 'zero_cost',
    };

    const plan = await generateHouseholdPlan(elderlyProfile, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    const actionIds = plan.actions.map(a => a.actionId);
    expect(actionIds).not.toContain('induction_cooktop_swap');
    expect(actionIds).not.toContain('electric_radiator_winter_swap');
    expect(actionIds).not.toContain('diy_corsi_rosenthal_box');
    expect(actionIds).not.toContain('weatherstrip_doors_and_windows');

    for (const action of plan.actions) {
      expect(action.costRupees ?? 0).toBe(0);
      expect(action.costLabel).toContain('Free');
      expect(action.reason.toLowerCase()).not.toContain('women and children');
    }

    const hasSeniorAction = actionIds.some(id =>
      id === 'senior_indoor_morning_walk' || id === 'seniors_avoid_strenuous_outdoor'
    );
    expect(hasSeniorAction).toBe(true);
  });

  it('protects children with asthma and mentions airway sensitivity', async () => {
    const asthmaFamily: PlanRequest = {
      ...BASE_PROFILE,
      adultsCount: 2,
      childrenCount: 2,
      elderlyCount: 0,
      hasAsthmaOrRespiratoryCondition: true,
      budget: 'moderate',
    };

    const plan = await generateHouseholdPlan(asthmaFamily, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    const reasons = plan.actions.map(a => a.reason).join(' ');
    expect(reasons.toLowerCase()).toMatch(/airway|bronchial|asthma|hyper-reactive/i);

    const basisExplanations = plan.actions.map(a => a.basisExplanation).join(' ');
    expect(basisExplanations.toLowerCase()).toMatch(/asthma|children|child/i);
  });

  it('orders free actions first when mixed budgets are present', async () => {
    const mixedProfile: PlanRequest = {
      ...BASE_PROFILE,
      cookingFuel: 'biomass',
      budget: 'flexible',
    };

    const plan = await generateHouseholdPlan(mixedProfile, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    expect(plan.actions[0].costRupees).toBe(0);
    expect(plan.actions[0].costLabel).toContain('Free');
  });

  it('aligns dynamic actions with forecast cleanest window', async () => {
    const mockAqWithForecast = {
      ...MOCK_AIR_QUALITY,
      cleanestForecastWindow: {
        startHourLocal: '13:00',
        endHourLocal: '16:00',
        label: '1 PM to 4 PM',
      },
    };

    const plan = await generateHouseholdPlan(
      { ...BASE_PROFILE, doesOutdoorExercise: true, exerciseHoursPerDay: 1 },
      { airQualityFetcher: vi.fn().mockResolvedValue(mockAqWithForecast), apiKey: '' }
    );

    const ventAction = plan.actions.find(a =>
      a.actionId === 'ventilate_at_cleanest_afternoon_hour' ||
      a.actionId === 'shift_outdoor_exercise_to_cleanest_hour'
    );
    if (ventAction) {
      expect(ventAction.suggestedTimeOfDay).toContain('1 PM to 4 PM');
      expect(ventAction.reason).toContain('1 PM to 4 PM');
    }
  });
});

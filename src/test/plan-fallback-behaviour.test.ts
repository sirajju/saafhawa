import { describe, it, expect } from 'vitest';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { getRuleBasedFallbackActions } from '@/lib/plan/fallback';
import { evaluateIndoorImpact } from '@/lib/impact/indoor-impact';
import { ACTION_CATALOGUE } from '@/lib/impact/catalogue';
import { type HouseholdProfile } from '@/lib/impact/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Rule-based plan and indoor impact behaviour', () => {
  it('selects rule-based fallback actions that match each household profile', () => {
    const actionsHighAqi = getRuleBasedFallbackActions(MOCK_PROFILE, MOCK_AIR_QUALITY);
    expect(actionsHighAqi.length).toBeGreaterThanOrEqual(6);
    expect(actionsHighAqi.length).toBeLessThanOrEqual(8);

    const zeroCostProfile = { ...MOCK_PROFILE, budget: 'zero_cost' as const };
    const actionsZeroCost = getRuleBasedFallbackActions(zeroCostProfile, MOCK_AIR_QUALITY);
    const hasPaidAction = actionsZeroCost.some((a) => {
      const cat = ACTION_CATALOGUE.find((c) => c.id === a.actionId);
      return (cat?.costRupees ?? 0) > 0;
    });
    expect(hasPaidAction).toBe(false);
  });

  it('evaluates indoor impact for exhaust fan, ventilation and incense actions', () => {
    const exhaustAction = ACTION_CATALOGUE.find((a) => a.id === 'use_exhaust_fan_cooking')!;
    const profile: HouseholdProfile = {
      ...MOCK_PROFILE,
      cookingFuel: 'lpg',
      hasKitchenChimneyOrExhaust: true,
    };
    const resExhaust = evaluateIndoorImpact(exhaustAction, profile, 150, 200, 80);
    expect(resExhaust?.applicable).toBe(true);
    expect(resExhaust?.concentrationReduction).toBeGreaterThan(0);
    expect(resExhaust?.percentageDrop).toBe(70);

    const incenseAction = ACTION_CATALOGUE.find(
      (a) => a.id === 'eliminate_incense_and_mosquito_coils'
    )!;
    const incenseProfile: HouseholdProfile = {
      ...MOCK_PROFILE,
      usesIncenseOrMosquitoCoils: true,
    };
    const resIncense = evaluateIndoorImpact(incenseAction, incenseProfile, 150, 200, 80);
    expect(resIncense?.applicable).toBe(true);
    expect(resIncense?.percentageDrop).toBe(100);
    expect(resIncense?.pm25SavedGrams).toBeGreaterThan(0);
  });

  it('generates a complete household plan in rule-based mode', async () => {
    const plan = await generateHouseholdPlan(MOCK_PROFILE, {
      airQualityFetcher: async () => MOCK_AIR_QUALITY,
    });
    expect(plan.generationMethod).toBe('rule_based_fallback');
    expect(plan.actions.length).toBeGreaterThanOrEqual(6);
    expect(plan.actions.length).toBeLessThanOrEqual(8);
    expect(plan.summary.totalPm25InhaledDoseAvoidedUg).toBeGreaterThanOrEqual(0);
  });
});

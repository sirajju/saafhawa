import { describe, it, expect } from 'vitest';
import { generateHouseholdPlan, getRuleBasedFallbackActions } from '@/lib/plan';
import { resolvePlanConsistency, WORK_FROM_HOME_ACTION_ID } from '@/lib/plan/consistency';
import { ACTION_CATALOGUE } from '@/lib/impact/catalogue';
import { GeminiSelectedAction } from '@/lib/plan/types';
import { MOCK_AIR_QUALITY, TEST_PROFILE_CAR, TEST_PROFILE_TWO_WHEELER } from './plan-fixtures';

describe('Plan Consistency - Mutual Exclusivity of WFH & Commute Swaps', () => {
  it('rule-based fallback never produces both work-from-home and a commute swap for the same profile', () => {
    // For car commuter with WFH enabled
    const fallbackActionsCar = getRuleBasedFallbackActions(TEST_PROFILE_CAR, MOCK_AIR_QUALITY);
    const hasWfhCar = fallbackActionsCar.some((a) => a.actionId === WORK_FROM_HOME_ACTION_ID);
    const hasCommuteSwapCar = fallbackActionsCar.some((a) =>
      ['swap_car_for_metro', 'swap_two_wheeler_for_metro_or_bus', 'carpool_to_work'].includes(a.actionId)
    );

    expect(hasWfhCar && hasCommuteSwapCar).toBe(false);

    // For two-wheeler commuter with WFH enabled
    const fallbackActions2W = getRuleBasedFallbackActions(TEST_PROFILE_TWO_WHEELER, MOCK_AIR_QUALITY);
    const hasWfh2W = fallbackActions2W.some((a) => a.actionId === WORK_FROM_HOME_ACTION_ID);
    const hasCommuteSwap2W = fallbackActions2W.some((a) =>
      ['swap_car_for_metro', 'swap_two_wheeler_for_metro_or_bus', 'carpool_to_work'].includes(a.actionId)
    );

    expect(hasWfh2W && hasCommuteSwap2W).toBe(false);
  });

  it('resolves conflicting Gemini output: keeps larger benefit and replaces the other with an action from a different group', () => {
    // When WFH conflicts with Carpool: WFH has larger dose benefit (24 ug vs 0 ug for carpool)
    const conflictingGeminiActions: GeminiSelectedAction[] = [
      { actionId: 'wear_n95_mask_outside', suggestedTimeOfDay: 'Morning Commute', reason: 'Mask protection' },
      { actionId: 'keep_children_indoors_morning_smog', suggestedTimeOfDay: 'Early Morning', reason: 'Child health' },
      { actionId: 'run_hepa_air_purifier_bedroom', suggestedTimeOfDay: 'Night', reason: 'Clean bedroom air' },
      { actionId: 'work_from_home_on_smog_days', suggestedTimeOfDay: 'All Day', reason: 'Remote work eliminates commute' },
      { actionId: 'carpool_to_work', suggestedTimeOfDay: 'Commute hours', reason: 'Carpool instead of driving solo' },
      { actionId: 'use_exhaust_fan_cooking', suggestedTimeOfDay: 'Meal times', reason: 'Kitchen ventilation' },
    ];

    const airQualityContext = {
      currentPm25: MOCK_AIR_QUALITY.current.pm25!.value,
      hourlyForecast: MOCK_AIR_QUALITY.hourlyForecast,
    };

    // For car commuter, WFH has larger benefit than carpool (24 ug vs 0 ug dose avoided)
    const resolved = resolvePlanConsistency(conflictingGeminiActions, TEST_PROFILE_CAR, airQualityContext);

    const hasWfh = resolved.some((a) => a.actionId === 'work_from_home_on_smog_days');
    const hasCarpool = resolved.some((a) => a.actionId === 'carpool_to_work');

    expect(hasWfh).toBe(true);
    expect(hasCarpool).toBe(false);
    expect(resolved.length).toBe(6);

    // The replacement must come from a different group (not sustainable_swaps)
    const replacementAction = resolved.find(
      (a) => !conflictingGeminiActions.some((orig) => orig.actionId === a.actionId)
    );
    expect(replacementAction).toBeDefined();

    const replacementDef = ACTION_CATALOGUE.find((a) => a.id === replacementAction!.actionId)!;
    expect(replacementDef.category).not.toBe('sustainable_swaps');
    expect(['daily_routine', 'indoor_air']).toContain(replacementDef.category);
  });

  it('keeps commute swap when it provides higher direct benefit than WFH (e.g. 2-wheeler commute to metro)', () => {
    const conflictingActions: GeminiSelectedAction[] = [
      { actionId: 'wear_n95_mask_outside', suggestedTimeOfDay: 'Morning Commute', reason: 'Mask protection' },
      { actionId: 'work_from_home_on_smog_days', suggestedTimeOfDay: 'All Day', reason: 'Remote work' },
      { actionId: 'swap_two_wheeler_for_metro_or_bus', suggestedTimeOfDay: 'Commute', reason: 'Metro swap' },
      { actionId: 'run_hepa_air_purifier_bedroom', suggestedTimeOfDay: 'Night', reason: 'Purifier' },
    ];

    const airQualityContext = {
      currentPm25: 200,
      hourlyForecast: [],
    };

    const resolved = resolvePlanConsistency(conflictingActions, TEST_PROFILE_TWO_WHEELER, airQualityContext);

    const hasWfh = resolved.some((a) => a.actionId === 'work_from_home_on_smog_days');
    const hasMetro2W = resolved.some((a) => a.actionId === 'swap_two_wheeler_for_metro_or_bus');

    // For 2-wheeler, metro swap has larger direct inhaled dose benefit
    expect(hasMetro2W).toBe(true);
    expect(hasWfh).toBe(false);
    expect(resolved.length).toBe(4);
  });

  it('integrates seamlessly into generateHouseholdPlan without producing contradictory actions', async () => {
    const mockGeminiJson = JSON.stringify({
      selectedActions: [
        { actionId: 'wear_n95_mask_outside', suggestedTimeOfDay: 'Morning', reason: 'Mask' },
        { actionId: 'work_from_home_on_smog_days', suggestedTimeOfDay: 'All day', reason: 'WFH' },
        { actionId: 'swap_car_for_metro', suggestedTimeOfDay: 'Commute', reason: 'Metro' },
        { actionId: 'run_hepa_air_purifier_bedroom', suggestedTimeOfDay: 'Night', reason: 'Purifier' },
        { actionId: 'diy_corsi_rosenthal_box', suggestedTimeOfDay: 'Day', reason: 'CR Box' },
      ],
    });

    const plan = await generateHouseholdPlan(TEST_PROFILE_CAR, {
      apiKey: 'test-fake-key',
      airQualityFetcher: async () => MOCK_AIR_QUALITY,
      geminiGenerator: async () => mockGeminiJson,
    });

    const actionIds = plan.actions.map((a) => a.actionId);
    const hasWfh = actionIds.includes('work_from_home_on_smog_days');
    const hasCommuteSwap = actionIds.some((id) =>
      ['swap_car_for_metro', 'swap_two_wheeler_for_metro_or_bus', 'carpool_to_work'].includes(id)
    );

    expect(hasWfh && hasCommuteSwap).toBe(false);
  });
});

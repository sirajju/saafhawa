import { describe, it, expect, vi } from 'vitest';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { PlanRequest } from '@/lib/plan/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Biomass and Clean Cooking Actions Selection', () => {
  it('provides free cooking actions for zero-cost biomass household and skips paid induction', async () => {
    const biomassZeroCostProfile: PlanRequest = {
      ...MOCK_PROFILE,
      place: 'Delhi',
      cookingFuel: 'biomass',
      budget: 'zero_cost',
      childrenCount: 2,
      hasKitchenChimneyOrExhaust: false,
    };

    const plan = await generateHouseholdPlan(biomassZeroCostProfile, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    const actionIds = plan.actions.map((a) => a.actionId);
    expect(actionIds).not.toContain('swap_biomass_cookstove_to_induction');

    const hasFreeCookingAction = actionIds.some(
      (id) =>
        id === 'cook_with_kitchen_cross_ventilation' ||
        id === 'keep_vulnerable_out_of_chulha_kitchen' ||
        id === 'use_dry_seasoned_chulha_fuel'
    );
    expect(hasFreeCookingAction).toBe(true);

    for (const action of plan.actions) {
      expect(action.costRupees ?? 0).toBe(0);
      expect(action.costLabel).toContain('Free');
    }
  });

  it('offers induction swap with approximate cost label when household has a budget', async () => {
    const biomassBudgetProfile: PlanRequest = {
      ...MOCK_PROFILE,
      place: 'Delhi',
      cookingFuel: 'biomass',
      budget: 'low',
    };

    const plan = await generateHouseholdPlan(biomassBudgetProfile, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    const inductionAction = plan.actions.find(
      (a) => a.actionId === 'swap_biomass_cookstove_to_induction'
    );
    expect(inductionAction).toBeDefined();
    expect(inductionAction?.costRupees).toBeGreaterThan(0);
    expect(inductionAction?.costLabel).toMatch(/₹2,200|₹1,800/);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { calculateActionImpact } from '@/lib/impact/calculator';
import { ACTION_CATALOGUE } from '@/lib/impact/catalogue';
import { generateHouseholdPlan } from '@/lib/plan';
import { PlanRequest } from '@/lib/plan/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Commute Actions Applicability', () => {
  it('does not offer post_commute_hygiene when primaryCommuteMode is "none"', async () => {
    const nonCommuteProfile: PlanRequest = {
      ...MOCK_PROFILE,
      place: 'Delhi',
      primaryCommuteMode: 'none',
      commutersCount: 0,
      dailyCommuteDistanceKm: 0,
    };

    const plan = await generateHouseholdPlan(nonCommuteProfile, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    const actionIds = plan.actions.map((a) => a.actionId);
    expect(actionIds).not.toContain('post_commute_hygiene');
    expect(actionIds).not.toContain('swap_car_for_metro');
    expect(actionIds).not.toContain('swap_two_wheeler_for_metro_or_bus');
    expect(actionIds).not.toContain('carpool_to_work');
    expect(actionIds).not.toContain('work_from_home_on_smog_days');
  });

  it('evaluates post_commute_hygiene as not applicable when commutersCount is 0', () => {
    const postCommuteDef = ACTION_CATALOGUE.find((a) => a.id === 'post_commute_hygiene')!;
    const impact = calculateActionImpact(
      postCommuteDef,
      { ...MOCK_PROFILE, primaryCommuteMode: 'none', commutersCount: 0 },
      { currentPm25: 150 }
    );
    expect(impact.applicable).toBe(false);
    expect(impact.reasonIfNotApplicable).toContain('no daily commute');
  });
});

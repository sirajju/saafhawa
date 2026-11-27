import { describe, it, expect, vi } from 'vitest';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { type PlanRequest } from '@/lib/plan/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Plan Reason Personalization', () => {
  it('personalizes vacuuming and wet mopping reasons to mention home size and at-risk members', async () => {
    const asthmaHousehold: PlanRequest = {
      ...MOCK_PROFILE,
      place: 'Delhi',
      homeAreaSqFt: 650,
      hasAsthmaOrRespiratoryCondition: true,
      childrenCount: 1,
    };

    const plan = await generateHouseholdPlan(asthmaHousehold, {
      airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY),
      apiKey: '',
    });

    const reasons = plan.actions.map((a) => a.reason).join(' ');
    expect(reasons).toMatch(/650 sq ft/i);
    expect(reasons).toMatch(/airway|asthma|child/i);

    const mopAction = plan.actions.find((a) => a.actionId === 'wet_mop_instead_of_dry_sweeping');
    if (mopAction) expect(mopAction.reason).toContain('650 sq ft');

    const vacuumAction = plan.actions.find((a) => a.actionId === 'avoid_non_hepa_vacuuming');
    if (vacuumAction) expect(vacuumAction.reason).toContain('650 sq ft');
  });

  it('generates different reasons for different home sizes and occupant demographics', async () => {
    const planA = await generateHouseholdPlan(
      { ...MOCK_PROFILE, place: 'Delhi', homeAreaSqFt: 450, elderlyCount: 2, childrenCount: 0 },
      { airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY), apiKey: '' }
    );

    const planB = await generateHouseholdPlan(
      { ...MOCK_PROFILE, place: 'Delhi', homeAreaSqFt: 1800, elderlyCount: 0, childrenCount: 3 },
      { airQualityFetcher: vi.fn().mockResolvedValue(MOCK_AIR_QUALITY), apiKey: '' }
    );

    const reasonsA = planA.actions.map((a) => a.reason).join(' ');
    const reasonsB = planB.actions.map((a) => a.reason).join(' ');

    expect(reasonsA).toContain('450 sq ft');
    expect(reasonsB).toContain('1800 sq ft');
    expect(reasonsA).toMatch(/senior|elderly/i);
    expect(reasonsB).toMatch(/child/i);
  });
});

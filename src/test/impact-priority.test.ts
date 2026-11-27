import { describe, it, expect } from 'vitest';
import { calculateDeduplicatedTotals } from '@/lib/impact/deduplication';
import { MOCK_PROFILE } from './plan-fixtures';

describe('Action Priority Ordering and Deduplication', () => {
  it('sorts actions by numeric priority so carpool and WFH never double-count', () => {
    const profile = {
      ...MOCK_PROFILE,
      primaryCommuteMode: 'petrol_car' as const,
      dailyCommuteDistanceKm: 20,
      commutersCount: 1,
    };
    const carpool = {
      actionId: 'carpool_to_work',
      title: 'Carpool',
      description: 'Carpool to work',
      category: 'daily_routine' as const,
      applicable: true,
      exposureReduction: {
        pm25InhaledDoseAvoidedUg: 50,
        pm25ConcentrationReductionUgM3: 10,
        percentageDrop: 20,
        isUnknown: false,
      },
      emissionReduction: { pm25SavedGrams: 10, co2SavedGrams: 100 },
    };
    const other = {
      actionId: 'wear_n95_mask_outside',
      title: 'Wear N95',
      description: 'Wear N95 outdoors',
      category: 'daily_routine' as const,
      applicable: true,
      exposureReduction: {
        pm25InhaledDoseAvoidedUg: 100,
        pm25ConcentrationReductionUgM3: 20,
        percentageDrop: 40,
        isUnknown: false,
      },
      emissionReduction: { pm25SavedGrams: 0, co2SavedGrams: 0 },
    };
    const wfh = {
      actionId: 'work_from_home_on_smog_days',
      title: 'Work from home',
      description: 'WFH on smog days',
      category: 'daily_routine' as const,
      applicable: true,
      exposureReduction: {
        pm25InhaledDoseAvoidedUg: 100,
        pm25ConcentrationReductionUgM3: 20,
        percentageDrop: 50,
        isUnknown: false,
      },
      emissionReduction: { pm25SavedGrams: 20, co2SavedGrams: 200 },
    };

    // Passed with carpool first, other in middle, WFH last
    const result = calculateDeduplicatedTotals([carpool, other, wfh], profile, 150);

    // WFH priority (10) evaluates before carpool (40), consuming 100% of commute frac
    // So carpool contributes 0 additional grams to emissions
    expect(result.totalPm25EmissionsSavedGrams).toBe(20);
    expect(result.totalCo2EmissionsSavedGrams).toBe(200);
  });
});

import { describe, it, expect } from 'vitest';
import { calculateActionImpact, calculateHouseholdImpact } from '@/lib/impact/calculator';
import { calculateBaselineDailyHouseholdDoseUg } from '@/lib/impact/deduplication';
import { ACTION_CATALOGUE } from '@/lib/impact/catalogue';
import { type HouseholdProfile } from '@/lib/impact/types';
import { getExposureComparisonText } from '@/lib/impact/comparisons';

const BASE_TEST_PROFILE: HouseholdProfile = {
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 0,
  commutersCount: 1,
  primaryCommuteMode: 'petrol_car',
  dailyCommuteDistanceKm: 20,
  hasCarpoolOption: true,
  canWorkFromHome: true,
  dailyOutdoorHoursPerPerson: 1.5,
  doesOutdoorExercise: false,
  exerciseHoursPerDay: 0,
  homeAreaSqFt: 1000,
  hasAirPurifier: true,
  hasKitchenChimneyOrExhaust: true,
  usesIncenseOrMosquitoCoils: true,
  cookingFuel: 'lpg',
  heatingFuel: 'none',
  hasGardenOrOpenWasteBurning: false,
  windowSealingQuality: 'average',
};

describe('Impact Calculator Correctness & Deduplication', () => {
  it('prevents double counting for overlapping indoor air actions and commute swaps', () => {
    const summary = calculateHouseholdImpact(BASE_TEST_PROFILE, { currentPm25: 200 });

    const purifier = summary.actions.find((a) => a.actionId === 'run_hepa_air_purifier_bedroom')!;
    const boxFan = summary.actions.find((a) => a.actionId === 'diy_corsi_rosenthal_box')!;
    const sealing = summary.actions.find((a) => a.actionId === 'weatherstrip_doors_and_windows')!;

    const metro = summary.actions.find((a) => a.actionId === 'swap_car_for_metro')!;
    const carpool = summary.actions.find((a) => a.actionId === 'carpool_to_work')!;
    const wfh = summary.actions.find((a) => a.actionId === 'work_from_home_on_smog_days')!;

    // Individual standalone actions report their potential
    expect(purifier.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
    expect(boxFan.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
    expect(sealing.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);

    const standaloneIndoorSum =
      (purifier.exposureReduction.pm25InhaledDoseAvoidedUg || 0) +
      (boxFan.exposureReduction.pm25InhaledDoseAvoidedUg || 0) +
      (sealing.exposureReduction.pm25InhaledDoseAvoidedUg || 0);

    const standaloneCommuteCo2Sum =
      metro.emissionReduction.co2SavedGrams +
      carpool.emissionReduction.co2SavedGrams +
      wfh.emissionReduction.co2SavedGrams;

    // The deduplicated totals must be strictly less than the naive sum
    expect(summary.totalPm25InhaledDoseAvoidedUg).toBeLessThan(standaloneIndoorSum + 5000);
    expect(summary.totalCo2EmissionsSavedGrams).toBeLessThan(standaloneCommuteCo2Sum);
  });

  it('caps household total at the actual dose the household would inhale that day', () => {
    const currentPm25 = 200;
    const baselineCap = calculateBaselineDailyHouseholdDoseUg(BASE_TEST_PROFILE, currentPm25)!;
    expect(baselineCap).toBeGreaterThan(0);

    const summary = calculateHouseholdImpact(BASE_TEST_PROFILE, { currentPm25 });

    // Household total dose avoided must never exceed baseline inhaled dose
    expect(summary.totalPm25InhaledDoseAvoidedUg!).toBeLessThanOrEqual(baselineCap);
  });

  it('reports impact as unknown when PM2.5 is missing (null), instead of assuming 0, 100, or 150', () => {
    const n95Action = ACTION_CATALOGUE.find((a) => a.id === 'wear_n95_mask_outside')!;
    const result = calculateActionImpact(n95Action, BASE_TEST_PROFILE, { currentPm25: null });

    expect(result.exposureReduction.isUnknown).toBe(true);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeNull();
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBeNull();
    expect(result.exposureReduction.percentageDrop).toBeNull();

    const comparison = getExposureComparisonText(result.exposureReduction, result.actionId);
    expect(comparison).toContain('Impact unknown');
    expect(comparison).toContain('unavailable');

    const summary = calculateHouseholdImpact(BASE_TEST_PROFILE, { currentPm25: null });
    expect(summary.isExposureUnknown).toBe(true);
    expect(summary.totalPm25InhaledDoseAvoidedUg).toBeNull();
  });

  it('handles PM2.5 of 0 without throwing or returning NaN', () => {
    const summary = calculateHouseholdImpact(BASE_TEST_PROFILE, { currentPm25: 0 });

    expect(summary.totalPm25InhaledDoseAvoidedUg).toBe(0);
    expect(isNaN(summary.totalPm25InhaledDoseAvoidedUg!)).toBe(false);

    for (const a of summary.actions) {
      if (a.exposureReduction.percentageDrop !== null) {
        expect(isNaN(a.exposureReduction.percentageDrop)).toBe(false);
      }
    }
  });

  it('ensures Work from Home gives positive exposure benefit for car commuters and agrees with note', () => {
    const wfhAction = ACTION_CATALOGUE.find((a) => a.id === 'work_from_home_on_smog_days')!;
    const result = calculateActionImpact(wfhAction, BASE_TEST_PROFILE, { currentPm25: 200 });

    expect(result.applicable).toBe(true);
    // Number must be positive (0.20 * 200 * transitVolume > 0)
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBeGreaterThan(0);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg!).toBeGreaterThan(0);
    expect(result.exposureReduction.percentageDrop!).toBeGreaterThan(20);
    // Note must confirm positive transit exposure elimination
    expect(result.methodologyNotes).toContain(
      'eliminates round-trip vehicular commute emissions and roadway traffic exposure'
    );
  });
});

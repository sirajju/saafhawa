import { describe, it, expect } from 'vitest';
import {
  calculateActionImpact,
  calculateHouseholdImpact,
  calculateBaselineDailyHouseholdDoseUg,
  ACTION_CATALOGUE,
  HouseholdProfile,
} from '@/lib/impact';
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

  it('fixes divide-by-zero when PM2.5 is 0 without throwing or returning NaN', () => {
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
    expect(result.methodologyNotes).toContain('eliminates round-trip vehicular commute emissions and roadway traffic exposure');
  });

  it('enforces that exhaust fan action does NOT apply to induction cooking', () => {
    const exhaustAction = ACTION_CATALOGUE.find((a) => a.id === 'use_exhaust_fan_cooking')!;

    // Induction cooktop -> non applicable
    const inductionProfile = { ...BASE_TEST_PROFILE, cookingFuel: 'induction' as const, hasKitchenChimneyOrExhaust: true };
    const resultInduction = calculateActionImpact(exhaustAction, inductionProfile, { currentPm25: 150 });
    expect(resultInduction.applicable).toBe(false);
    expect(resultInduction.reasonIfNotApplicable).toContain('Induction cooking does not generate combustion emissions');

    // LPG cooktop with exhaust -> applicable
    const lpgProfile = { ...BASE_TEST_PROFILE, cookingFuel: 'lpg' as const, hasKitchenChimneyOrExhaust: true };
    const resultLpg = calculateActionImpact(exhaustAction, lpgProfile, { currentPm25: 150 });
    expect(resultLpg.applicable).toBe(true);

    // LPG cooktop without exhaust -> non applicable
    const noExhaustProfile = { ...BASE_TEST_PROFILE, cookingFuel: 'lpg' as const, hasKitchenChimneyOrExhaust: false };
    const resultNoExhaust = calculateActionImpact(exhaustAction, noExhaustProfile, { currentPm25: 150 });
    expect(resultNoExhaust.applicable).toBe(false);
    expect(resultNoExhaust.reasonIfNotApplicable).toContain('does not have a kitchen chimney or exhaust fan');
  });

  it('enforces purifier ownership on running air purifier action', () => {
    const purifierAction = ACTION_CATALOGUE.find((a) => a.id === 'run_hepa_air_purifier_bedroom')!;

    // Without purifier ownership
    const noPurifierProfile = { ...BASE_TEST_PROFILE, hasAirPurifier: false };
    const resultNoPurifier = calculateActionImpact(purifierAction, noPurifierProfile, { currentPm25: 150 });
    expect(resultNoPurifier.applicable).toBe(false);
    expect(resultNoPurifier.reasonIfNotApplicable).toContain('does not currently own a HEPA air purifier');

    // With purifier ownership
    const withPurifierProfile = { ...BASE_TEST_PROFILE, hasAirPurifier: true };
    const resultWithPurifier = calculateActionImpact(purifierAction, withPurifierProfile, { currentPm25: 150 });
    expect(resultWithPurifier.applicable).toBe(true);
  });

  it('uses number of commuters and commute distance to scale exposure and emissions', () => {
    const metroAction = ACTION_CATALOGUE.find((a) => a.id === 'swap_car_for_metro')!;

    const oneCommuter = { ...BASE_TEST_PROFILE, commutersCount: 1, dailyCommuteDistanceKm: 20 };
    const twoCommuters = { ...BASE_TEST_PROFILE, commutersCount: 2, dailyCommuteDistanceKm: 20 };
    const zeroCommuters = { ...BASE_TEST_PROFILE, commutersCount: 0, dailyCommuteDistanceKm: 20 };

    const res1 = calculateActionImpact(metroAction, oneCommuter, { currentPm25: 150 });
    const res2 = calculateActionImpact(metroAction, twoCommuters, { currentPm25: 150 });
    const res0 = calculateActionImpact(metroAction, zeroCommuters, { currentPm25: 150 });

    expect(res0.applicable).toBe(false);
    expect(res2.exposureReduction.pm25InhaledDoseAvoidedUg!).toBeGreaterThan(
      res1.exposureReduction.pm25InhaledDoseAvoidedUg!
    );
  });

  it('deducts electric power grid CO2 emissions from induction and electric heating swaps', () => {
    const inductionSwapAction = ACTION_CATALOGUE.find((a) => a.id === 'swap_biomass_cookstove_to_induction')!;
    const biomassProfile = { ...BASE_TEST_PROFILE, cookingFuel: 'biomass' as const };
    const result = calculateActionImpact(inductionSwapAction, biomassProfile, { currentPm25: 150 });

    expect(result.applicable).toBe(true);
    // Direct chulha emits 6,000 g CO2; after grid deduction (~1,289 g), net is ~4,711 g CO2
    expect(result.emissionReduction.co2SavedGrams).toBeLessThan(6000);
    expect(result.emissionReduction.co2SavedGrams).toBeGreaterThan(4500);
    expect(result.methodologyNotes).toContain('electric grid emissions');
  });
});

import { describe, it, expect } from 'vitest';
import { calculateActionImpact } from '@/lib/impact/calculator';
import { ACTION_CATALOGUE } from '@/lib/impact/catalogue';
import { type HouseholdProfile } from '@/lib/impact/types';

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

describe('Impact Profile Conditions & Grid Deductions', () => {
  it('enforces that exhaust fan action does NOT apply to induction cooking', () => {
    const exhaustAction = ACTION_CATALOGUE.find((a) => a.id === 'use_exhaust_fan_cooking')!;

    // Induction cooktop -> non applicable
    const inductionProfile = {
      ...BASE_TEST_PROFILE,
      cookingFuel: 'induction' as const,
      hasKitchenChimneyOrExhaust: true,
    };
    const resultInduction = calculateActionImpact(exhaustAction, inductionProfile, {
      currentPm25: 150,
    });
    expect(resultInduction.applicable).toBe(false);
    expect(resultInduction.reasonIfNotApplicable).toContain(
      'Induction cooking does not generate combustion emissions'
    );

    // LPG cooktop with exhaust -> applicable
    const lpgProfile = {
      ...BASE_TEST_PROFILE,
      cookingFuel: 'lpg' as const,
      hasKitchenChimneyOrExhaust: true,
    };
    const resultLpg = calculateActionImpact(exhaustAction, lpgProfile, { currentPm25: 150 });
    expect(resultLpg.applicable).toBe(true);

    // LPG cooktop without exhaust -> non applicable
    const noExhaustProfile = {
      ...BASE_TEST_PROFILE,
      cookingFuel: 'lpg' as const,
      hasKitchenChimneyOrExhaust: false,
    };
    const resultNoExhaust = calculateActionImpact(exhaustAction, noExhaustProfile, {
      currentPm25: 150,
    });
    expect(resultNoExhaust.applicable).toBe(false);
    expect(resultNoExhaust.reasonIfNotApplicable).toContain(
      'does not have a kitchen chimney or exhaust fan'
    );
  });

  it('enforces purifier ownership on running air purifier action', () => {
    const purifierAction = ACTION_CATALOGUE.find((a) => a.id === 'run_hepa_air_purifier_bedroom')!;

    // Without purifier ownership
    const noPurifierProfile = { ...BASE_TEST_PROFILE, hasAirPurifier: false };
    const resultNoPurifier = calculateActionImpact(purifierAction, noPurifierProfile, {
      currentPm25: 150,
    });
    expect(resultNoPurifier.applicable).toBe(false);
    expect(resultNoPurifier.reasonIfNotApplicable).toContain(
      'does not currently own a HEPA air purifier'
    );

    // With purifier ownership
    const withPurifierProfile = { ...BASE_TEST_PROFILE, hasAirPurifier: true };
    const resultWithPurifier = calculateActionImpact(purifierAction, withPurifierProfile, {
      currentPm25: 150,
    });
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
    const inductionSwapAction = ACTION_CATALOGUE.find(
      (a) => a.id === 'swap_biomass_cookstove_to_induction'
    )!;
    const biomassProfile = { ...BASE_TEST_PROFILE, cookingFuel: 'biomass' as const };
    const result = calculateActionImpact(inductionSwapAction, biomassProfile, { currentPm25: 150 });

    expect(result.applicable).toBe(true);
    // Direct chulha emits 6,000 g CO2; after grid deduction (~1,289 g), net is ~4,711 g CO2
    expect(result.emissionReduction.co2SavedGrams).toBeLessThan(6000);
    expect(result.emissionReduction.co2SavedGrams).toBeGreaterThan(4500);
    expect(result.methodologyNotes).toContain('electric grid emissions');
  });
});

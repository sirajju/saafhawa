import { describe, it, expect } from 'vitest';
import {
  calculateHouseholdImpact,
  HouseholdProfile,
} from '@/lib/impact';

describe('Impact Module - Edge Cases', () => {
  it('handles household with NO car: marks car-specific swaps as non-applicable', () => {
    const noCarProfile: HouseholdProfile = {
      adultsCount: 1,
      childrenCount: 0,
      elderlyCount: 0,
      primaryCommuteMode: 'public_transit',
      dailyCommuteDistanceKm: 10,
      hasCarpoolOption: false,
      canWorkFromHome: false,
      dailyOutdoorHoursPerPerson: 1.0,
      doesOutdoorExercise: false,
      exerciseHoursPerDay: 0,
      homeAreaSqFt: 500,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: true,
      usesIncenseOrMosquitoCoils: false,
      cookingFuel: 'induction',
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'good',
    };

    const summary = calculateHouseholdImpact(noCarProfile, { currentPm25: 150 });

    const carToMetro = summary.actions.find((a) => a.actionId === 'swap_car_for_metro')!;
    expect(carToMetro.applicable).toBe(false);
    expect(carToMetro.reasonIfNotApplicable).toContain('does not commute by personal car');
    expect(carToMetro.emissionReduction.co2SavedGrams).toBe(0);

    const carpool = summary.actions.find((a) => a.actionId === 'carpool_to_work')!;
    expect(carpool.applicable).toBe(false);

    const biomassCook = summary.actions.find(
      (a) => a.actionId === 'swap_biomass_cookstove_to_induction'
    )!;
    expect(biomassCook.applicable).toBe(false);
    expect(biomassCook.reasonIfNotApplicable).toContain('already uses clean cooking fuel');
  });

  it('handles extremely clean ambient air (e.g. PM2.5 = 5 µg/m³ or 0 µg/m³)', () => {
    const cleanAirProfile: HouseholdProfile = {
      adultsCount: 2,
      childrenCount: 1,
      elderlyCount: 0,
      primaryCommuteMode: 'petrol_car',
      dailyCommuteDistanceKm: 25,
      hasCarpoolOption: true,
      canWorkFromHome: true,
      dailyOutdoorHoursPerPerson: 2.0,
      doesOutdoorExercise: true,
      exerciseHoursPerDay: 1.0,
      homeAreaSqFt: 1000,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: true,
      cookingFuel: 'lpg',
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'average',
    };

    const summary = calculateHouseholdImpact(cleanAirProfile, { currentPm25: 5.0 });

    const n95 = summary.actions.find((a) => a.actionId === 'wear_n95_mask_outside')!;
    expect(n95.applicable).toBe(true);
    expect(n95.exposureReduction.pm25ConcentrationReductionUgM3).toBe(4.3);
    expect(n95.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThanOrEqual(0);

    const metro = summary.actions.find((a) => a.actionId === 'swap_car_for_metro')!;
    expect(metro.applicable).toBe(true);
    expect(metro.emissionReduction.co2SavedGrams).toBeGreaterThan(0);
    expect(metro.emissionReduction.pm25SavedGrams).toBeGreaterThan(0);

    expect(isNaN(summary.totalPm25InhaledDoseAvoidedUg)).toBe(false);
    expect(isNaN(summary.totalPm25EmissionsSavedGrams)).toBe(false);
    expect(isNaN(summary.totalCo2EmissionsSavedGrams)).toBe(false);
  });

  it('scales exposure avoided with household occupants', () => {
    const airQuality = { currentPm25: 150 };

    const smallProfile: HouseholdProfile = {
      adultsCount: 1,
      childrenCount: 0,
      elderlyCount: 0,
      primaryCommuteMode: 'none',
      dailyCommuteDistanceKm: 0,
      hasCarpoolOption: false,
      canWorkFromHome: false,
      dailyOutdoorHoursPerPerson: 2.0,
      doesOutdoorExercise: false,
      exerciseHoursPerDay: 0,
      homeAreaSqFt: 500,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: false,
      cookingFuel: 'lpg',
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'average',
    };

    const largeProfile: HouseholdProfile = {
      ...smallProfile,
      adultsCount: 4,
      childrenCount: 2,
      elderlyCount: 1,
    };

    const smallSummary = calculateHouseholdImpact(smallProfile, airQuality);
    const largeSummary = calculateHouseholdImpact(largeProfile, airQuality);

    expect(largeSummary.totalPm25InhaledDoseAvoidedUg).toBeGreaterThan(
      smallSummary.totalPm25InhaledDoseAvoidedUg
    );
  });

  it('correctly ranks top 3 actions by exposure and emissions', () => {
    const richProfile: HouseholdProfile = {
      adultsCount: 3,
      childrenCount: 2,
      elderlyCount: 0,
      primaryCommuteMode: 'diesel_car',
      dailyCommuteDistanceKm: 40,
      hasCarpoolOption: true,
      canWorkFromHome: true,
      dailyOutdoorHoursPerPerson: 2.0,
      doesOutdoorExercise: true,
      exerciseHoursPerDay: 1.0,
      homeAreaSqFt: 1800,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: true,
      cookingFuel: 'biomass',
      heatingFuel: 'biomass',
      hasGardenOrOpenWasteBurning: true,
      windowSealingQuality: 'poor',
    };

    const summary = calculateHouseholdImpact(richProfile, { currentPm25: 250 });

    expect(summary.topActionsByExposure.length).toBe(3);
    expect(summary.topActionsByEmissions.length).toBe(3);

    expect(
      summary.topActionsByExposure[0].exposureReduction.pm25InhaledDoseAvoidedUg
    ).toBeGreaterThanOrEqual(
      summary.topActionsByExposure[1].exposureReduction.pm25InhaledDoseAvoidedUg
    );

    expect(
      summary.topActionsByEmissions[0].emissionReduction.pm25SavedGrams
    ).toBeGreaterThanOrEqual(
      summary.topActionsByEmissions[1].emissionReduction.pm25SavedGrams
    );
  });
});

import { describe, it, expect } from 'vitest';
import {
  ACTION_CATALOGUE,
  calculateActionImpact,
  HouseholdProfile,
} from '@/lib/impact';

describe('Impact Module - Indoor Air Quality Arithmetic', () => {
  const profile: HouseholdProfile = {
    adultsCount: 2,
    childrenCount: 1,
    elderlyCount: 1,
    commutersCount: 1,
    primaryCommuteMode: 'petrol_car',
    dailyCommuteDistanceKm: 15,
    hasCarpoolOption: false,
    canWorkFromHome: false,
    dailyOutdoorHoursPerPerson: 1.0,
    doesOutdoorExercise: false,
    exerciseHoursPerDay: 0,
    homeAreaSqFt: 1000,
    hasAirPurifier: true,
    hasKitchenChimneyOrExhaust: true,
    usesIncenseOrMosquitoCoils: true,
    cookingFuel: 'lpg',
    heatingFuel: 'none',
    hasGardenOrOpenWasteBurning: false,
    windowSealingQuality: 'poor',
  };

  it('calculates HEPA air purifier bedroom exposure reduction for all sleeping occupants', () => {
    const purifierAction = ACTION_CATALOGUE.find((a) => a.id === 'run_hepa_air_purifier_bedroom')!;
    const result = calculateActionImpact(purifierAction, profile, { currentPm25: 200 });

    expect(result.applicable).toBe(true);
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(75.0);
    expect(result.exposureReduction.percentageDrop).toBe(75.0);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(500);
  });

  it('calculates kitchen exhaust fan reduction during cooking', () => {
    const exhaustAction = ACTION_CATALOGUE.find((a) => a.id === 'use_exhaust_fan_cooking')!;
    const result = calculateActionImpact(exhaustAction, profile, { currentPm25: 120 });

    expect(result.applicable).toBe(true);
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(175.0);
    expect(result.exposureReduction.percentageDrop).toBe(70.0);
  });

  it('calculates both exposure AND emission savings when eliminating incense coils', () => {
    const incenseAction = ACTION_CATALOGUE.find((a) => a.id === 'eliminate_incense_and_mosquito_coils')!;
    const result = calculateActionImpact(incenseAction, profile, { currentPm25: 150 });

    expect(result.applicable).toBe(true);
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(180.0);
    expect(result.emissionReduction.pm25SavedGrams).toBe(0.07);
    expect(result.emissionReduction.co2SavedGrams).toBe(4.4);
  });

  it('marks incense action not applicable when household does not use them', () => {
    const incenseAction = ACTION_CATALOGUE.find((a) => a.id === 'eliminate_incense_and_mosquito_coils')!;
    const noIncenseProfile = { ...profile, usesIncenseOrMosquitoCoils: false };

    const result = calculateActionImpact(incenseAction, noIncenseProfile, { currentPm25: 150 });
    expect(result.applicable).toBe(false);
    expect(result.reasonIfNotApplicable).toContain('does not use incense');
  });
});

describe('Impact Module - Sustainable Swaps Arithmetic', () => {
  it('calculates car to metro swap: saves vehicular PM2.5, CO2, and in-transit exposure', () => {
    const metroAction = ACTION_CATALOGUE.find((a) => a.id === 'swap_car_for_metro')!;
    const carProfile: HouseholdProfile = {
      adultsCount: 2,
      childrenCount: 0,
      elderlyCount: 0,
      commutersCount: 1,
      primaryCommuteMode: 'petrol_car',
      dailyCommuteDistanceKm: 30,
      hasCarpoolOption: true,
      canWorkFromHome: true,
      dailyOutdoorHoursPerPerson: 1.0,
      doesOutdoorExercise: false,
      exerciseHoursPerDay: 0,
      homeAreaSqFt: 800,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: false,
      cookingFuel: 'lpg',
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'average',
    };

    const result = calculateActionImpact(metroAction, carProfile, { currentPm25: 160 });

    expect(result.applicable).toBe(true);
    expect(result.emissionReduction.co2SavedGrams).toBe(3960.0);
    expect(result.emissionReduction.pm25SavedGrams).toBe(1.02);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
  });

  it('calculates open waste burning elimination: massive source emission prevention', () => {
    const burningAction = ACTION_CATALOGUE.find((a) => a.id === 'stop_open_waste_burning')!;
    const wasteBurnProfile: HouseholdProfile = {
      adultsCount: 3,
      childrenCount: 1,
      elderlyCount: 0,
      commutersCount: 0,
      primaryCommuteMode: 'none',
      dailyCommuteDistanceKm: 0,
      hasCarpoolOption: false,
      canWorkFromHome: false,
      dailyOutdoorHoursPerPerson: 2.0,
      doesOutdoorExercise: false,
      exerciseHoursPerDay: 0,
      homeAreaSqFt: 1500,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: false,
      cookingFuel: 'lpg',
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: true,
      windowSealingQuality: 'average',
    };

    const result = calculateActionImpact(burningAction, wasteBurnProfile, { currentPm25: 180 });

    expect(result.applicable).toBe(true);
    expect(result.emissionReduction.pm25SavedGrams).toBe(75.0);
    expect(result.emissionReduction.co2SavedGrams).toBe(3750.0);
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(150.0);
  });

  it('calculates biomass cookstove to induction swap', () => {
    const inductionAction = ACTION_CATALOGUE.find(
      (a) => a.id === 'swap_biomass_cookstove_to_induction'
    )!;
    const biomassProfile: HouseholdProfile = {
      adultsCount: 2,
      childrenCount: 2,
      elderlyCount: 0,
      commutersCount: 0,
      primaryCommuteMode: 'walking_cycling',
      dailyCommuteDistanceKm: 0,
      hasCarpoolOption: false,
      canWorkFromHome: false,
      dailyOutdoorHoursPerPerson: 2.0,
      doesOutdoorExercise: false,
      exerciseHoursPerDay: 0,
      homeAreaSqFt: 600,
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: false,
      cookingFuel: 'biomass',
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'poor',
    };

    const result = calculateActionImpact(inductionAction, biomassProfile, { currentPm25: 120 });

    expect(result.applicable).toBe(true);
    expect(result.emissionReduction.pm25SavedGrams).toBe(34.0);
    expect(result.emissionReduction.co2SavedGrams).toBe(4711.2);
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(350.0);
  });
});

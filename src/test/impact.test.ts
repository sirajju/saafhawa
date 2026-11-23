import { describe, it, expect } from 'vitest';
import {
  ACTION_CATALOGUE,
  calculateActionImpact,
  calculateHouseholdImpact,
  HouseholdProfile,
  INHALATION_RATES_M3_PER_HOUR,
  VEHICULAR_EMISSION_FACTORS,
  BIOMASS_AND_OPEN_BURNING_FACTORS,
} from '@/lib/impact';

describe('Impact Module - Action Catalogue & Factors', () => {
  it('contains ~20 actions across all three categories', () => {
    expect(ACTION_CATALOGUE.length).toBeGreaterThanOrEqual(20);

    const categories = new Set(ACTION_CATALOGUE.map((a) => a.category));
    expect(categories.has('daily_routine')).toBe(true);
    expect(categories.has('indoor_air')).toBe(true);
    expect(categories.has('sustainable_swaps')).toBe(true);
  });

  it('ensures every catalogue item has unique IDs and required metadata', () => {
    const ids = ACTION_CATALOGUE.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    for (const action of ACTION_CATALOGUE) {
      expect(action.title).toBeTruthy();
      expect(action.description).toBeTruthy();
      expect(['daily_routine', 'indoor_air', 'sustainable_swaps']).toContain(action.category);
    }
  });

  it('verifies that inhalation and emission factors are positive finite numbers', () => {
    expect(INHALATION_RATES_M3_PER_HOUR.ADULT_RESTING).toBeGreaterThan(0);
    expect(INHALATION_RATES_M3_PER_HOUR.CHILD_DAILY_AVERAGE).toBeGreaterThan(0);
    expect(VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM).toBeGreaterThan(
      VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM
    );
    expect(BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BIOMASS_BURNING_PM25_G_PER_KG).toBeGreaterThan(0);
  });
});

describe('Impact Module - Daily Routine Arithmetic', () => {
  const baseProfile: HouseholdProfile = {
    adultsCount: 2,
    childrenCount: 1,
    elderlyCount: 0,
    primaryCommuteMode: 'petrol_car',
    dailyCommuteDistanceKm: 20,
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

  it('calculates N95 mask exposure reduction accurately', () => {
    const n95Action = ACTION_CATALOGUE.find((a) => a.id === 'wear_n95_mask_outside')!;
    const severeSmog = { currentPm25: 200.0 };

    const result = calculateActionImpact(n95Action, baseProfile, severeSmog);

    expect(result.applicable).toBe(true);
    // 85% real-world fitted efficiency -> 200 * 0.85 = 170 µg/m³
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(170.0);
    expect(result.exposureReduction.percentageDrop).toBe(85.0);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
    // Personal protection does not save source tailpipe emissions
    expect(result.emissionReduction.pm25SavedGrams).toBe(0);
    expect(result.emissionReduction.co2SavedGrams).toBe(0);
  });

  it('marks N95 as not applicable when outdoor time is 0', () => {
    const n95Action = ACTION_CATALOGUE.find((a) => a.id === 'wear_n95_mask_outside')!;
    const zeroOutdoorProfile = { ...baseProfile, dailyOutdoorHoursPerPerson: 0 };

    const result = calculateActionImpact(n95Action, zeroOutdoorProfile, { currentPm25: 150 });
    expect(result.applicable).toBe(false);
    expect(result.reasonIfNotApplicable).toContain('0 daily outdoor hours');
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBe(0);
  });

  it('calculates shifted outdoor exercise impact using diurnal peak-to-cleanest delta', () => {
    const exerciseAction = ACTION_CATALOGUE.find(
      (a) => a.id === 'shift_outdoor_exercise_to_cleanest_hour'
    )!;

    const smogWithForecast = {
      currentPm25: 180.0,
      hourlyForecast: [
        { dateTime: '2026-11-23T08:00:00Z', pm25: { value: 280, units: 'MICROGRAMS_PER_CUBIC_METER' } }, // Peak morning inversion
        { dateTime: '2026-11-23T14:00:00Z', pm25: { value: 100, units: 'MICROGRAMS_PER_CUBIC_METER' } }, // Cleanest afternoon solar break
      ],
    };

    const result = calculateActionImpact(exerciseAction, baseProfile, smogWithForecast);

    expect(result.applicable).toBe(true);
    // Delta = 280 - 100 = 180 µg/m³
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(180.0);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
  });

  it('marks children indoor action as not applicable when childrenCount is 0', () => {
    const childAction = ACTION_CATALOGUE.find((a) => a.id === 'keep_children_indoors_morning_smog')!;
    const noKidsProfile = { ...baseProfile, childrenCount: 0 };

    const result = calculateActionImpact(childAction, noKidsProfile, { currentPm25: 180 });
    expect(result.applicable).toBe(false);
    expect(result.reasonIfNotApplicable).toContain('No children');
  });
});

describe('Impact Module - Indoor Air Quality Arithmetic', () => {
  const profile: HouseholdProfile = {
    adultsCount: 2,
    childrenCount: 1,
    elderlyCount: 1,
    primaryCommuteMode: 'petrol_car',
    dailyCommuteDistanceKm: 15,
    hasCarpoolOption: false,
    canWorkFromHome: false,
    dailyOutdoorHoursPerPerson: 1.0,
    doesOutdoorExercise: false,
    exerciseHoursPerDay: 0,
    homeAreaSqFt: 1200,
    hasAirPurifier: false,
    hasKitchenChimneyOrExhaust: false,
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
    // Baseline indoor = 200 * 0.5 = 100. HEPA 75% reduction = 75 µg/m³
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(75.0);
    expect(result.exposureReduction.percentageDrop).toBe(75.0);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(500);
  });

  it('calculates kitchen exhaust fan reduction during cooking', () => {
    const exhaustAction = ACTION_CATALOGUE.find((a) => a.id === 'use_exhaust_fan_cooking')!;
    const result = calculateActionImpact(exhaustAction, profile, { currentPm25: 120 });

    expect(result.applicable).toBe(true);
    // 70% capture of 250 µg/m³ cooking spike = 175 µg/m³
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(175.0);
    expect(result.exposureReduction.percentageDrop).toBe(70.0);
  });

  it('calculates both exposure AND emission savings when eliminating incense coils', () => {
    const incenseAction = ACTION_CATALOGUE.find((a) => a.id === 'eliminate_incense_and_mosquito_coils')!;
    const result = calculateActionImpact(incenseAction, profile, { currentPm25: 150 });

    expect(result.applicable).toBe(true);
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(180.0);
    // 2 coils/sticks * 0.035 g = 0.070 g PM2.5 saved
    expect(result.emissionReduction.pm25SavedGrams).toBe(0.07);
    // 2 coils/sticks * 15 g = 30 g CO2 saved
    expect(result.emissionReduction.co2SavedGrams).toBe(30.0);
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
      primaryCommuteMode: 'petrol_car',
      dailyCommuteDistanceKm: 30, // 30 km round-trip
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
    // Petrol car CO2: 150 g/km - Metro 18 g/km = 132 g/km * 30 km = 3960 g CO2
    expect(result.emissionReduction.co2SavedGrams).toBe(3960.0);
    // Petrol car PM2.5: (0.045 - 0.001) * 30 = 1.32 g PM2.5
    expect(result.emissionReduction.pm25SavedGrams).toBe(1.32);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
  });

  it('calculates open waste burning elimination: massive source emission prevention', () => {
    const burningAction = ACTION_CATALOGUE.find((a) => a.id === 'stop_open_waste_burning')!;
    const wasteBurnProfile: HouseholdProfile = {
      adultsCount: 3,
      childrenCount: 1,
      elderlyCount: 0,
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
      hasGardenOrOpenWasteBurning: true, // Burns leaf piles
      windowSealingQuality: 'average',
    };

    const result = calculateActionImpact(burningAction, wasteBurnProfile, { currentPm25: 180 });

    expect(result.applicable).toBe(true);
    // 3 kg leaf pile * 25 g PM2.5/kg = 75 g PM2.5 prevented
    expect(result.emissionReduction.pm25SavedGrams).toBe(75.0);
    // 3 kg * 1250 g CO2/kg = 3750 g CO2 prevented
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
      cookingFuel: 'biomass', // Traditional wood/dung chulha
      heatingFuel: 'none',
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'poor',
    };

    const result = calculateActionImpact(inductionAction, biomassProfile, { currentPm25: 120 });

    expect(result.applicable).toBe(true);
    expect(result.emissionReduction.pm25SavedGrams).toBe(34.0); // 34 g PM2.5 daily
    expect(result.emissionReduction.co2SavedGrams).toBe(6000.0); // 6 kg CO2 daily
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(350.0);
  });
});

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

    // Clean air context
    const summary = calculateHouseholdImpact(cleanAirProfile, { currentPm25: 5.0 });

    // Inhaled dose avoided from outdoor ambient air will be very low but non-negative
    const n95 = summary.actions.find((a) => a.actionId === 'wear_n95_mask_outside')!;
    expect(n95.applicable).toBe(true);
    expect(n95.exposureReduction.pm25ConcentrationReductionUgM3).toBe(4.3); // 5 * 0.85
    expect(n95.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThanOrEqual(0);

    // Source emission reductions (e.g. car to metro) remain fully positive regardless of ambient air
    const metro = summary.actions.find((a) => a.actionId === 'swap_car_for_metro')!;
    expect(metro.applicable).toBe(true);
    expect(metro.emissionReduction.co2SavedGrams).toBeGreaterThan(0);
    expect(metro.emissionReduction.pm25SavedGrams).toBeGreaterThan(0);

    // No NaN, null or infinite values anywhere in summary
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
      cookingFuel: 'biomass', // Burns biomass
      heatingFuel: 'biomass', // Burns biomass heating
      hasGardenOrOpenWasteBurning: true, // Burns garden waste
      windowSealingQuality: 'poor',
    };

    const summary = calculateHouseholdImpact(richProfile, { currentPm25: 250 });

    expect(summary.topActionsByExposure.length).toBe(3);
    expect(summary.topActionsByEmissions.length).toBe(3);

    // First exposure action should have highest dose avoided
    expect(
      summary.topActionsByExposure[0].exposureReduction.pm25InhaledDoseAvoidedUg
    ).toBeGreaterThanOrEqual(
      summary.topActionsByExposure[1].exposureReduction.pm25InhaledDoseAvoidedUg
    );

    // First emission action should have highest PM2.5 or CO2 saved
    expect(
      summary.topActionsByEmissions[0].emissionReduction.pm25SavedGrams
    ).toBeGreaterThanOrEqual(
      summary.topActionsByEmissions[1].emissionReduction.pm25SavedGrams
    );
  });
});

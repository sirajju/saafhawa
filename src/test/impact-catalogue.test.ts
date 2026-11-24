import { describe, it, expect } from 'vitest';
import {
  ACTION_CATALOGUE,
  calculateActionImpact,
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
    commutersCount: 1,
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
    expect(result.exposureReduction.pm25ConcentrationReductionUgM3).toBe(170.0);
    expect(result.exposureReduction.percentageDrop).toBe(85.0);
    expect(result.exposureReduction.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
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
        { dateTime: '2026-11-23T08:00:00Z', pm25: { value: 280, units: 'MICROGRAMS_PER_CUBIC_METER' } },
        { dateTime: '2026-11-23T14:00:00Z', pm25: { value: 100, units: 'MICROGRAMS_PER_CUBIC_METER' } },
      ],
    };

    const result = calculateActionImpact(exerciseAction, baseProfile, smogWithForecast);

    expect(result.applicable).toBe(true);
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

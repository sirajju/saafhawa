import { INHALATION_RATES_M3_PER_HOUR } from './exposure-factors';
import { VEHICULAR_EMISSION_FACTORS } from './emission-factors';
import { type HouseholdProfile } from './types';
import { type ActionImpactEvaluation } from './routine-types';

export { evaluateCarpool, evaluateWfh } from './commute-wfh';

export function notApplicable(reasonIfNotApplicable: string): ActionImpactEvaluation {
  return {
    applicable: false,
    reasonIfNotApplicable,
    concentrationReduction: 0,
    doseAvoidedUg: 0,
    percentageDrop: 0,
    pm25SavedGrams: 0,
    co2SavedGrams: 0,
  };
}

export function commuteHours(distanceKm: number): number {
  return Math.max(
    0.25,
    Math.min(3.0, distanceKm / VEHICULAR_EMISSION_FACTORS.URBAN_COMMUTE_AVERAGE_SPEED_KM_PER_HOUR)
  );
}

export function getCarFactors(mode: HouseholdProfile['primaryCommuteMode']) {
  const isDiesel = mode === 'diesel_car';
  return {
    pm25: isDiesel
      ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
      : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM,
    co2: isDiesel
      ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
      : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM,
  };
}

export function evaluateSwapCarForMetro(
  profile: HouseholdProfile,
  currentPm25: number | null
): ActionImpactEvaluation {
  const commuters = profile.commutersCount ?? Math.min(profile.adultsCount, 1);
  const distanceKm = profile.dailyCommuteDistanceKm;
  const isCar =
    profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car';
  if (!isCar || distanceKm <= 0 || commuters <= 0) {
    return notApplicable(
      !isCar ? 'Household does not commute by personal car' : 'Household has no daily commute'
    );
  }
  const car = getCarFactors(profile.primaryCommuteMode);
  const pm25Saved =
    distanceKm * (car.pm25 - VEHICULAR_EMISSION_FACTORS.METRO_PM25_G_PER_PASSENGER_KM);
  const co2Saved = distanceKm * (car.co2 - VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM);

  if (currentPm25 === null) {
    return {
      applicable: true,
      concentrationReduction: null,
      doseAvoidedUg: null,
      percentageDrop: null,
      isUnknown: true,
      pm25SavedGrams: pm25Saved,
      co2SavedGrams: co2Saved,
      methodologyNotes: `Replaces ${distanceKm} km car commute with metro; exposure unknown without PM2.5 data.`,
    };
  }
  const deltaRatio =
    VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO -
    VEHICULAR_EMISSION_FACTORS.METRO_IN_TRANSIT_EXPOSURE_RATIO;
  const conc = currentPm25 * deltaRatio;
  const hours = commuteHours(distanceKm);
  const transitVolume = commuters * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * hours;
  return {
    applicable: true,
    concentrationReduction: conc,
    doseAvoidedUg: conc * transitVolume,
    percentageDrop:
      currentPm25 > 0
        ? (deltaRatio / VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO) * 100
        : 0,
    pm25SavedGrams: pm25Saved,
    co2SavedGrams: co2Saved,
    methodologyNotes: `Replaces ${distanceKm} km car driving with electric metro rail, saving tailpipe and brake emissions for ${commuters} commuter(s).`,
  };
}

export function evaluateSwapTwoWheeler(
  profile: HouseholdProfile,
  currentPm25: number | null
): ActionImpactEvaluation {
  const commuters = profile.commutersCount ?? Math.min(profile.adultsCount, 1);
  const distanceKm = profile.dailyCommuteDistanceKm;
  if (profile.primaryCommuteMode !== 'two_wheeler' || distanceKm <= 0 || commuters <= 0) {
    return notApplicable(
      profile.primaryCommuteMode !== 'two_wheeler'
        ? 'Household does not commute by motorcycle or scooter'
        : 'Household has no daily commute'
    );
  }
  const pm25Saved =
    distanceKm *
    (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM -
      VEHICULAR_EMISSION_FACTORS.METRO_PM25_G_PER_PASSENGER_KM);
  const co2Saved =
    distanceKm *
    (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM -
      VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM);

  if (currentPm25 === null) {
    return {
      applicable: true,
      concentrationReduction: null,
      doseAvoidedUg: null,
      percentageDrop: null,
      isUnknown: true,
      pm25SavedGrams: pm25Saved,
      co2SavedGrams: co2Saved,
      methodologyNotes: `Replaces ${distanceKm} km two-wheeler commute; exposure unknown without PM2.5 data.`,
    };
  }
  const deltaRatio =
    VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO -
    VEHICULAR_EMISSION_FACTORS.METRO_IN_TRANSIT_EXPOSURE_RATIO;
  const conc = currentPm25 * deltaRatio;
  const hours = commuteHours(distanceKm);
  const transitVolume = commuters * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * hours;
  return {
    applicable: true,
    concentrationReduction: conc,
    doseAvoidedUg: conc * transitVolume,
    percentageDrop:
      currentPm25 > 0
        ? (deltaRatio / VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO) * 100
        : 0,
    pm25SavedGrams: pm25Saved,
    co2SavedGrams: co2Saved,
    methodologyNotes:
      'Eliminates dangerous direct on-road tailpipe exhaust inhalation experienced by 2-wheeler riders.',
  };
}

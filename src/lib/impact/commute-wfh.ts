import {
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './exposure-factors';
import { VEHICULAR_EMISSION_FACTORS } from './emission-factors';
import { type HouseholdProfile } from './types';
import { type ActionImpactEvaluation } from './routine-types';
import { notApplicable, commuteHours, getCarFactors } from './commute-mode-helpers';

export function evaluateCarpool(profile: HouseholdProfile): ActionImpactEvaluation {
  const commuters = profile.commutersCount ?? Math.min(profile.adultsCount, 1);
  const distanceKm = profile.dailyCommuteDistanceKm;
  const isCar =
    profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car';
  if (!isCar || !profile.hasCarpoolOption || distanceKm <= 0 || commuters <= 0) {
    return notApplicable(
      !isCar
        ? 'Household does not commute by personal car'
        : 'Household indicates no carpool option available'
    );
  }
  const car = getCarFactors(profile.primaryCommuteMode);
  return {
    applicable: true,
    concentrationReduction: 0,
    doseAvoidedUg: 0,
    percentageDrop: 0,
    pm25SavedGrams: 0.5 * distanceKm * car.pm25,
    co2SavedGrams: 0.5 * distanceKm * car.co2,
    methodologyNotes: 'Halves personal commute trips by sharing a 2-person carpool.',
  };
}

export function evaluateWfh(
  profile: HouseholdProfile,
  currentPm25: number | null
): ActionImpactEvaluation {
  const commuters = profile.commutersCount ?? Math.min(profile.adultsCount, 1);
  const distanceKm = profile.dailyCommuteDistanceKm;
  if (
    !profile.canWorkFromHome ||
    profile.primaryCommuteMode === 'none' ||
    distanceKm <= 0 ||
    commuters <= 0
  ) {
    return notApplicable(
      !profile.canWorkFromHome
        ? 'Work from home is not feasible for household members'
        : 'Household has no regular vehicular commute'
    );
  }
  let pm25Saved = 0;
  let co2Saved = 0;
  if (profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car') {
    const car = getCarFactors(profile.primaryCommuteMode);
    pm25Saved = distanceKm * car.pm25;
    co2Saved = distanceKm * car.co2;
  } else if (profile.primaryCommuteMode === 'two_wheeler') {
    pm25Saved = distanceKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM;
    co2Saved = distanceKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM;
  }

  if (currentPm25 === null) {
    return {
      applicable: true,
      concentrationReduction: null,
      doseAvoidedUg: null,
      percentageDrop: null,
      isUnknown: true,
      pm25SavedGrams: pm25Saved,
      co2SavedGrams: co2Saved,
      methodologyNotes: `Eliminates ${distanceKm} km commute emissions; exposure avoided unknown without PM2.5 data.`,
    };
  }

  const inTransitRatio =
    profile.primaryCommuteMode === 'two_wheeler'
      ? VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO
      : VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO;
  const homeIndoorRatio = FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
  const deltaRatio = Math.max(0.1, inTransitRatio - homeIndoorRatio);
  const conc = currentPm25 * deltaRatio;
  const hours = commuteHours(distanceKm);
  const transitVolume = commuters * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * hours;
  const dose = conc * transitVolume;
  const pct = inTransitRatio > 0 && currentPm25 > 0 ? (deltaRatio / inTransitRatio) * 100 : 0;

  return {
    applicable: true,
    concentrationReduction: conc,
    doseAvoidedUg: dose,
    percentageDrop: pct,
    pm25SavedGrams: pm25Saved,
    co2SavedGrams: co2Saved,
    methodologyNotes: `Completely eliminates round-trip vehicular commute emissions and roadway traffic exposure for ${commuters} commuter(s).`,
  };
}

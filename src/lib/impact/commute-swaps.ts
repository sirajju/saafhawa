import { ActionDefinition } from './catalogue';
import {
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
  VEHICULAR_EMISSION_FACTORS,
} from './factors';
import { HouseholdProfile } from './types';
import { ActionImpactEvaluation } from './routine-impact';

export function evaluateCommuteSwapsImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number
): ActionImpactEvaluation | null {
  let applicable = true;
  let reasonIfNotApplicable: string | undefined;
  let concentrationReduction = 0;
  let doseAvoidedUg = 0;
  let percentageDrop = 0;
  let pm25SavedGrams = 0;
  let co2SavedGrams = 0;
  let methodologyNotes: string | undefined;

  switch (action.id) {
    case 'swap_car_for_metro': {
      const isCar =
        profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car';
      if (!isCar || profile.dailyCommuteDistanceKm <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not commute by personal car';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;
        const carPm25Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM;

        const carCo2Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;

        pm25SavedGrams =
          distanceKm * (carPm25Factor - VEHICULAR_EMISSION_FACTORS.METRO_PM25_G_PER_PASSENGER_KM);
        co2SavedGrams =
          distanceKm * (carCo2Factor - VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM);

        concentrationReduction =
          currentPm25 *
          (VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO -
            VEHICULAR_EMISSION_FACTORS.METRO_IN_TRANSIT_EXPOSURE_RATIO);
        const transitVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * 1.0;
        doseAvoidedUg = Math.max(0, concentrationReduction * transitVolume);
        percentageDrop = 33.3;
        methodologyNotes = `Replaces ${distanceKm} km of car driving with electric metro rail, saving tailpipe and brake emissions.`;
      }
      break;
    }

    case 'swap_two_wheeler_for_metro_or_bus': {
      if (
        profile.primaryCommuteMode !== 'two_wheeler' ||
        profile.dailyCommuteDistanceKm <= 0
      ) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not commute by motorcycle or scooter';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;
        pm25SavedGrams =
          distanceKm *
          (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM -
            VEHICULAR_EMISSION_FACTORS.METRO_PM25_G_PER_PASSENGER_KM);
        co2SavedGrams =
          distanceKm *
          (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM -
            VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM);

        concentrationReduction =
          currentPm25 *
          (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO -
            VEHICULAR_EMISSION_FACTORS.METRO_IN_TRANSIT_EXPOSURE_RATIO);
        const transitVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * 1.0;
        doseAvoidedUg = concentrationReduction * transitVolume;
        percentageDrop = 76.0;
        methodologyNotes = 'Eliminates dangerous direct on-road tailpipe exhaust inhalation experienced by 2-wheeler riders.';
      }
      break;
    }

    case 'carpool_to_work': {
      const isCar =
        profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car';
      if (!isCar || !profile.hasCarpoolOption || profile.dailyCommuteDistanceKm <= 0) {
        applicable = false;
        reasonIfNotApplicable = isCar
          ? 'Household profile indicates no carpool option available'
          : 'Household does not commute by personal car';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;
        const carPm25Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM;

        const carCo2Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;

        pm25SavedGrams = 0.5 * distanceKm * carPm25Factor;
        co2SavedGrams = 0.5 * distanceKm * carCo2Factor;
        concentrationReduction = 0;
        doseAvoidedUg = 0;
        percentageDrop = 0;
        methodologyNotes = 'Halves personal commute trips by sharing a 2-person carpool.';
      }
      break;
    }

    case 'work_from_home_on_smog_days': {
      if (
        !profile.canWorkFromHome ||
        profile.primaryCommuteMode === 'none' ||
        profile.dailyCommuteDistanceKm <= 0
      ) {
        applicable = false;
        reasonIfNotApplicable = !profile.canWorkFromHome
          ? 'Work from home is not feasible for household members'
          : 'Household has no regular vehicular commute';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;

        if (profile.primaryCommuteMode === 'petrol_car') {
          pm25SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM;
          co2SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;
        } else if (profile.primaryCommuteMode === 'diesel_car') {
          pm25SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM;
          co2SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM;
        } else if (profile.primaryCommuteMode === 'two_wheeler') {
          pm25SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM;
          co2SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM;
        }

        const inTransitRatio =
          profile.primaryCommuteMode === 'two_wheeler'
            ? VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO
            : VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO;

        concentrationReduction =
          currentPm25 *
          (inTransitRatio -
            FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO);

        const commuterVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * 1.0;
        doseAvoidedUg = Math.max(0, concentrationReduction * commuterVolume);
        percentageDrop = inTransitRatio > 0 ? (concentrationReduction / (currentPm25 * inTransitRatio)) * 100 : 0;
        methodologyNotes = 'Completely eliminates round-trip vehicular commute emissions and roadway transit exposure.';
      }
      break;
    }

    default:
      return null;
  }

  return {
    applicable,
    reasonIfNotApplicable,
    concentrationReduction,
    doseAvoidedUg,
    percentageDrop,
    pm25SavedGrams,
    co2SavedGrams,
    methodologyNotes,
  };
}

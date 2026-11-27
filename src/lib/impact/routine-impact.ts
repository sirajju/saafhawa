import { ActionDefinition } from './catalogue';
import {
  EQUIVALENCY_FACTORS,
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './exposure-factors';
import { VEHICULAR_EMISSION_FACTORS } from './emission-factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { evaluateRoutineOutdoorAction } from './routine-outdoor';
import { ActionImpactEvaluation } from './routine-types';

export type { ActionImpactEvaluation } from './routine-types';

export function evaluateRoutineImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null,
  peakPm25: number | null,
  cleanestPm25: number | null
): ActionImpactEvaluation | null {
  const outdoorResult = evaluateRoutineOutdoorAction(action, profile, currentPm25, peakPm25, cleanestPm25);
  if (outdoorResult !== null) return outdoorResult;

  switch (action.id) {
    case 'seal_windows_during_peak_inversion': {
      if (currentPm25 === null) {
        return {
          applicable: true,
          concentrationReduction: null,
          doseAvoidedUg: null,
          percentageDrop: null,
          isUnknown: true,
          pm25SavedGrams: 0,
          co2SavedGrams: 0,
          methodologyNotes: 'Impact unknown: local ambient PM2.5 measurement is missing.',
        };
      }
      const deltaInfil =
        FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO -
        FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      const conc = currentPm25 * deltaInfil;
      const vol = calculateInhaledAirVolumeM3(profile, 'resting', 8);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol,
        percentageDrop: (deltaInfil / FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO) * 100,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Reduces indoor infiltration from 80% to 50% during 8 hours of overnight thermal inversion.',
      };
    }

    case 'wet_mop_instead_of_dry_sweeping': {
      const conc = FILTRATION_AND_INFILTRATION_FACTORS.WET_MOPPING_AVOIDED_RESUSPENSION_UG_M3;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', FILTRATION_AND_INFILTRATION_FACTORS.CLEANING_RESUSPENSION_DURATION_HOURS);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol,
        percentageDrop: 85.0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Eliminates ~25 µg/m³ of resuspended fine domestic dust over 3 hours post-cleaning.',
      };
    }

    case 'combine_or_cancel_outdoor_errands': {
      const vol = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * EQUIVALENCY_FACTORS.ERRAND_DURATION_HOURS;
      let pm25Grams = 0;
      let co2Grams = 0;
      const errandDist = EQUIVALENCY_FACTORS.ERRAND_ROUND_TRIP_KM;

      if (profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car') {
        pm25Grams = errandDist * (profile.primaryCommuteMode === 'diesel_car'
          ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
          : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM);
        co2Grams = errandDist * (profile.primaryCommuteMode === 'diesel_car'
          ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
          : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM);
      } else if (profile.primaryCommuteMode === 'two_wheeler') {
        pm25Grams = errandDist * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM;
        co2Grams = errandDist * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM;
      }

      if (currentPm25 === null) {
        return {
          applicable: true,
          concentrationReduction: null,
          doseAvoidedUg: null,
          percentageDrop: null,
          isUnknown: true,
          pm25SavedGrams: pm25Grams,
          co2SavedGrams: co2Grams,
          methodologyNotes: `Avoids ${errandDist} km driving; exposure avoided unknown without PM2.5 data.`,
        };
      }

      return {
        applicable: true,
        concentrationReduction: currentPm25,
        doseAvoidedUg: currentPm25 * vol,
        percentageDrop: currentPm25 > 0 ? 100.0 : 0,
        pm25SavedGrams: pm25Grams,
        co2SavedGrams: co2Grams,
        methodologyNotes: `Avoids ${EQUIVALENCY_FACTORS.ERRAND_DURATION_HOURS * 60} mins transit exposure and ${errandDist} km driving.`,
      };
    }

    case 'keep_vulnerable_out_of_chulha_kitchen': {
      if (profile.cookingFuel !== 'biomass') {
        return { applicable: false, reasonIfNotApplicable: 'Household does not cook using wood or biomass chulha', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
      }
      const hasOther = profile.childrenCount > 0 || profile.elderlyCount > 0 || profile.hasAsthmaOrRespiratoryCondition || profile.adultsCount > 1;
      if (!hasOther) {
        return { applicable: false, reasonIfNotApplicable: 'Single occupant cooks and lives alone', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
      }
      const conc = 180.0;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', 2);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol * 0.6,
        percentageDrop: 60.0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Isolates vulnerable household members from acute 2-hour cooking biomass smoke plumes.',
      };
    }

    default:
      return null;
  }
}

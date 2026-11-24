import { ActionDefinition } from './catalogue';
import { FILTRATION_AND_INFILTRATION_FACTORS, INHALATION_RATES_M3_PER_HOUR, VEHICULAR_EMISSION_FACTORS } from './factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';

export interface ActionImpactEvaluation {
  applicable: boolean;
  reasonIfNotApplicable?: string;
  concentrationReduction: number;
  doseAvoidedUg: number;
  percentageDrop: number;
  pm25SavedGrams: number;
  co2SavedGrams: number;
  methodologyNotes?: string;
}

export function evaluateRoutineImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number,
  peakPm25: number,
  cleanestPm25: number
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
    case 'wear_n95_mask_outside': {
      if (profile.dailyOutdoorHoursPerPerson <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'Household profile reports 0 daily outdoor hours';
      } else {
        const outdoorVolume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          profile.dailyOutdoorHoursPerPerson
        );
        concentrationReduction =
          currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.N95_MASK_REAL_WORLD_EFFICIENCY;
        doseAvoidedUg = concentrationReduction * outdoorVolume;
        percentageDrop = FILTRATION_AND_INFILTRATION_FACTORS.N95_MASK_REAL_WORLD_EFFICIENCY * 100;
        methodologyNotes = 'Based on 85% real-world N95 fitted filtration efficiency over daily outdoor time.';
      }
      break;
    }

    case 'shift_outdoor_exercise_to_cleanest_hour': {
      if (!profile.doesOutdoorExercise || profile.exerciseHoursPerDay <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not participate in outdoor exercise';
      } else {
        const deltaC = Math.max(0, peakPm25 - cleanestPm25);
        const exerciseVolume =
          profile.adultsCount *
          INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE *
          profile.exerciseHoursPerDay;
        concentrationReduction = deltaC;
        doseAvoidedUg = deltaC * exerciseVolume;
        percentageDrop = peakPm25 > 0 ? (deltaC / peakPm25) * 100 : 0;
        methodologyNotes = `Avoids peak diurnal inversion PM2.5 (${peakPm25} µg/m³) during high-ventilation workouts by shifting to cleanest hour (${cleanestPm25} µg/m³).`;
      }
      break;
    }

    case 'seal_windows_during_peak_inversion': {
      const deltaInfiltration =
        FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO -
        FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      concentrationReduction = currentPm25 * deltaInfiltration;
      const restingVolume = calculateInhaledAirVolumeM3(profile, 'resting', 8);
      doseAvoidedUg = concentrationReduction * restingVolume;
      percentageDrop =
        (deltaInfiltration /
          FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO) *
        100;
      methodologyNotes = 'Reduces indoor infiltration from 80% to 50% during 8 hours of overnight thermal inversion.';
      break;
    }

    case 'wet_mop_instead_of_dry_sweeping': {
      concentrationReduction =
        FILTRATION_AND_INFILTRATION_FACTORS.WET_MOPPING_AVOIDED_RESUSPENSION_UG_M3;
      const exposedVolume = calculateInhaledAirVolumeM3(
        profile,
        'light',
        FILTRATION_AND_INFILTRATION_FACTORS.CLEANING_RESUSPENSION_DURATION_HOURS
      );
      doseAvoidedUg = concentrationReduction * exposedVolume;
      percentageDrop = 85.0;
      methodologyNotes = 'Eliminates ~25 µg/m³ of resuspended fine domestic dust over 3 hours post-cleaning.';
      break;
    }

    case 'post_commute_hygiene': {
      if (profile.dailyOutdoorHoursPerPerson <= 0 && profile.primaryCommuteMode === 'none') {
        applicable = false;
        reasonIfNotApplicable = 'Household has no outdoor exposure or commute';
      } else {
        const outdoorVolume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          profile.dailyOutdoorHoursPerPerson
        );
        const baselineOutdoorDose = currentPm25 * outdoorVolume;
        concentrationReduction =
          currentPm25 *
          FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR;
        doseAvoidedUg =
          baselineOutdoorDose *
          FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR;
        percentageDrop =
          FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR * 100;
        methodologyNotes = 'Removes 5% of deposited upper airway and facial particulates after outdoor commutes.';
      }
      break;
    }

    case 'keep_children_indoors_morning_smog': {
      if (profile.childrenCount <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'No children in household profile';
      } else {
        const indoorPm25 =
          peakPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
        concentrationReduction = Math.max(0, peakPm25 - indoorPm25);
        const childAssemblyVolume =
          profile.childrenCount *
          INHALATION_RATES_M3_PER_HOUR.CHILD_DAILY_AVERAGE *
          (action.defaultDurationHours || 1.5);
        doseAvoidedUg = concentrationReduction * childAssemblyVolume;
        percentageDrop = 50.0;
        methodologyNotes = 'Prevents morning assembly and sports exposure during 1.5 hours of peak inversion.';
      }
      break;
    }

    case 'combine_or_cancel_outdoor_errands': {
      const errandDurationHours = 0.75;
      const errandVolume =
        1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * errandDurationHours;
      concentrationReduction = currentPm25;
      doseAvoidedUg = currentPm25 * errandVolume;
      percentageDrop = 100.0;

      if (
        profile.primaryCommuteMode === 'petrol_car' ||
        profile.primaryCommuteMode === 'diesel_car'
      ) {
        const errandDistKm = 5.0;
        pm25SavedGrams =
          errandDistKm *
          (profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM);
        co2SavedGrams =
          errandDistKm *
          (profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM);
      } else if (profile.primaryCommuteMode === 'two_wheeler') {
        const errandDistKm = 5.0;
        pm25SavedGrams = errandDistKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM;
        co2SavedGrams = errandDistKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM;
      }
      methodologyNotes = 'Avoids 45 minutes of direct transit exposure and 5 km of personal driving.';
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

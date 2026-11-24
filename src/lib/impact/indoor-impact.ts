import { ActionDefinition } from './catalogue';
import {
  FILTRATION_AND_INFILTRATION_FACTORS,
  INCENSE_AND_BURNING_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { ActionImpactEvaluation } from './routine-impact';

export function evaluateIndoorImpact(
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
    case 'run_hepa_air_purifier_bedroom': {
      const baselineIndoor =
        currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      concentrationReduction =
        baselineIndoor *
        FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY;
      const sleepVolume = calculateInhaledAirVolumeM3(
        profile,
        'resting',
        action.defaultDurationHours || 8
      );
      doseAvoidedUg = concentrationReduction * sleepVolume;
      percentageDrop =
        FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY * 100;
      methodologyNotes = 'Achieves 75% steady-state particulate reduction in sleeping quarters over 8 hours.';
      break;
    }

    case 'diy_corsi_rosenthal_box': {
      const baselineIndoor =
        currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      concentrationReduction =
        baselineIndoor * FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_BOX_EFFICIENCY;
      const livingAreaVolume = calculateInhaledAirVolumeM3(
        profile,
        'light',
        action.defaultDurationHours || 8
      );
      doseAvoidedUg = concentrationReduction * livingAreaVolume;
      percentageDrop = FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_BOX_EFFICIENCY * 100;
      methodologyNotes = 'Low-cost 4x MERV-13 box-fan cleaner providing 68% living room filtration over 8 hours.';
      break;
    }

    case 'use_exhaust_fan_cooking': {
      concentrationReduction =
        FILTRATION_AND_INFILTRATION_FACTORS.COOKING_INDOOR_PM25_SPIKE_UG_M3 *
        FILTRATION_AND_INFILTRATION_FACTORS.KITCHEN_EXHAUST_CAPTURE_EFFICIENCY;
      const cookVolume =
        1 *
        INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY *
        FILTRATION_AND_INFILTRATION_FACTORS.COOKING_DAILY_DURATION_HOURS;
      doseAvoidedUg = concentrationReduction * cookVolume;
      percentageDrop =
        FILTRATION_AND_INFILTRATION_FACTORS.KITCHEN_EXHAUST_CAPTURE_EFFICIENCY * 100;
      methodologyNotes = 'Captures 70% of frying and tadka aerosol spikes directly at the cooktop.';
      break;
    }

    case 'ventilate_at_cleanest_afternoon_hour': {
      const deltaAmbient = Math.max(0, peakPm25 - cleanestPm25);
      concentrationReduction = deltaAmbient * 0.40;
      const indoorAfternoonVolume = calculateInhaledAirVolumeM3(profile, 'light', 4);
      doseAvoidedUg = concentrationReduction * indoorAfternoonVolume;
      percentageDrop = peakPm25 > 0 ? (deltaAmbient / peakPm25) * 40 : 0;
      methodologyNotes = 'Airs out CO2 and indoor VOCs during afternoon solar dispersion rather than high-inversion hours.';
      break;
    }

    case 'eliminate_incense_and_mosquito_coils': {
      if (!profile.usesIncenseOrMosquitoCoils) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not use incense sticks or mosquito coils';
      } else {
        concentrationReduction = INCENSE_AND_BURNING_FACTORS.INCENSE_ROOM_PM25_ELEVATION_UG_M3;
        const volume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          INCENSE_AND_BURNING_FACTORS.INCENSE_DAILY_HOURS
        );
        doseAvoidedUg = concentrationReduction * volume;
        percentageDrop = 100.0;
        const sticksPerDay = 2;
        pm25SavedGrams =
          sticksPerDay * INCENSE_AND_BURNING_FACTORS.PM25_PER_INCENSE_STICK_OR_COIL_GRAMS;
        co2SavedGrams =
          sticksPerDay * INCENSE_AND_BURNING_FACTORS.CO2_PER_INCENSE_STICK_OR_COIL_GRAMS;
        methodologyNotes = 'Avoids burning 2 smoldering coils/sticks, eliminating 70 mg of direct PM2.5 emissions.';
      }
      break;
    }

    case 'avoid_non_hepa_vacuuming': {
      concentrationReduction =
        FILTRATION_AND_INFILTRATION_FACTORS.NON_HEPA_VACUUM_RESUSPENSION_UG_M3;
      const volume = calculateInhaledAirVolumeM3(profile, 'light', 2);
      doseAvoidedUg = concentrationReduction * volume;
      percentageDrop = 100.0;
      methodologyNotes = 'Prevents micro-particulate blowback from porous non-HEPA vacuum exhaust filters.';
      break;
    }

    case 'weatherstrip_doors_and_windows': {
      if (profile.windowSealingQuality === 'good') {
        applicable = false;
        reasonIfNotApplicable = 'Household windows and doors are already well sealed';
      } else {
        const deltaInfiltration =
          FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION *
          FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
        concentrationReduction = currentPm25 * deltaInfiltration;
        const dailyIndoorVolume = calculateInhaledAirVolumeM3(profile, 'light', 16);
        doseAvoidedUg = concentrationReduction * dailyIndoorVolume;
        percentageDrop =
          FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION * 100;
        methodologyNotes = 'Reduces continuous exterior ambient smog leakage through gaps by 30%.';
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

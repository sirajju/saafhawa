import { type ActionDefinition } from './catalogue';
import {
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './exposure-factors';
import { type HouseholdProfile } from './types';
import { type ActionImpactEvaluation } from './routine-types';

export function evaluateSeniorExerciseAction(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null,
  peakPm25: number | null,
  cleanestPm25: number | null
): ActionImpactEvaluation | null {
  if (action.id === 'shift_outdoor_exercise_to_cleanest_hour') {
    if (!profile.doesOutdoorExercise || profile.exerciseHoursPerDay <= 0) {
      return {
        applicable: false,
        reasonIfNotApplicable: 'Household does not participate in outdoor exercise',
        concentrationReduction: 0,
        doseAvoidedUg: 0,
        percentageDrop: 0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
      };
    }
    if (peakPm25 === null || cleanestPm25 === null) {
      return {
        applicable: true,
        concentrationReduction: null,
        doseAvoidedUg: null,
        percentageDrop: null,
        isUnknown: true,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Impact unknown: forecast PM2.5 measurements missing.',
      };
    }
    const deltaC = Math.max(0, peakPm25 - cleanestPm25);
    const vol =
      profile.adultsCount *
      INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE *
      profile.exerciseHoursPerDay;
    return {
      applicable: true,
      concentrationReduction: deltaC,
      doseAvoidedUg: deltaC * vol,
      percentageDrop: peakPm25 > 0 ? (deltaC / peakPm25) * 100 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: `Avoids peak diurnal inversion PM2.5 (${peakPm25} µg/m³) during workouts by shifting to cleanest hour (${cleanestPm25} µg/m³).`,
    };
  }

  if (action.id === 'senior_indoor_morning_walk') {
    if (profile.elderlyCount <= 0) {
      return {
        applicable: false,
        reasonIfNotApplicable: 'No senior members in household profile',
        concentrationReduction: 0,
        doseAvoidedUg: 0,
        percentageDrop: 0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
      };
    }
    if (peakPm25 === null) {
      return {
        applicable: true,
        concentrationReduction: null,
        doseAvoidedUg: null,
        percentageDrop: null,
        isUnknown: true,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Impact unknown: peak PM2.5 measurement is missing.',
      };
    }
    const indoorPm25 =
      peakPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
    const conc = Math.max(0, peakPm25 - indoorPm25);
    const vol =
      profile.elderlyCount *
      INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY *
      (action.defaultDurationHours || 1);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: peakPm25 > 0 ? 50.0 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes:
        'Shifts senior morning walk from peak ground-level inversion to indoor or clean window.',
    };
  }

  if (action.id === 'seniors_avoid_strenuous_outdoor') {
    if (profile.elderlyCount <= 0) {
      return {
        applicable: false,
        reasonIfNotApplicable: 'No senior members in household profile',
        concentrationReduction: 0,
        doseAvoidedUg: 0,
        percentageDrop: 0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
      };
    }
    if (currentPm25 === null) {
      return {
        applicable: true,
        concentrationReduction: null,
        doseAvoidedUg: null,
        percentageDrop: null,
        isUnknown: true,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Impact unknown: ambient PM2.5 measurement is missing.',
      };
    }
    const vol =
      profile.elderlyCount *
      (INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE -
        INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY) *
      1.5;
    return {
      applicable: true,
      concentrationReduction: currentPm25 * 0.4,
      doseAvoidedUg: currentPm25 * vol,
      percentageDrop: 40.0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes:
        'Prevents heavy respiratory ventilation for seniors during high outdoor AQI.',
    };
  }

  return null;
}

import { ActionDefinition } from './catalogue';
import {
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { ActionImpactEvaluation } from './routine-types';

export function evaluateRoutineOutdoorAction(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null,
  peakPm25: number | null,
  cleanestPm25: number | null
): ActionImpactEvaluation | null {
  if (action.id === 'wear_n95_mask_outside') {
    if (profile.dailyOutdoorHoursPerPerson <= 0) {
      return { applicable: false, reasonIfNotApplicable: 'Household profile reports 0 daily outdoor hours', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (currentPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: local ambient PM2.5 measurement is missing.' };
    }
    const vol = calculateInhaledAirVolumeM3(profile, 'light', profile.dailyOutdoorHoursPerPerson);
    const conc = currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.N95_MASK_REAL_WORLD_EFFICIENCY;
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: currentPm25 > 0 ? FILTRATION_AND_INFILTRATION_FACTORS.N95_MASK_REAL_WORLD_EFFICIENCY * 100 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Based on 85% real-world N95 fitted filtration efficiency over daily outdoor time.',
    };
  }

  if (action.id === 'shift_outdoor_exercise_to_cleanest_hour') {
    if (!profile.doesOutdoorExercise || profile.exerciseHoursPerDay <= 0) {
      return { applicable: false, reasonIfNotApplicable: 'Household does not participate in outdoor exercise', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (peakPm25 === null || cleanestPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: forecast PM2.5 measurements missing.' };
    }
    const deltaC = Math.max(0, peakPm25 - cleanestPm25);
    const vol = profile.adultsCount * INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE * profile.exerciseHoursPerDay;
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

  if (action.id === 'post_commute_hygiene') {
    if (profile.dailyOutdoorHoursPerPerson <= 0 && profile.primaryCommuteMode === 'none') {
      return { applicable: false, reasonIfNotApplicable: 'Household has no outdoor exposure or commute', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (currentPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: local ambient PM2.5 measurement is missing.' };
    }
    const vol = calculateInhaledAirVolumeM3(profile, 'light', profile.dailyOutdoorHoursPerPerson);
    const conc = currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR;
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: currentPm25 * vol * FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR,
      percentageDrop: currentPm25 > 0 ? FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR * 100 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Removes 5% of deposited upper airway and facial particulates after outdoor commutes.',
    };
  }

  if (action.id === 'keep_children_indoors_morning_smog') {
    if (profile.childrenCount <= 0) {
      return { applicable: false, reasonIfNotApplicable: 'No children in household profile', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (peakPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: peak PM2.5 measurement is missing.' };
    }
    const indoorPm25 = peakPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
    const conc = Math.max(0, peakPm25 - indoorPm25);
    const vol = profile.childrenCount * INHALATION_RATES_M3_PER_HOUR.CHILD_DAILY_AVERAGE * (action.defaultDurationHours || 1.5);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: peakPm25 > 0 ? 50.0 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Prevents morning assembly and sports exposure during 1.5 hours of peak inversion.',
    };
  }

  if (action.id === 'senior_indoor_morning_walk') {
    if (profile.elderlyCount <= 0) {
      return { applicable: false, reasonIfNotApplicable: 'No senior members in household profile', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (peakPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: peak PM2.5 measurement is missing.' };
    }
    const indoorPm25 = peakPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
    const conc = Math.max(0, peakPm25 - indoorPm25);
    const vol = profile.elderlyCount * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * (action.defaultDurationHours || 1);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: peakPm25 > 0 ? 50.0 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Shifts senior morning walk from peak ground-level inversion to indoor or clean window.',
    };
  }

  if (action.id === 'seniors_avoid_strenuous_outdoor') {
    if (profile.elderlyCount <= 0) {
      return { applicable: false, reasonIfNotApplicable: 'No senior members in household profile', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (currentPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: ambient PM2.5 measurement is missing.' };
    }
    const vol = profile.elderlyCount * (INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE - INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY) * 1.5;
    return {
      applicable: true,
      concentrationReduction: currentPm25 * 0.4,
      doseAvoidedUg: currentPm25 * vol,
      percentageDrop: 40.0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Prevents heavy respiratory ventilation for seniors during high outdoor AQI.',
    };
  }

  return null;
}

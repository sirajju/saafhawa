import {
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './exposure-factors';
import { VEHICULAR_EMISSION_FACTORS } from './emission-factors';
import { ActionImpactResult, HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';

/**
 * Calculates theoretical maximum daily PM2.5 dose the household would inhale under baseline conditions.
 */
export function calculateBaselineDailyHouseholdDoseUg(
  profile: HouseholdProfile,
  currentPm25: number | null
): number | null {
  if (currentPm25 === null) return null;

  const commuters = profile.commutersCount ?? Math.min(profile.adultsCount, 1);
  const commuteHours = Math.max(
    0.25,
    Math.min(3.0, profile.dailyCommuteDistanceKm / VEHICULAR_EMISSION_FACTORS.URBAN_COMMUTE_AVERAGE_SPEED_KM_PER_HOUR)
  );

  const transitRatio =
    profile.primaryCommuteMode === 'two_wheeler'
      ? VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO
      : profile.primaryCommuteMode === 'none'
      ? 0.50
      : VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO;

  const commuteDose = commuters > 0
    ? commuters * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * commuteHours * (currentPm25 * transitRatio)
    : 0;

  const outdoorHours = profile.dailyOutdoorHoursPerPerson;
  const outdoorVol = calculateInhaledAirVolumeM3(profile, 'light', outdoorHours);
  const outdoorDose = outdoorVol * currentPm25;

  const indoorHours = Math.max(0, 24 - outdoorHours - (commuters > 0 ? commuteHours : 0));
  const infilRatio =
    profile.windowSealingQuality === 'poor'
      ? FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO
      : FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
  const indoorVol = calculateInhaledAirVolumeM3(profile, 'light', indoorHours);
  const indoorDose = indoorVol * (currentPm25 * infilRatio);

  return Number((commuteDose + outdoorDose + indoorDose).toFixed(1));
}

/**
 * Applies overlapping actions in sequence to what is left and caps total at daily baseline inhaled dose.
 */
export function calculateDeduplicatedTotals(
  applicableActions: ActionImpactResult[],
  profile: HouseholdProfile,
  currentPm25: number | null
): {
  totalPm25InhaledDoseAvoidedUg: number | null;
  totalPm25EmissionsSavedGrams: number;
  totalCo2EmissionsSavedGrams: number;
  isExposureUnknown?: boolean;
} {
  let remainingIndoorFrac = 1.0;
  let remainingCommuteFrac = 1.0;

  let totalDose = 0;
  let hasUnknownExposure = false;
  let totalPm25Grams = 0;
  let totalCo2Grams = 0;

  const commuteOrder = ['work_from_home_on_smog_days', 'swap_car_for_metro', 'swap_two_wheeler_for_metro_or_bus', 'carpool_to_work'];
  const indoorOrder = ['weatherstrip_doors_and_windows', 'seal_windows_during_peak_inversion', 'run_hepa_air_purifier_bedroom', 'diy_corsi_rosenthal_box'];

  const ACTION_EVALUATION_PRIORITY: Record<string, number> = {
    work_from_home_on_smog_days: 10,
    swap_car_for_metro: 20,
    swap_two_wheeler_for_metro_or_bus: 30,
    carpool_to_work: 40,
    weatherstrip_doors_and_windows: 50,
    seal_windows_during_peak_inversion: 60,
    run_hepa_air_purifier_bedroom: 70,
    diy_corsi_rosenthal_box: 80,
  };

  const sortedActions = [...applicableActions].sort(
    (a, b) => (ACTION_EVALUATION_PRIORITY[a.actionId] ?? 1000) - (ACTION_EVALUATION_PRIORITY[b.actionId] ?? 1000)
  );

  for (const action of sortedActions) {
    let scale = 1.0;

    if (commuteOrder.includes(action.actionId)) {
      scale = remainingCommuteFrac;
      if (action.actionId === 'work_from_home_on_smog_days' || action.actionId === 'swap_car_for_metro' || action.actionId === 'swap_two_wheeler_for_metro_or_bus') {
        remainingCommuteFrac = 0.0;
      } else if (action.actionId === 'carpool_to_work') {
        remainingCommuteFrac *= 0.5;
      }
    } else if (indoorOrder.includes(action.actionId)) {
      scale = remainingIndoorFrac;
      const efficiency = action.actionId === 'run_hepa_air_purifier_bedroom'
        ? FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY
        : action.actionId === 'diy_corsi_rosenthal_box'
        ? FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_BOX_EFFICIENCY
        : FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION;
      remainingIndoorFrac = Math.max(0, remainingIndoorFrac * (1 - efficiency));
    }

    if (action.exposureReduction.isUnknown || action.exposureReduction.pm25InhaledDoseAvoidedUg === null) {
      hasUnknownExposure = true;
    } else {
      totalDose += (action.exposureReduction.pm25InhaledDoseAvoidedUg || 0) * scale;
    }

    totalPm25Grams += action.emissionReduction.pm25SavedGrams * scale;
    totalCo2Grams += action.emissionReduction.co2SavedGrams * scale;
  }

  const baselineCap = calculateBaselineDailyHouseholdDoseUg(profile, currentPm25);

  let finalDose: number | null = Number(totalDose.toFixed(1));
  if (baselineCap !== null) {
    finalDose = Number(Math.min(finalDose, baselineCap).toFixed(1));
  } else if (hasUnknownExposure) {
    finalDose = null;
  }

  return {
    totalPm25InhaledDoseAvoidedUg: finalDose,
    totalPm25EmissionsSavedGrams: Number(totalPm25Grams.toFixed(3)),
    totalCo2EmissionsSavedGrams: Number(totalCo2Grams.toFixed(1)),
    isExposureUnknown: finalDose === null,
  };
}

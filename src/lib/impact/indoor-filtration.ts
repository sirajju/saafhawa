import { ActionDefinition } from './catalogue';
import { FILTRATION_AND_INFILTRATION_FACTORS } from './exposure-factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { ActionImpactEvaluation } from './routine-types';

export function evaluateIndoorFiltrationAction(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null
): ActionImpactEvaluation | null {
  if (action.id === 'run_hepa_air_purifier_bedroom') {
    if (!profile.hasAirPurifier) {
      return { applicable: false, reasonIfNotApplicable: 'Household does not currently own a HEPA air purifier', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (currentPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: local ambient PM2.5 measurement is missing.' };
    }
    const baselineIndoor = currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
    const conc = baselineIndoor * FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY;
    const sleepVolume = calculateInhaledAirVolumeM3(profile, 'resting', action.defaultDurationHours || 8);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * sleepVolume,
      percentageDrop: currentPm25 > 0 ? FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY * 100 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Achieves 75% steady-state particulate reduction in sleeping quarters over 8 hours.',
    };
  }

  if (action.id === 'diy_corsi_rosenthal_box') {
    if (profile.budget === 'zero_cost') {
      return { applicable: false, reasonIfNotApplicable: 'Zero-budget preference; prioritizing free natural ventilation and damp dusting over air cleaner construction', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (currentPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: local ambient PM2.5 measurement is missing.' };
    }
    const baselineIndoor = currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
    const coverageRatio = Math.min(1.0, FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_COVERAGE_SQFT / profile.homeAreaSqFt);
    const effectiveEff = FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_BOX_EFFICIENCY * coverageRatio;
    const conc = baselineIndoor * effectiveEff;
    const livingAreaVolume = calculateInhaledAirVolumeM3(profile, 'light', action.defaultDurationHours || 8);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * livingAreaVolume,
      percentageDrop: currentPm25 > 0 ? effectiveEff * 100 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: `Low-cost box-fan cleaner providing ${(effectiveEff * 100).toFixed(0)}% living room filtration (coverage scaled to ${profile.homeAreaSqFt} sq ft).`,
    };
  }

  if (action.id === 'weatherstrip_doors_and_windows') {
    if (profile.windowSealingQuality === 'good') {
      return { applicable: false, reasonIfNotApplicable: 'Household windows and doors are already well sealed', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (currentPm25 === null) {
      return { applicable: true, concentrationReduction: null, doseAvoidedUg: null, percentageDrop: null, isUnknown: true, pm25SavedGrams: 0, co2SavedGrams: 0, methodologyNotes: 'Impact unknown: local ambient PM2.5 measurement is missing.' };
    }
    const deltaInfil = FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
    const conc = currentPm25 * deltaInfil;
    const vol = calculateInhaledAirVolumeM3(profile, 'light', 16);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: currentPm25 > 0 ? FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION * 100 : 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: 'Reduces continuous exterior ambient smog leakage through gaps by 30%.',
    };
  }

  return null;
}

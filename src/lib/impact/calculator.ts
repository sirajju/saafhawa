import { ACTION_CATALOGUE, ActionDefinition } from './catalogue';
import {
  ActionImpactResult,
  AirQualityContext,
  HouseholdImpactSummary,
  HouseholdProfile,
  HouseholdProfileSchema,
} from './types';
import { extractAirQualityParameters } from './air-volume';
import { evaluateRoutineImpact } from './routine-impact';
import { evaluateIndoorImpact } from './indoor-impact';
import { evaluateSwapsImpact } from './swaps-impact';
import { calculateDeduplicatedTotals } from './deduplication';

export { calculateInhaledAirVolumeM3, extractAirQualityParameters } from './air-volume';
export { calculateBaselineDailyHouseholdDoseUg, calculateDeduplicatedTotals } from './deduplication';

/**
 * Evaluates the impact of a specific action for a household.
 */
export function calculateActionImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  airQuality: AirQualityContext
): ActionImpactResult {
  const { currentPm25, peakPm25, cleanestPm25 } = extractAirQualityParameters(airQuality);

  const evalResult =
    evaluateRoutineImpact(action, profile, currentPm25, peakPm25, cleanestPm25) ??
    evaluateIndoorImpact(action, profile, currentPm25, peakPm25, cleanestPm25) ??
    evaluateSwapsImpact(action, profile, currentPm25) ?? {
      applicable: false,
      reasonIfNotApplicable: `Unknown action identifier "${action.id}"`,
      concentrationReduction: 0,
      doseAvoidedUg: 0,
      percentageDrop: 0,
      pm25SavedGrams: 0,
      co2SavedGrams: 0,
      methodologyNotes: undefined,
    };

  const isUnknown = evalResult.isUnknown || evalResult.doseAvoidedUg === null;

  return {
    actionId: action.id,
    title: action.title,
    description: action.description,
    category: action.category,
    applicable: evalResult.applicable,
    reasonIfNotApplicable: evalResult.reasonIfNotApplicable,
    exposureReduction: {
      pm25ConcentrationReductionUgM3: isUnknown || evalResult.concentrationReduction === null
        ? null
        : Number(Math.max(0, evalResult.concentrationReduction).toFixed(1)),
      pm25InhaledDoseAvoidedUg: isUnknown || evalResult.doseAvoidedUg === null
        ? null
        : Number(Math.max(0, evalResult.doseAvoidedUg).toFixed(1)),
      percentageDrop: isUnknown || evalResult.percentageDrop === null
        ? null
        : Number(Math.min(100, Math.max(0, evalResult.percentageDrop)).toFixed(1)),
      isUnknown,
    },
    emissionReduction: {
      pm25SavedGrams: Number(Math.max(0, evalResult.pm25SavedGrams).toFixed(3)),
      co2SavedGrams: Number(Math.max(0, evalResult.co2SavedGrams).toFixed(1)),
    },
    methodologyNotes: evalResult.methodologyNotes,
  };
}

/**
 * Main calculation entrypoint: evaluates all catalogued actions for a household profile and air quality context.
 * Deduplicates overlapping actions and caps household total at actual daily inhaled dose.
 */
export function calculateHouseholdImpact(
  rawProfile: Partial<HouseholdProfile>,
  airQuality: AirQualityContext,
  customCatalogue: ActionDefinition[] = ACTION_CATALOGUE
): HouseholdImpactSummary {
  const profile = HouseholdProfileSchema.parse(rawProfile);
  const { currentPm25 } = extractAirQualityParameters(airQuality);

  const actionResults = customCatalogue.map((action) =>
    calculateActionImpact(action, profile, airQuality)
  );

  const applicableActions = actionResults.filter((a) => a.applicable);

  const deduped = calculateDeduplicatedTotals(applicableActions, profile, currentPm25);

  const totalCo2EmissionsSavedKg = Number(
    (deduped.totalCo2EmissionsSavedGrams / 1000).toFixed(2)
  );

  const topActionsByExposure = [...applicableActions]
    .sort((a, b) => (b.exposureReduction.pm25InhaledDoseAvoidedUg || 0) - (a.exposureReduction.pm25InhaledDoseAvoidedUg || 0))
    .slice(0, 3);

  const topActionsByEmissions = [...applicableActions]
    .sort((a, b) => {
      if (b.emissionReduction.pm25SavedGrams !== a.emissionReduction.pm25SavedGrams) {
        return b.emissionReduction.pm25SavedGrams - a.emissionReduction.pm25SavedGrams;
      }
      return b.emissionReduction.co2SavedGrams - a.emissionReduction.co2SavedGrams;
    })
    .slice(0, 3);

  return {
    totalApplicableActions: applicableActions.length,
    totalPm25InhaledDoseAvoidedUg: deduped.totalPm25InhaledDoseAvoidedUg,
    isExposureUnknown: deduped.isExposureUnknown,
    totalPm25EmissionsSavedGrams: deduped.totalPm25EmissionsSavedGrams,
    totalCo2EmissionsSavedGrams: deduped.totalCo2EmissionsSavedGrams,
    totalCo2EmissionsSavedKg,
    topActionsByExposure,
    topActionsByEmissions,
    actions: actionResults,
  };
}

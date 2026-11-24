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

export { calculateInhaledAirVolumeM3, extractAirQualityParameters } from './air-volume';

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

  return {
    actionId: action.id,
    title: action.title,
    description: action.description,
    category: action.category,
    applicable: evalResult.applicable,
    reasonIfNotApplicable: evalResult.reasonIfNotApplicable,
    exposureReduction: {
      pm25ConcentrationReductionUgM3: Number(Math.max(0, evalResult.concentrationReduction).toFixed(1)),
      pm25InhaledDoseAvoidedUg: Number(Math.max(0, evalResult.doseAvoidedUg).toFixed(1)),
      percentageDrop: Number(Math.min(100, Math.max(0, evalResult.percentageDrop)).toFixed(1)),
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
 */
export function calculateHouseholdImpact(
  rawProfile: Partial<HouseholdProfile>,
  airQuality: AirQualityContext,
  customCatalogue: ActionDefinition[] = ACTION_CATALOGUE
): HouseholdImpactSummary {
  const profile = HouseholdProfileSchema.parse(rawProfile);

  const actionResults = customCatalogue.map((action) =>
    calculateActionImpact(action, profile, airQuality)
  );

  const applicableActions = actionResults.filter((a) => a.applicable);

  const totalPm25InhaledDoseAvoidedUg = Number(
    applicableActions
      .reduce((acc, curr) => acc + curr.exposureReduction.pm25InhaledDoseAvoidedUg, 0)
      .toFixed(1)
  );

  const totalPm25EmissionsSavedGrams = Number(
    applicableActions
      .reduce((acc, curr) => acc + curr.emissionReduction.pm25SavedGrams, 0)
      .toFixed(3)
  );

  const totalCo2EmissionsSavedGrams = Number(
    applicableActions
      .reduce((acc, curr) => acc + curr.emissionReduction.co2SavedGrams, 0)
      .toFixed(1)
  );

  const totalCo2EmissionsSavedKg = Number(
    (totalCo2EmissionsSavedGrams / 1000).toFixed(2)
  );

  // Top actions ranked by inhaled dose avoided
  const topActionsByExposure = [...applicableActions]
    .sort(
      (a, b) =>
        b.exposureReduction.pm25InhaledDoseAvoidedUg -
        a.exposureReduction.pm25InhaledDoseAvoidedUg
    )
    .slice(0, 3);

  // Top actions ranked by emissions saved (PM2.5 primary, CO2 secondary)
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
    totalPm25InhaledDoseAvoidedUg,
    totalPm25EmissionsSavedGrams,
    totalCo2EmissionsSavedGrams,
    totalCo2EmissionsSavedKg,
    topActionsByExposure,
    topActionsByEmissions,
    actions: actionResults,
  };
}

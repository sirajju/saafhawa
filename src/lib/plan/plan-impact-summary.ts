import { ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { calculateDeduplicatedTotals } from '../impact/deduplication';
import { ActionImpactResult, AirQualityContext } from '../impact/types';
import { generateBasisExplanation } from './basis-generator';
import {
  GeminiSelectedAction,
  PlannedAction,
  PlanRequest,
  PlanSummary,
} from './types';

export function buildPlannedActionsAndSummary(
  selectedActions: GeminiSelectedAction[],
  profile: PlanRequest,
  airQualityAqi: number | null | undefined,
  airQualityContext: AirQualityContext,
  catalogueMap: Map<string, ActionDefinition>,
  cleanestWindowSpan: string,
  isCleanAir: boolean
): { plannedActions: PlannedAction[]; summary: PlanSummary } {
  const actionImpacts: ActionImpactResult[] = [];
  const plannedActions: PlannedAction[] = selectedActions.map((selected) => {
    const actionDef = catalogueMap.get(selected.actionId)!;
    const impact = calculateActionImpact(actionDef, profile, airQualityContext);
    actionImpacts.push(impact);

    const basisExplanation = generateBasisExplanation(actionDef.id, profile, airQualityAqi, cleanestWindowSpan);
    let timeOfDay = selected.suggestedTimeOfDay;
    if (actionDef.id === 'wear_n95_mask_outside' && profile.commutersCount === 0) {
      timeOfDay = 'Any outdoor walks or errands';
    } else if (
      (actionDef.id === 'ventilate_at_cleanest_afternoon_hour' ||
        actionDef.id === 'shift_outdoor_exercise_to_cleanest_hour' ||
        actionDef.id === 'senior_indoor_morning_walk') &&
      (!timeOfDay || timeOfDay.toLowerCase().includes('midday'))
    ) {
      timeOfDay = `Cleanest window (${cleanestWindowSpan})`;
    }

    return {
      actionId: actionDef.id,
      title: actionDef.title,
      description: actionDef.description,
      category: actionDef.category,
      suggestedTimeOfDay: timeOfDay,
      reason: isCleanAir
        ? selected.reason
            .replace(/severe smog/gi, 'outdoor pollution')
            .replace(/ground-level temperature inversion concentrates severe smog outdoors/gi, 'routine respiratory hygiene')
        : selected.reason,
      basisExplanation,
      costRupees: actionDef.costRupees ?? 0,
      costLabel: actionDef.costLabel ?? 'Free (₹0)',
      exposureReduction: impact.exposureReduction,
      emissionReduction: impact.emissionReduction,
      methodologyNotes: impact.methodologyNotes,
    };
  });

  plannedActions.sort((a, b) => ((a.costRupees ?? 0) > 0 ? 1 : 0) - ((b.costRupees ?? 0) > 0 ? 1 : 0));
  const deduped = calculateDeduplicatedTotals(actionImpacts, profile, airQualityContext.currentPm25);

  const summary: PlanSummary = {
    totalActionsCount: plannedActions.length,
    totalPm25InhaledDoseAvoidedUg: deduped.totalPm25InhaledDoseAvoidedUg,
    isExposureUnknown: deduped.isExposureUnknown,
    totalPm25EmissionsSavedGrams: deduped.totalPm25EmissionsSavedGrams,
    totalCo2EmissionsSavedGrams: deduped.totalCo2EmissionsSavedGrams,
    totalCo2EmissionsSavedKg: Number((deduped.totalCo2EmissionsSavedGrams / 1000).toFixed(2)),
  };

  return { plannedActions, summary };
}

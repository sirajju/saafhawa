import { type ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { calculateDeduplicatedTotals } from '../impact/deduplication';
import { type ActionImpactResult, type AirQualityContext } from '../impact/types';
import { generateBasisExplanation } from './basis-generator';
import {
  type GeminiSelectedAction,
  type PlannedAction,
  type PlanRequest,
  type PlanSummary,
} from './types';

export interface PlanImpactInput {
  selectedActions: GeminiSelectedAction[];
  profile: PlanRequest;
  airQualityAqi: number | null | undefined;
  airQualityContext: AirQualityContext;
  catalogueMap: Map<string, ActionDefinition>;
  cleanestWindowSpan: string;
  isCleanAir: boolean;
}

/** Actions whose best time is the day's cleanest forecast window. */
const CLEANEST_WINDOW_ACTIONS = new Set([
  'ventilate_at_cleanest_afternoon_hour',
  'shift_outdoor_exercise_to_cleanest_hour',
  'senior_indoor_morning_walk',
]);

function resolveTimeOfDay(
  actionId: string,
  suggested: string,
  profile: PlanRequest,
  cleanestWindowSpan: string
): string {
  if (actionId === 'wear_n95_mask_outside' && profile.commutersCount === 0) {
    return 'Any outdoor walks or errands';
  }
  if (
    CLEANEST_WINDOW_ACTIONS.has(actionId) &&
    (!suggested || suggested.toLowerCase().includes('midday'))
  ) {
    return `Cleanest window (${cleanestWindowSpan})`;
  }
  return suggested;
}

/** On clean-air days, removes smog wording the model may have used in its reason. */
function adaptReasonToAir(reason: string, isCleanAir: boolean): string {
  if (!isCleanAir) return reason;
  return reason
    .replace(/severe smog/gi, 'outdoor pollution')
    .replace(
      /ground-level temperature inversion concentrates severe smog outdoors/gi,
      'routine respiratory hygiene'
    );
}

function buildPlannedAction(
  selected: GeminiSelectedAction,
  actionDef: ActionDefinition,
  impact: ActionImpactResult,
  input: PlanImpactInput
): PlannedAction {
  return {
    actionId: actionDef.id,
    title: actionDef.title,
    description: actionDef.description,
    category: actionDef.category,
    suggestedTimeOfDay: resolveTimeOfDay(
      actionDef.id,
      selected.suggestedTimeOfDay,
      input.profile,
      input.cleanestWindowSpan
    ),
    reason: adaptReasonToAir(selected.reason, input.isCleanAir),
    basisExplanation: generateBasisExplanation(
      actionDef.id,
      input.profile,
      input.airQualityAqi,
      input.cleanestWindowSpan
    ),
    costRupees: actionDef.costRupees ?? 0,
    costLabel: actionDef.costLabel ?? 'Free (₹0)',
    exposureReduction: impact.exposureReduction,
    emissionReduction: impact.emissionReduction,
    methodologyNotes: impact.methodologyNotes,
  };
}

/**
 * Attaches deterministic impact numbers to each selected action, orders free actions
 * first, and totals the household savings without double counting overlapping actions.
 */
export function buildPlannedActionsAndSummary(input: PlanImpactInput): {
  plannedActions: PlannedAction[];
  summary: PlanSummary;
} {
  const actionImpacts: ActionImpactResult[] = [];
  const plannedActions: PlannedAction[] = input.selectedActions.flatMap((selected) => {
    const actionDef = input.catalogueMap.get(selected.actionId);
    if (!actionDef) return [];
    const impact = calculateActionImpact(actionDef, input.profile, input.airQualityContext);
    actionImpacts.push(impact);
    return [buildPlannedAction(selected, actionDef, impact, input)];
  });

  const isPaid = (action: PlannedAction) => ((action.costRupees ?? 0) > 0 ? 1 : 0);
  plannedActions.sort((a, b) => isPaid(a) - isPaid(b));

  const deduped = calculateDeduplicatedTotals(
    actionImpacts,
    input.profile,
    input.airQualityContext.currentPm25
  );

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

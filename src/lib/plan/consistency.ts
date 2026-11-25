import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { AirQualityContext } from '../impact/types';
import { GeminiSelectedAction, PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';
import {
  WORK_FROM_HOME_ACTION_ID,
  COMMUTE_SWAP_ACTION_IDS,
  isCommuteSwapAction,
  isWorkFromHomeAction,
  isCleanAirContext,
  computeActionBenefit,
  scoreCandidateAction,
} from './consistency-scoring';

export {
  WORK_FROM_HOME_ACTION_ID,
  COMMUTE_SWAP_ACTION_IDS,
  isCommuteSwapAction,
  isWorkFromHomeAction,
  computeActionBenefit,
  scoreCandidateAction,
};

/**
 * Enforces plan consistency:
 * A plan must NEVER contain both "work from home" and a commute swap for the same day.
 */
export function resolvePlanConsistency(
  selectedActions: GeminiSelectedAction[],
  profile: PlanRequest,
  airQualityContext: AirQualityContext
): GeminiSelectedAction[] {
  const hasWfh = selectedActions.some((a) => isWorkFromHomeAction(a.actionId));
  const commuteSwapActions = selectedActions.filter((a) => isCommuteSwapAction(a.actionId));

  if (!hasWfh || commuteSwapActions.length === 0) {
    return selectedActions;
  }

  const catalogueMap = new Map<string, ActionDefinition>(
    ACTION_CATALOGUE.map((a) => [a.id, a])
  );

  const wfhDef = catalogueMap.get(WORK_FROM_HOME_ACTION_ID)!;
  const wfhImpact = calculateActionImpact(wfhDef, profile, airQualityContext);
  const wfhBenefit = computeActionBenefit(wfhImpact);

  let bestCommuteSwap = commuteSwapActions[0];
  let bestCommuteSwapDef = catalogueMap.get(bestCommuteSwap.actionId)!;
  let bestCommuteSwapImpact = calculateActionImpact(bestCommuteSwapDef, profile, airQualityContext);
  let bestCommuteSwapBenefit = computeActionBenefit(bestCommuteSwapImpact);

  for (let i = 1; i < commuteSwapActions.length; i++) {
    const cs = commuteSwapActions[i];
    const csDef = catalogueMap.get(cs.actionId)!;
    const csImpact = calculateActionImpact(csDef, profile, airQualityContext);
    const csBenefit = computeActionBenefit(csImpact);
    if (csBenefit > bestCommuteSwapBenefit) {
      bestCommuteSwap = cs;
      bestCommuteSwapDef = csDef;
      bestCommuteSwapImpact = csImpact;
      bestCommuteSwapBenefit = csBenefit;
    }
  }

  const keepWfh = wfhBenefit >= bestCommuteSwapBenefit;
  const actionIdToKeep = keepWfh ? WORK_FROM_HOME_ACTION_ID : bestCommuteSwap.actionId;
  const actionIdToDrop = keepWfh ? bestCommuteSwap.actionId : WORK_FROM_HOME_ACTION_ID;

  const currentActionIds = new Set(selectedActions.map((a) => a.actionId));
  if (keepWfh) {
    for (const cs of commuteSwapActions) currentActionIds.delete(cs.actionId);
  } else {
    currentActionIds.delete(WORK_FROM_HOME_ACTION_ID);
    for (const cs of commuteSwapActions) {
      if (cs.actionId !== bestCommuteSwap.actionId) currentActionIds.delete(cs.actionId);
    }
  }

  const candidateActions: Array<{ def: ActionDefinition; score: number }> = [];
  const cleanAir = isCleanAirContext(airQualityContext);

  for (const actionDef of ACTION_CATALOGUE) {
    if (actionDef.category === 'sustainable_swaps') continue;
    if (currentActionIds.has(actionDef.id)) continue;
    if (
      cleanAir &&
      (actionDef.id === 'wear_n95_mask_outside' ||
        actionDef.id === 'seal_windows_during_peak_inversion' ||
        actionDef.id === 'keep_children_indoors_morning_smog' ||
        actionDef.id === 'seniors_avoid_strenuous_outdoor' ||
        actionDef.id === 'senior_indoor_morning_walk')
    ) {
      continue;
    }

    const impact = calculateActionImpact(actionDef, profile, airQualityContext);
    if (!impact.applicable) continue;
    if (profile.budget === 'zero_cost' && (actionDef.costRupees ?? 0) > 0) continue;

    const score = scoreCandidateAction(actionDef, profile, impact);
    candidateActions.push({ def: actionDef, score });
  }

  candidateActions.sort((a, b) => b.score - a.score);
  const bestReplacement = candidateActions[0]?.def;

  let replacementInserted = false;
  const result: GeminiSelectedAction[] = [];

  for (const item of selectedActions) {
    if (item.actionId === actionIdToKeep) {
      result.push(item);
    } else if (item.actionId === actionIdToDrop || isCommuteSwapAction(item.actionId)) {
      if (!replacementInserted && bestReplacement) {
        const meta = FALLBACK_METADATA_MAP[bestReplacement.id];
        result.push({
          actionId: bestReplacement.id,
          suggestedTimeOfDay: meta ? meta.getSuggestedTimeOfDay(profile) : 'Throughout the day',
          reason: meta ? meta.generateReason(profile) : bestReplacement.description,
        });
        currentActionIds.add(bestReplacement.id);
        replacementInserted = true;
      }
    } else {
      result.push(item);
    }
  }

  if (!replacementInserted && bestReplacement && !result.some((r) => r.actionId === bestReplacement.id)) {
    const meta = FALLBACK_METADATA_MAP[bestReplacement.id];
    result.push({
      actionId: bestReplacement.id,
      suggestedTimeOfDay: meta ? meta.getSuggestedTimeOfDay(profile) : 'Throughout the day',
      reason: meta ? meta.generateReason(profile) : bestReplacement.description,
    });
  }

  return result;
}

import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { ActionImpactResult, AirQualityContext } from '../impact/types';
import { GeminiSelectedAction, PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';

export const WORK_FROM_HOME_ACTION_ID = 'work_from_home_on_smog_days';
export const COMMUTE_SWAP_ACTION_IDS = new Set([
  'swap_car_for_metro',
  'swap_two_wheeler_for_metro_or_bus',
  'carpool_to_work',
]);

export function isCommuteSwapAction(actionId: string): boolean {
  return COMMUTE_SWAP_ACTION_IDS.has(actionId);
}

export function isWorkFromHomeAction(actionId: string): boolean {
  return actionId === WORK_FROM_HOME_ACTION_ID;
}

/**
 * Computes deterministic composite benefit value to compare conflicting actions.
 * Personal inhaled PM2.5 dose avoided (µg) is weighted for direct personal health protection,
 * combined with source emission savings (PM2.5 grams and CO2 kilograms).
 */
export function computeActionBenefit(impact: ActionImpactResult): number {
  const dose = impact.exposureReduction.pm25InhaledDoseAvoidedUg ?? 0;
  const pm25Grams = impact.emissionReduction.pm25SavedGrams || 0;
  const co2Kg = (impact.emissionReduction.co2SavedGrams || 0) / 1000;

  return dose * 10 + pm25Grams * 100 + co2Kg * 10;
}

export function scoreCandidateAction(
  actionDef: ActionDefinition,
  profile: PlanRequest,
  impact: ActionImpactResult
): number {
  let score = 10;
  const id = actionDef.id;

  if (profile.hasAsthmaOrRespiratoryCondition) {
    if (id === 'wear_n95_mask_outside') score += 50;
    if (id === 'run_hepa_air_purifier_bedroom') score += 40;
    if (id === 'diy_corsi_rosenthal_box') score += 35;
    if (id === 'seal_windows_during_peak_inversion') score += 25;
  }

  if (profile.childrenCount > 0) {
    if (id === 'keep_children_indoors_morning_smog') score += 45;
    if (id === 'wear_n95_mask_outside') score += 20;
  }

  if (profile.usesIncenseOrMosquitoCoils && id === 'eliminate_incense_and_mosquito_coils') {
    score += 40;
  }

  if (profile.hasKitchenChimneyOrExhaust && id === 'use_exhaust_fan_cooking') {
    score += 30;
  }

  score += Math.min(20, (impact.exposureReduction.pm25InhaledDoseAvoidedUg || 0) / 50);
  return score;
}

/**
 * Enforces plan consistency:
 * A plan must NEVER contain both "work from home" and a commute swap (metro, bus, or carpool)
 * for the same day, because they contradict each other.
 *
 * If both are present:
 * 1. Keep the one with the larger benefit.
 * 2. Replace the other with the next best applicable action from a different group
 *    (e.g., 'daily_routine' or 'indoor_air').
 */
export function resolvePlanConsistency(
  selectedActions: GeminiSelectedAction[],
  profile: PlanRequest,
  airQualityContext: AirQualityContext
): GeminiSelectedAction[] {
  const hasWfh = selectedActions.some((a) => isWorkFromHomeAction(a.actionId));
  const commuteSwapActions = selectedActions.filter((a) => isCommuteSwapAction(a.actionId));

  // If no contradiction exists, return selection unchanged
  if (!hasWfh || commuteSwapActions.length === 0) {
    return selectedActions;
  }

  const catalogueMap = new Map<string, ActionDefinition>(
    ACTION_CATALOGUE.map((a) => [a.id, a])
  );

  const wfhDef = catalogueMap.get(WORK_FROM_HOME_ACTION_ID)!;
  const wfhImpact = calculateActionImpact(wfhDef, profile, airQualityContext);
  const wfhBenefit = computeActionBenefit(wfhImpact);

  // Evaluate the best commute swap in the selection
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

  // Filter out the conflicting actions other than the kept one
  const currentActionIds = new Set(selectedActions.map((a) => a.actionId));
  if (keepWfh) {
    // Drop all commute swaps
    for (const cs of commuteSwapActions) {
      currentActionIds.delete(cs.actionId);
    }
  } else {
    // Drop WFH and any other commute swaps except bestCommuteSwap
    currentActionIds.delete(WORK_FROM_HOME_ACTION_ID);
    for (const cs of commuteSwapActions) {
      if (cs.actionId !== bestCommuteSwap.actionId) {
        currentActionIds.delete(cs.actionId);
      }
    }
  }

  // Find candidate actions from a different group (group !== 'sustainable_swaps')
  // that are applicable and not currently in the plan
  const candidateActions: Array<{ def: ActionDefinition; score: number }> = [];

  for (const actionDef of ACTION_CATALOGUE) {
    if (actionDef.category === 'sustainable_swaps') continue;
    if (currentActionIds.has(actionDef.id)) continue;

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
      // other duplicates/contradictions are skipped
    } else {
      result.push(item);
    }
  }

  // If replacement wasn't inserted in-place (e.g. edge case), append it
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

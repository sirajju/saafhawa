import { ACTION_CATALOGUE, type ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { type AirQualityContext } from '../impact/types';
import { type GeminiSelectedAction, type PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';
import {
  WORK_FROM_HOME_ACTION_ID,
  isCommuteSwapAction,
  isWorkFromHomeAction,
  isCleanAirContext,
  computeActionBenefit,
  scoreCandidateAction,
} from './action-scoring';

/** Protective actions that make no sense when the air is already clean. */
const SKIPPED_ON_CLEAN_AIR = new Set([
  'wear_n95_mask_outside',
  'seal_windows_during_peak_inversion',
  'keep_children_indoors_morning_smog',
  'seniors_avoid_strenuous_outdoor',
  'senior_indoor_morning_walk',
]);

const CATALOGUE_BY_ID = new Map<string, ActionDefinition>(ACTION_CATALOGUE.map((a) => [a.id, a]));

function requireAction(actionId: string): ActionDefinition {
  const def = CATALOGUE_BY_ID.get(actionId);
  if (!def) throw new Error(`Unknown catalogue action: ${actionId}`);
  return def;
}

interface ResolutionContext {
  profile: PlanRequest;
  airQualityContext: AirQualityContext;
}

function benefitOf(actionId: string, ctx: ResolutionContext): number {
  const impact = calculateActionImpact(requireAction(actionId), ctx.profile, ctx.airQualityContext);
  return computeActionBenefit(impact);
}

/** The commute swap with the largest benefit; the earliest one wins a tie. */
function pickBestCommuteSwap(
  swaps: GeminiSelectedAction[],
  ctx: ResolutionContext
): { action: GeminiSelectedAction; benefit: number } {
  let best = { action: swaps[0], benefit: benefitOf(swaps[0].actionId, ctx) };
  for (const swap of swaps.slice(1)) {
    const benefit = benefitOf(swap.actionId, ctx);
    if (benefit > best.benefit) best = { action: swap, benefit };
  }
  return best;
}

/** The highest-scoring non-swap action not already in the plan, if any. */
function findBestReplacement(
  excludedIds: Set<string>,
  ctx: ResolutionContext
): ActionDefinition | undefined {
  const cleanAir = isCleanAirContext(ctx.airQualityContext);
  const candidates: Array<{ def: ActionDefinition; score: number }> = [];
  for (const def of ACTION_CATALOGUE) {
    if (def.category === 'sustainable_swaps' || excludedIds.has(def.id)) continue;
    if (cleanAir && SKIPPED_ON_CLEAN_AIR.has(def.id)) continue;
    const impact = calculateActionImpact(def, ctx.profile, ctx.airQualityContext);
    if (!impact.applicable) continue;
    if (ctx.profile.budget === 'zero_cost' && (def.costRupees ?? 0) > 0) continue;
    candidates.push({ def, score: scoreCandidateAction(def, ctx.profile, impact) });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.def;
}

function toSelectedAction(def: ActionDefinition, profile: PlanRequest): GeminiSelectedAction {
  const meta = FALLBACK_METADATA_MAP[def.id];
  return {
    actionId: def.id,
    suggestedTimeOfDay: meta ? meta.getSuggestedTimeOfDay(profile) : 'Throughout the day',
    reason: meta ? meta.generateReason(profile) : def.description,
  };
}

/**
 * Enforces plan consistency:
 * A plan must NEVER contain both "work from home" and a commute swap for the same day.
 * Keeps whichever saves more exposure, drops the rest, and fills the freed slot with the
 * best-scoring replacement action.
 */
export function resolvePlanConsistency(
  selectedActions: GeminiSelectedAction[],
  profile: PlanRequest,
  airQualityContext: AirQualityContext
): GeminiSelectedAction[] {
  const hasWfh = selectedActions.some((a) => isWorkFromHomeAction(a.actionId));
  const commuteSwaps = selectedActions.filter((a) => isCommuteSwapAction(a.actionId));
  if (!hasWfh || commuteSwaps.length === 0) return selectedActions;

  const ctx: ResolutionContext = { profile, airQualityContext };
  const bestSwap = pickBestCommuteSwap(commuteSwaps, ctx);
  const keepWfh = benefitOf(WORK_FROM_HOME_ACTION_ID, ctx) >= bestSwap.benefit;
  const keepId = keepWfh ? WORK_FROM_HOME_ACTION_ID : bestSwap.action.actionId;
  const dropId = keepWfh ? bestSwap.action.actionId : WORK_FROM_HOME_ACTION_ID;

  const remainingIds = new Set(selectedActions.map((a) => a.actionId));
  for (const swap of commuteSwaps) {
    if (keepWfh || swap.actionId !== keepId) remainingIds.delete(swap.actionId);
  }
  if (!keepWfh) remainingIds.delete(WORK_FROM_HOME_ACTION_ID);

  const replacement = findBestReplacement(remainingIds, ctx);
  let replacementInserted = false;
  const result: GeminiSelectedAction[] = [];

  for (const item of selectedActions) {
    const isDropped =
      item.actionId !== keepId && (item.actionId === dropId || isCommuteSwapAction(item.actionId));
    if (!isDropped) {
      result.push(item);
    } else if (!replacementInserted && replacement) {
      result.push(toSelectedAction(replacement, profile));
      replacementInserted = true;
    }
  }

  if (!replacementInserted && replacement && !result.some((r) => r.actionId === replacement.id)) {
    result.push(toSelectedAction(replacement, profile));
  }
  return result;
}

import { ActionDefinition } from './catalogue';
import { HouseholdProfile } from './types';
import { ActionImpactEvaluation } from './routine-types';
import { evaluateCommuteSwapsImpact } from './commute-swaps';
import { evaluateCombustionSwapsImpact } from './combustion-swaps';

export function evaluateSwapsImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null
): ActionImpactEvaluation | null {
  return (
    evaluateCommuteSwapsImpact(action, profile, currentPm25) ??
    evaluateCombustionSwapsImpact(action, profile)
  );
}

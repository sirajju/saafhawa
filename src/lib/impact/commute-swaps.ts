import { type ActionDefinition } from './catalogue';
import { type HouseholdProfile } from './types';
import { type ActionImpactEvaluation } from './routine-types';
import {
  evaluateSwapCarForMetro,
  evaluateSwapTwoWheeler,
  evaluateCarpool,
  evaluateWfh,
} from './commute-mode-helpers';

export function evaluateCommuteSwapsImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null
): ActionImpactEvaluation | null {
  switch (action.id as string) {
    case 'swap_car_for_metro':
      return evaluateSwapCarForMetro(profile, currentPm25);
    case 'swap_two_wheeler_for_metro_or_bus':
      return evaluateSwapTwoWheeler(profile, currentPm25);
    case 'carpool_to_work':
      return evaluateCarpool(profile);
    case 'work_from_home_on_smog_days':
      return evaluateWfh(profile, currentPm25);
    default:
      return null;
  }
}

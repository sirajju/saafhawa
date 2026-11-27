import { type ActionCategory } from './types';
import { getActionCost } from './action-costs';
import { ACTION_IDS, type ActionId } from './action-ids';
import { ROUTINE_ACTIONS_RAW } from './routine-catalogue';
import { INDOOR_AND_SWAPS_ACTIONS_RAW } from './indoor-swaps-catalogue';

export { getActionCost, ACTION_IDS };
export type { ActionId };

export interface ActionDefinition {
  id: ActionId;
  title: string;
  description: string;
  category: ActionCategory;
  defaultDurationHours?: number;
  costRupees?: number;
  costLabel?: string;
}

const RAW_CATALOGUE: Omit<ActionDefinition, 'costRupees' | 'costLabel'>[] = [
  ...ROUTINE_ACTIONS_RAW,
  ...INDOOR_AND_SWAPS_ACTIONS_RAW,
];

export const ACTION_CATALOGUE: ActionDefinition[] = RAW_CATALOGUE.map((item) => {
  const cost = getActionCost(item.id);
  return { ...item, costRupees: cost.costRupees, costLabel: cost.costLabel };
});

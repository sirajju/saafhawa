import { type ActionId } from './action-ids';

export interface ActionCostInfo {
  costRupees: number;
  costLabel: string;
}

export function getActionCost(actionId: ActionId | string): ActionCostInfo {
  switch (actionId) {
    case 'wear_n95_mask_outside':
      return { costRupees: 250, costLabel: 'Approx. ₹250 (pack of certified N95 masks)' };
    case 'weatherstrip_doors_and_windows':
      return { costRupees: 350, costLabel: 'Approx. ₹350 (door sweeps / sealing tape)' };
    case 'diy_corsi_rosenthal_box':
      return { costRupees: 2200, costLabel: 'Approx. ₹2,200 (box fan + MERV-13 filters)' };
    case 'swap_biomass_cookstove_to_induction':
      return { costRupees: 2200, costLabel: 'Approx. ₹2,200 (single-burner induction cooktop)' };
    case 'swap_biomass_or_kerosene_heating_to_electric':
      return { costRupees: 1800, costLabel: 'Approx. ₹1,800 (radiant electric heater)' };
    case 'run_hepa_air_purifier_bedroom':
      return { costRupees: 8500, costLabel: 'Approx. ₹8,500 (HEPA room purifier)' };
    default:
      return { costRupees: 0, costLabel: 'Free (₹0)' };
  }
}

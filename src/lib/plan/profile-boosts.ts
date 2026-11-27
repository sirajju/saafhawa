import { type PlanRequest } from './types';

interface ProfileBoostRule {
  applies: (profile: PlanRequest, isZeroCost: boolean) => boolean;
  boosts: Readonly<Record<string, number>>;
}

/**
 * Household traits that make specific actions more valuable. Every matching rule adds
 * its boost, so a trait shared by several rules (e.g. asthma and children) stacks.
 */
const PROFILE_BOOST_RULES: readonly ProfileBoostRule[] = [
  {
    applies: (p) => p.elderlyCount > 0,
    boosts: {
      senior_indoor_morning_walk: 55,
      seniors_avoid_strenuous_outdoor: 45,
      wear_n95_mask_outside: 20,
    },
  },
  {
    applies: (p) => p.hasAsthmaOrRespiratoryCondition,
    boosts: {
      wear_n95_mask_outside: 50,
      run_hepa_air_purifier_bedroom: 40,
      diy_corsi_rosenthal_box: 35,
      seal_windows_during_peak_inversion: 25,
    },
  },
  {
    applies: (p) => p.childrenCount > 0,
    boosts: { keep_children_indoors_morning_smog: 45, wear_n95_mask_outside: 20 },
  },
  {
    applies: (p) => p.usesIncenseOrMosquitoCoils,
    boosts: { eliminate_incense_and_mosquito_coils: 40 },
  },
  { applies: (p) => p.hasKitchenChimneyOrExhaust, boosts: { use_exhaust_fan_cooking: 30 } },
  {
    applies: (p) => p.primaryCommuteMode === 'petrol_car' || p.primaryCommuteMode === 'diesel_car',
    boosts: { swap_car_for_metro: 25 },
  },
  {
    applies: (p) => p.primaryCommuteMode === 'two_wheeler',
    boosts: { swap_two_wheeler_for_metro_or_bus: 35 },
  },
  { applies: (p) => p.canWorkFromHome, boosts: { work_from_home_on_smog_days: 30 } },
  {
    applies: (p) => p.cookingFuel === 'biomass',
    boosts: {
      cook_with_kitchen_cross_ventilation: 55,
      keep_vulnerable_out_of_chulha_kitchen: 55,
      use_dry_seasoned_chulha_fuel: 50,
    },
  },
  {
    applies: (p, isZeroCost) => p.cookingFuel === 'biomass' && !isZeroCost,
    boosts: { swap_biomass_cookstove_to_induction: 50 },
  },
  { applies: (p) => p.hasGardenOrOpenWasteBurning, boosts: { stop_open_waste_burning: 45 } },
];

export function computeProfileBoosts(
  id: string,
  profile: PlanRequest,
  isZeroCost: boolean
): number {
  return PROFILE_BOOST_RULES.reduce(
    (total, rule) => (rule.applies(profile, isZeroCost) ? total + (rule.boosts[id] ?? 0) : total),
    0
  );
}

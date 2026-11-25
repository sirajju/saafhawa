import { ActionDefinition } from '../impact/catalogue';
import { ActionImpactResult, AirQualityContext } from '../impact/types';
import { GeminiSelectedAction, PlanRequest } from './types';

export const WORK_FROM_HOME_ACTION_ID = 'work_from_home_on_smog_days';
export const COMMUTE_SWAP_ACTION_IDS = new Set(['swap_car_for_metro', 'swap_two_wheeler_for_metro_or_bus', 'carpool_to_work']);
export const SMOG_DEFENSE_ACTION_IDS = new Set([
  'keep_children_indoors_morning_smog',
  'seal_windows_during_peak_inversion',
  'wear_n95_mask_outside',
  'seniors_avoid_strenuous_outdoor',
  'senior_indoor_morning_walk',
]);

export const isCommuteSwapAction = (id: string): boolean => COMMUTE_SWAP_ACTION_IDS.has(id);
export const isWorkFromHomeAction = (id: string): boolean => id === WORK_FROM_HOME_ACTION_ID;

export function isCleanAirContext(ctx?: AirQualityContext): boolean {
  if (!ctx) return false;
  if (typeof ctx.currentPm25 === 'number' && ctx.currentPm25 > 35) return false;
  if (ctx.hourlyForecast?.length) {
    const maxPm25 = Math.max(
      ...ctx.hourlyForecast
        .map((p) => p.pm25?.value)
        .filter((v): v is number => typeof v === 'number')
    );
    if (maxPm25 > 35) return false;
  }
  return true;
}

export function pruneCleanAirActions(
  actions: GeminiSelectedAction[],
  isClean: boolean,
  catalogue: Map<string, ActionDefinition>
): GeminiSelectedAction[] {
  if (!isClean) return actions;
  const filtered = actions.filter((a) => !SMOG_DEFENSE_ACTION_IDS.has(a.actionId));
  const fallbackClean = [
    'ventilate_at_cleanest_afternoon_hour',
    'use_exhaust_fan_cooking',
    'damp_mop_surfaces_daily',
    'eliminate_incense_and_mosquito_coils',
    'stop_open_waste_burning',
    'cook_with_kitchen_cross_ventilation',
  ];
  for (const id of fallbackClean) {
    if (filtered.length >= 6) break;
    if (!filtered.some((a) => a.actionId === id) && catalogue.has(id)) {
      filtered.push({
        actionId: id,
        suggestedTimeOfDay: 'Daytime',
        reason: 'Supports everyday indoor air hygiene and reduces household particulate buildup.',
      });
    }
  }
  return filtered;
}

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

import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { ActionImpactResult } from '../impact/types';
import { AirQualityReport } from '../air-quality/types';
import { GeminiSelectedAction, PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';
import { resolvePlanConsistency } from './conflict-resolver';

interface ActionWithImpact {
  action: ActionDefinition;
  impact: ActionImpactResult;
}

interface ScoredAction extends ActionWithImpact {
  score: number;
}

function checkIsCleanAir(airQuality: AirQualityReport): boolean {
  const aqiNum = airQuality.current.aqi;
  const maxForecast = airQuality.hourlyForecast?.length
    ? Math.max(
        ...airQuality.hourlyForecast
          .filter((p): p is typeof p & { aqi: number } => typeof p.aqi === 'number')
          .map((p) => p.aqi)
      )
    : aqiNum;
  return aqiNum !== null && aqiNum !== undefined && aqiNum <= 100 && maxForecast !== null && maxForecast <= 100;
}

function filterApplicableActions(
  profile: PlanRequest,
  airQuality: AirQualityReport,
  isCleanAir: boolean
): ActionWithImpact[] {
  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };
  const isZeroCost = profile.budget === 'zero_cost';

  return ACTION_CATALOGUE.map((action) => ({
    action,
    impact: calculateActionImpact(action, profile, airQualityContext),
  })).filter((item) => {
    if (!item.impact.applicable) return false;
    if (isCleanAir) {
      const cleanAirExcluded = [
        'wear_n95_mask_outside',
        'seal_windows_during_peak_inversion',
        'keep_children_indoors_morning_smog',
        'seniors_avoid_strenuous_outdoor',
        'senior_indoor_morning_walk',
      ];
      if (cleanAirExcluded.includes(item.action.id)) return false;
    }
    if (isZeroCost && (item.action.costRupees ?? 0) > 0) return false;
    return true;
  });
}

function computeProfileBoosts(id: string, profile: PlanRequest, isZeroCost: boolean): number {
  let boost = 0;
  if (profile.elderlyCount > 0) {
    if (id === 'senior_indoor_morning_walk') boost += 55;
    if (id === 'seniors_avoid_strenuous_outdoor') boost += 45;
    if (id === 'wear_n95_mask_outside') boost += 20;
  }
  if (profile.hasAsthmaOrRespiratoryCondition) {
    if (id === 'wear_n95_mask_outside') boost += 50;
    if (id === 'run_hepa_air_purifier_bedroom') boost += 40;
    if (id === 'diy_corsi_rosenthal_box') boost += 35;
    if (id === 'seal_windows_during_peak_inversion') boost += 25;
  }
  if (profile.childrenCount > 0) {
    if (id === 'keep_children_indoors_morning_smog') boost += 45;
    if (id === 'wear_n95_mask_outside') boost += 20;
  }
  if (profile.usesIncenseOrMosquitoCoils && id === 'eliminate_incense_and_mosquito_coils') boost += 40;
  if (profile.hasKitchenChimneyOrExhaust && id === 'use_exhaust_fan_cooking') boost += 30;
  if ((profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car') && id === 'swap_car_for_metro') boost += 25;
  if (profile.primaryCommuteMode === 'two_wheeler' && id === 'swap_two_wheeler_for_metro_or_bus') boost += 35;
  if (profile.canWorkFromHome && id === 'work_from_home_on_smog_days') boost += 30;
  if (profile.cookingFuel === 'biomass') {
    if (id === 'cook_with_kitchen_cross_ventilation' || id === 'keep_vulnerable_out_of_chulha_kitchen') boost += 55;
    if (id === 'use_dry_seasoned_chulha_fuel') boost += 50;
    if (!isZeroCost && id === 'swap_biomass_cookstove_to_induction') boost += 50;
  }
  if (profile.hasGardenOrOpenWasteBurning && id === 'stop_open_waste_burning') boost += 45;
  return boost;
}

function scoreCandidateActions(applicableActions: ActionWithImpact[], profile: PlanRequest): ScoredAction[] {
  const isZeroCost = profile.budget === 'zero_cost';
  const scored = applicableActions.map((item) => {
    let score = 10;
    score += computeProfileBoosts(item.action.id, profile, isZeroCost);
    if ((item.action.costRupees ?? 0) === 0) score += 15;
    score += Math.min(20, (item.impact.exposureReduction.pm25InhaledDoseAvoidedUg || 0) / 50);
    return { ...item, score };
  });
  return scored.sort((a, b) => b.score - a.score);
}

function selectDiverseActions(scored: ScoredAction[], maxCount = 8): ScoredAction[] {
  const selected: ScoredAction[] = [];
  const categoriesPresent = new Set<string>();

  for (const item of scored) {
    if (!categoriesPresent.has(item.action.category)) {
      selected.push(item);
      categoriesPresent.add(item.action.category);
    }
  }
  for (const item of scored) {
    if (selected.length >= maxCount) break;
    if (!selected.some((s) => s.action.id === item.action.id)) {
      selected.push(item);
    }
  }
  return selected;
}

function mapActionsWithMetadata(
  selected: ScoredAction[],
  profile: PlanRequest,
  cleanestWindowText?: string
): GeminiSelectedAction[] {
  return selected.map((item) => {
    const meta = FALLBACK_METADATA_MAP[item.action.id];
    const timeOfDay = meta ? meta.getSuggestedTimeOfDay(profile, cleanestWindowText) : 'Throughout the day';
    const reason = meta ? meta.generateReason(profile, cleanestWindowText) : item.action.description;
    return {
      actionId: item.action.id,
      suggestedTimeOfDay: timeOfDay,
      reason,
    };
  });
}

/**
 * Fallback selection engine when Gemini is unavailable or returns an invalid output.
 * Selects 6 to 8 highly relevant applicable actions deterministically.
 */
export function getRuleBasedFallbackActions(
  profile: PlanRequest,
  airQuality: AirQualityReport,
  cleanestWindowText?: string
): GeminiSelectedAction[] {
  const isCleanAir = checkIsCleanAir(airQuality);
  const applicable = filterApplicableActions(profile, airQuality, isCleanAir);
  const scored = scoreCandidateActions(applicable, profile);
  const selected = selectDiverseActions(scored);
  const mapped = mapActionsWithMetadata(selected, profile, cleanestWindowText);
  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };
  return resolvePlanConsistency(mapped, profile, airQualityContext);
}

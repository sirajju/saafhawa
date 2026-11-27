import { ACTION_CATALOGUE } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { AirQualityReport } from '../air-quality/types';
import { GeminiSelectedAction, PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';
import { resolvePlanConsistency } from './conflict-resolver';

/**
 * Fallback selection engine when Gemini is unavailable or returns an invalid output.
 * Selects 6 to 8 highly relevant applicable actions deterministically.
 */
export function getRuleBasedFallbackActions(
  profile: PlanRequest,
  airQuality: AirQualityReport,
  cleanestWindowText?: string
): GeminiSelectedAction[] {
  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const aqiNum = airQuality.current.aqi;
  const maxForecast = airQuality.hourlyForecast?.length
    ? Math.max(
        ...airQuality.hourlyForecast
          .filter((p): p is typeof p & { aqi: number } => typeof p.aqi === 'number')
          .map((p) => p.aqi)
      )
    : aqiNum;
  const isCleanAir =
    aqiNum !== null && aqiNum !== undefined && aqiNum <= 100 && maxForecast !== null && maxForecast <= 100;

  const isZeroCost = profile.budget === 'zero_cost';

  const applicableActions = ACTION_CATALOGUE.map((action) => {
    const impact = calculateActionImpact(action, profile, airQualityContext);
    return { action, impact };
  }).filter((item) => {
    if (!item.impact.applicable) return false;
    // When air is clean/satisfactory, do not push masks, sealed windows or outdoor restrictions
    if (isCleanAir) {
      if (
        item.action.id === 'wear_n95_mask_outside' ||
        item.action.id === 'seal_windows_during_peak_inversion' ||
        item.action.id === 'keep_children_indoors_morning_smog' ||
        item.action.id === 'seniors_avoid_strenuous_outdoor' ||
        item.action.id === 'senior_indoor_morning_walk'
      ) {
        return false;
      }
    }
    // Strict zero-cost budget rule: drop anything requiring purchasing equipment
    if (isZeroCost && (item.action.costRupees ?? 0) > 0) return false;
    return true;
  });

  const scored = applicableActions.map((item) => {
    let score = 10;
    const id = item.action.id;

    // Senior-specific priorities
    if (profile.elderlyCount > 0) {
      if (id === 'senior_indoor_morning_walk') score += 55;
      if (id === 'seniors_avoid_strenuous_outdoor') score += 45;
      if (id === 'wear_n95_mask_outside') score += 20;
    }

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

    if (
      (profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car') &&
      id === 'swap_car_for_metro'
    ) {
      score += 25;
    }

    if (profile.primaryCommuteMode === 'two_wheeler' && id === 'swap_two_wheeler_for_metro_or_bus') {
      score += 35;
    }

    if (profile.canWorkFromHome && id === 'work_from_home_on_smog_days') {
      score += 30;
    }

    if (profile.cookingFuel === 'biomass') {
      if (id === 'cook_with_kitchen_cross_ventilation') score += 55;
      if (id === 'keep_vulnerable_out_of_chulha_kitchen') score += 55;
      if (id === 'use_dry_seasoned_chulha_fuel') score += 50;
      if (!isZeroCost && id === 'swap_biomass_cookstove_to_induction') score += 50;
    }

    if (profile.hasGardenOrOpenWasteBurning && id === 'stop_open_waste_burning') {
      score += 45;
    }

    // Always prioritize free actions over paid ones
    if ((item.action.costRupees ?? 0) === 0) {
      score += 15;
    }

    score += Math.min(20, (item.impact.exposureReduction.pm25InhaledDoseAvoidedUg || 0) / 50);

    return { ...item, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: typeof scored = [];
  const categoriesPresent = new Set<string>();

  for (const item of scored) {
    if (!categoriesPresent.has(item.action.category)) {
      selected.push(item);
      categoriesPresent.add(item.action.category);
    }
  }

  for (const item of scored) {
    if (selected.length >= 8) break;
    if (!selected.some((s) => s.action.id === item.action.id)) {
      selected.push(item);
    }
  }

  const mappedActions = selected.map((item) => {
    const meta = FALLBACK_METADATA_MAP[item.action.id];
    const timeOfDay = meta ? meta.getSuggestedTimeOfDay(profile, cleanestWindowText) : 'Throughout the day';
    const reason = meta ? meta.generateReason(profile, cleanestWindowText) : item.action.description;

    return {
      actionId: item.action.id,
      suggestedTimeOfDay: timeOfDay,
      reason,
    };
  });

  return resolvePlanConsistency(mappedActions, profile, airQualityContext);
}

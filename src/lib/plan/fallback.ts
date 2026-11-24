import { ACTION_CATALOGUE } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { AirQualityReport } from '../air-quality/types';
import { GeminiSelectedAction, PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';

/**
 * Fallback selection engine when Gemini is unavailable or returns an invalid output.
 * Selects 6 to 8 highly relevant applicable actions deterministically.
 */
export function getRuleBasedFallbackActions(
  profile: PlanRequest,
  airQuality: AirQualityReport
): GeminiSelectedAction[] {
  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? 100,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const applicableActions = ACTION_CATALOGUE.map((action) => {
    const impact = calculateActionImpact(action, profile, airQualityContext);
    return { action, impact };
  }).filter((item) => item.impact.applicable);

  const scored = applicableActions.map((item) => {
    let score = 10;
    const id = item.action.id;

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

    if (profile.cookingFuel === 'biomass' && id === 'swap_biomass_cookstove_to_induction') {
      score += 50;
    }

    if (profile.hasGardenOrOpenWasteBurning && id === 'stop_open_waste_burning') {
      score += 45;
    }

    score += Math.min(20, item.impact.exposureReduction.pm25InhaledDoseAvoidedUg / 50);

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
    if (selected.length >= 7) break;
    if (!selected.some((s) => s.action.id === item.action.id)) {
      selected.push(item);
    }
  }

  return selected.map((item) => {
    const meta = FALLBACK_METADATA_MAP[item.action.id] || {
      suggestedTimeOfDay: 'Throughout the day',
      generateReason: () => item.action.description,
    };

    return {
      actionId: item.action.id,
      suggestedTimeOfDay: meta.suggestedTimeOfDay,
      reason: meta.generateReason(profile),
    };
  });
}

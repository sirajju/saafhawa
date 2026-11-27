import { ACTION_CATALOGUE, type ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { type ActionImpactResult } from '../impact/types';
import { type AirQualityReport } from '../air-quality/types';
import { type GeminiSelectedAction, type PlanRequest } from './types';
import { FALLBACK_METADATA_MAP } from './metadata';
import { resolvePlanConsistency } from './conflict-resolver';
import { computeProfileBoosts } from './profile-boosts';

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
  return (
    aqiNum !== null &&
    aqiNum !== undefined &&
    aqiNum <= 100 &&
    maxForecast !== null &&
    maxForecast <= 100
  );
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

function scoreCandidateActions(
  applicableActions: ActionWithImpact[],
  profile: PlanRequest
): ScoredAction[] {
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
    const timeOfDay = meta
      ? meta.getSuggestedTimeOfDay(profile, cleanestWindowText)
      : 'Throughout the day';
    const reason = meta
      ? meta.generateReason(profile, cleanestWindowText)
      : item.action.description;
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

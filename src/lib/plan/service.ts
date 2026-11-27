import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { buildPlanPrompt } from './prompt-builder';
import { getRuleBasedFallbackActions } from './fallback';
import { defaultGeminiGenerator } from './plan-generator';
import { resolvePlanConsistency } from './conflict-resolver';
import { pruneCleanAirActions } from './action-scoring';
import { buildPlannedActionsAndSummary } from './plan-impact-summary';
import { buildForecastAdvice } from '../air-quality/forecast-advice';
import { executeWithGeminiRetry } from '../gemini/executor';
import { resolveGeminiModels } from '../gemini/client';
import { resolveGeminiApiKey } from '../env';
import { FallbackReason } from '../constants';
import { buildPlanCacheKey, getCachedPlan, setCachedPlan } from '../gemini/cache';
import { logServerError } from '../logger';
import {
  GeminiPlanOutputSchema,
  GeminiSelectedAction,
  PlanRequest,
  PlanResponse,
  GeneratePlanOptions,
} from './types';

export type { GeneratePlanOptions };

function resolveForecastWindow(airQuality: AirQualityReport, profile: PlanRequest) {
  const forecastAdvice = buildForecastAdvice(
    airQuality.current.aqi,
    airQuality.hourlyForecast,
    profile,
    airQuality.location.timeZone
  );
  const cleanestWindowSpan =
    forecastAdvice.cleanestWindowStart && forecastAdvice.cleanestWindowEnd
      ? `${forecastAdvice.cleanestWindowStart} – ${forecastAdvice.cleanestWindowEnd}`
      : 'midday';

  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const aqiNum = airQuality.current.aqi;
  const maxForecast = airQuality.hourlyForecast?.length
    ? Math.max(...airQuality.hourlyForecast.filter((p) => typeof p.aqi === 'number').map((p) => p.aqi!))
    : (aqiNum ?? 100);
  const isCleanAir = aqiNum !== null && aqiNum !== undefined && aqiNum <= 100 && maxForecast <= 100;

  return { cleanestWindowSpan, isCleanAir, airQualityContext };
}

async function tryGeminiPlanGeneration(
  profile: PlanRequest,
  airQuality: AirQualityReport,
  cleanestWindowSpan: string,
  catalogueMap: Map<string, ActionDefinition>,
  options: GeneratePlanOptions
): Promise<{
  selectedActions: GeminiSelectedAction[];
  generationMethod: 'gemini' | 'rule_based_fallback';
  fallbackReason?: FallbackReason;
  dailyQuotaResetTime?: string;
  modelUsed?: string;
}> {
  const apiKey = resolveGeminiApiKey(options.apiKey);
  if (!apiKey) {
    return { selectedActions: [], generationMethod: 'rule_based_fallback', fallbackReason: 'no_key' };
  }

  const models = resolveGeminiModels({
    models: options.models,
    model: options.model,
    fallbackModel: options.fallbackModel,
  });
  const { systemInstruction, userPrompt } = buildPlanPrompt(profile, airQuality, ACTION_CATALOGUE, cleanestWindowSpan);
  const generator = options.geminiGenerator ?? defaultGeminiGenerator;

  const execResult = await executeWithGeminiRetry<string>({
    models,
    apiKey,
    label: 'PlanService',
    fn: async (activeModel, timeoutMs) => {
      const raw = await generator(systemInstruction, userPrompt, activeModel, apiKey, timeoutMs);
      if (!raw) throw new Error('Empty response from model');
      return raw;
    },
  });

  if (!execResult.data) {
    let fallbackReason: FallbackReason = 'model_error';
    if (execResult.failedDueToDailyQuota) {
      fallbackReason = 'daily_quota_exhausted';
    } else if (execResult.failedDueToBusy) {
      fallbackReason = 'gemini_busy';
    } else {
      logServerError('PlanService', execResult.error || new Error('Gemini plan execution failed without output'), apiKey);
    }
    return {
      selectedActions: [],
      generationMethod: 'rule_based_fallback',
      fallbackReason,
      dailyQuotaResetTime: execResult.dailyQuotaResetTime,
    };
  }

  try {
    const parsed = JSON.parse(execResult.data);
    const validatedOutput = GeminiPlanOutputSchema.parse(parsed);
    const validActions = validatedOutput.selectedActions.filter((item) => catalogueMap.has(item.actionId));
    if (validActions.length >= 4) {
      return {
        selectedActions: validActions.slice(0, 8),
        generationMethod: 'gemini',
        modelUsed: execResult.modelUsed,
      };
    }
    logServerError(
      'PlanService',
      new Error(`Gemini plan output contained fewer than 4 valid actions (found ${validActions.length})`),
      apiKey
    );
  } catch (err: unknown) {
    logServerError('PlanService', err, apiKey);
  }

  return { selectedActions: [], generationMethod: 'rule_based_fallback', fallbackReason: 'model_error' };
}

/**
 * Generates an actionable, personalized 24-hour clean air plan for a household profile,
 * combining real-time local air quality data with AI action selection and deterministic physical impact math.
 */
export async function generateHouseholdPlan(
  rawInput: PlanRequest | Record<string, unknown>,
  options: GeneratePlanOptions = {}
): Promise<PlanResponse> {
  const profile = rawInput as unknown as PlanRequest;
  const fetchAirQuality = options.airQualityFetcher ?? getAirQualityByLocation;
  const lookupKey = profile.coordinates || profile.place;

  const cacheKey = buildPlanCacheKey(lookupKey, profile);
  const cached = getCachedPlan(cacheKey);
  if (cached && !options.geminiGenerator) return cached;

  const airQuality = await fetchAirQuality(lookupKey);
  const catalogueMap = new Map<string, ActionDefinition>(ACTION_CATALOGUE.map((a) => [a.id, a]));
  const { cleanestWindowSpan, isCleanAir, airQualityContext } = resolveForecastWindow(airQuality, profile);

  const aiResult = await tryGeminiPlanGeneration(profile, airQuality, cleanestWindowSpan, catalogueMap, options);
  let { selectedActions } = aiResult;
  let { generationMethod } = aiResult;

  if (generationMethod === 'rule_based_fallback' || selectedActions.length === 0) {
    selectedActions = getRuleBasedFallbackActions(profile, airQuality, cleanestWindowSpan);
    generationMethod = 'rule_based_fallback';
  }

  selectedActions = pruneCleanAirActions(selectedActions, isCleanAir, catalogueMap);
  selectedActions = resolvePlanConsistency(selectedActions, profile, airQualityContext);
  selectedActions = pruneCleanAirActions(selectedActions, isCleanAir, catalogueMap);

  const { plannedActions, summary } = buildPlannedActionsAndSummary(
    selectedActions,
    profile,
    airQuality.current.aqi,
    airQualityContext,
    catalogueMap,
    cleanestWindowSpan,
    isCleanAir
  );

  const planResult: PlanResponse = {
    location: airQuality.location,
    currentAirQuality: airQuality.current,
    hourlyForecast: airQuality.hourlyForecast,
    householdProfile: profile,
    actions: plannedActions,
    summary,
    generationMethod,
    fallbackReason: aiResult.fallbackReason,
    dailyQuotaResetTime: aiResult.dailyQuotaResetTime,
    modelUsed: aiResult.modelUsed,
  };

  if (generationMethod === 'gemini') {
    setCachedPlan(cacheKey, planResult);
  }

  return planResult;
}

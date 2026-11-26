import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { buildPlanPrompt } from './prompt-builder';
import { getRuleBasedFallbackActions } from './fallback';
import { defaultGeminiGenerator } from './gemini-client';
import { resolvePlanConsistency } from './consistency';
import { pruneCleanAirActions } from './consistency-scoring';
import { buildPlannedActionsAndSummary } from './plan-impact-summary';
import { buildForecastAdvice } from '../air-quality/forecast-advice';
import { executeWithGeminiRetry } from '../gemini-executor';
import { resolveGeminiModels } from '../gemini-client';
import { buildPlanCacheKey, getCachedPlan, setCachedPlan } from '../gemini-cache';
import { logServerError } from '../logger';
import {
  GeminiPlanOutputSchema,
  GeminiSelectedAction,
  PlanRequest,
  PlanRequestSchema,
  PlanResponse,
} from './types';

export interface GeneratePlanOptions {
  models?: string[];
  model?: string;
  fallbackModel?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
  geminiGenerator?: (
    systemInstruction: string,
    userPrompt: string,
    model: string,
    apiKey: string,
    timeoutMs?: number
  ) => Promise<string | null>;
}

function resolveGeminiApiKey(custom?: string): string | undefined {
  return custom || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
}

export async function generateHouseholdPlan(
  rawInput: unknown,
  options: GeneratePlanOptions = {}
): Promise<PlanResponse> {
  const profile: PlanRequest = PlanRequestSchema.parse(rawInput);
  const fetchAirQuality = options.airQualityFetcher ?? getAirQualityByLocation;
  const lookupKey = profile.coordinates || profile.place;

  const cacheKey = buildPlanCacheKey(lookupKey, profile);
  const cached = getCachedPlan(cacheKey);
  if (cached && !options.geminiGenerator) return cached;

  const airQuality = await fetchAirQuality(lookupKey);

  const models = resolveGeminiModels({
    models: options.models,
    model: options.model,
    fallbackModel: options.fallbackModel,
  });
  const apiKey = resolveGeminiApiKey(options.apiKey);
  const catalogueMap = new Map<string, ActionDefinition>(ACTION_CATALOGUE.map((a) => [a.id, a]));

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

  let selectedActions: GeminiSelectedAction[] = [];
  let generationMethod: 'gemini' | 'rule_based_fallback' = 'gemini';
  let fallbackReason: 'gemini_busy' | 'daily_quota_exhausted' | 'no_key' | 'model_error' | undefined = undefined;
  let dailyQuotaResetTime: string | undefined = undefined;
  let modelUsed: string | undefined = undefined;

  if (apiKey) {
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

    if (execResult.data) {
      try {
        const parsed = JSON.parse(execResult.data);
        const validatedOutput = GeminiPlanOutputSchema.parse(parsed);
        const validActions = validatedOutput.selectedActions.filter((item) => catalogueMap.has(item.actionId));
        if (validActions.length >= 4) {
          selectedActions = validActions.slice(0, 8);
          modelUsed = execResult.modelUsed;
        } else {
          logServerError(
            'PlanService',
            new Error(`Gemini plan output contained fewer than 4 valid actions (found ${validActions.length})`),
            apiKey
          );
          generationMethod = 'rule_based_fallback';
          fallbackReason = 'model_error';
        }
      } catch (err: unknown) {
        logServerError('PlanService', err, apiKey);
        generationMethod = 'rule_based_fallback';
        fallbackReason = 'model_error';
      }
    } else {
      generationMethod = 'rule_based_fallback';
      if (execResult.failedDueToDailyQuota) {
        fallbackReason = 'daily_quota_exhausted';
        dailyQuotaResetTime = execResult.dailyQuotaResetTime;
      } else if (execResult.failedDueToBusy) {
        fallbackReason = 'gemini_busy';
      } else {
        fallbackReason = 'model_error';
        logServerError('PlanService', execResult.error || new Error('Gemini plan execution failed without output'), apiKey);
      }
    }
  } else {
    generationMethod = 'rule_based_fallback';
    fallbackReason = 'no_key';
  }

  if (generationMethod === 'rule_based_fallback' || selectedActions.length === 0) {
    selectedActions = getRuleBasedFallbackActions(profile, airQuality, cleanestWindowSpan);
    generationMethod = 'rule_based_fallback';
  }

  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const aqiNum = airQuality.current.aqi;
  const maxForecast = airQuality.hourlyForecast?.length
    ? Math.max(...airQuality.hourlyForecast.filter((p) => typeof p.aqi === 'number').map((p) => p.aqi!))
    : (aqiNum ?? 100);
  const isCleanAir = aqiNum !== null && aqiNum !== undefined && aqiNum <= 100 && maxForecast <= 100;

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
    fallbackReason,
    dailyQuotaResetTime,
    modelUsed,
    isSampleData: Boolean(airQuality.isSampleData || airQuality.current.isSampleData),
  };

  if (generationMethod === 'gemini') {
    setCachedPlan(cacheKey, planResult);
  }

  return planResult;
}

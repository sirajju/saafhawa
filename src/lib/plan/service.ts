import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { calculateDeduplicatedTotals } from '../impact/deduplication';
import { ActionImpactResult } from '../impact/types';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { buildPlanPrompt } from './prompt-builder';
import { getRuleBasedFallbackActions } from './fallback';
import { defaultGeminiGenerator } from './gemini-client';
import {
  GeminiPlanOutputSchema,
  GeminiSelectedAction,
  PlannedAction,
  PlanRequest,
  PlanRequestSchema,
  PlanResponse,
  PlanSummary,
} from './types';

export interface GeneratePlanOptions {
  model?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
  geminiGenerator?: (
    systemInstruction: string,
    userPrompt: string,
    model: string,
    apiKey: string
  ) => Promise<string | null>;
}

function resolveGeminiModel(customModel?: string): string {
  return customModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function resolveGeminiApiKey(customApiKey?: string): string | undefined {
  return customApiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
}

/**
 * Main service to generate a customized smog mitigation plan for a household.
 * 1. Validates input profile via Zod
 * 2. Fetches real-time AQI from existing air quality module
 * 3. Asks Gemini for 6-8 chosen action IDs, times of day, and friendly reasons (no numbers)
 * 4. Drops invalid action IDs and falls back to rule-based selection if Gemini fails
 * 5. Attaches deterministic scientific calculations from calculator engine
 */
export async function generateHouseholdPlan(
  rawInput: unknown,
  options: GeneratePlanOptions = {}
): Promise<PlanResponse> {
  const profile: PlanRequest = PlanRequestSchema.parse(rawInput);
  const fetchAirQuality = options.airQualityFetcher ?? getAirQualityByLocation;
  const airQuality = await fetchAirQuality(profile.place);

  const model = resolveGeminiModel(options.model);
  const apiKey = resolveGeminiApiKey(options.apiKey);

  const catalogueMap = new Map<string, ActionDefinition>(
    ACTION_CATALOGUE.map((a) => [a.id, a])
  );

  let selectedActions: GeminiSelectedAction[] = [];
  let generationMethod: 'gemini' | 'rule_based_fallback' = 'gemini';

  if (apiKey) {
    try {
      const { systemInstruction, userPrompt } = buildPlanPrompt(
        profile,
        airQuality,
        ACTION_CATALOGUE
      );
      const generator = options.geminiGenerator ?? defaultGeminiGenerator;
      const rawJson = await generator(systemInstruction, userPrompt, model, apiKey);

      if (rawJson) {
        const parsed = JSON.parse(rawJson);
        const validatedOutput = GeminiPlanOutputSchema.parse(parsed);

        const validActions = validatedOutput.selectedActions.filter((item) =>
          catalogueMap.has(item.actionId)
        );

        if (validActions.length >= 4) {
          selectedActions = validActions.slice(0, 8);
        } else {
          generationMethod = 'rule_based_fallback';
        }
      } else {
        generationMethod = 'rule_based_fallback';
      }
    } catch {
      generationMethod = 'rule_based_fallback';
    }
  } else {
    generationMethod = 'rule_based_fallback';
  }

  if (generationMethod === 'rule_based_fallback' || selectedActions.length === 0) {
    selectedActions = getRuleBasedFallbackActions(profile, airQuality);
    generationMethod = 'rule_based_fallback';
  }

  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const actionImpacts: ActionImpactResult[] = [];
  const plannedActions: PlannedAction[] = selectedActions.map((selected) => {
    const actionDef = catalogueMap.get(selected.actionId)!;
    const impact = calculateActionImpact(actionDef, profile, airQualityContext);
    actionImpacts.push(impact);

    return {
      actionId: actionDef.id,
      title: actionDef.title,
      description: actionDef.description,
      category: actionDef.category,
      suggestedTimeOfDay: selected.suggestedTimeOfDay,
      reason: selected.reason,
      exposureReduction: impact.exposureReduction,
      emissionReduction: impact.emissionReduction,
      methodologyNotes: impact.methodologyNotes,
    };
  });

  const deduped = calculateDeduplicatedTotals(actionImpacts, profile, airQualityContext.currentPm25);

  const summary: PlanSummary = {
    totalActionsCount: plannedActions.length,
    totalPm25InhaledDoseAvoidedUg: deduped.totalPm25InhaledDoseAvoidedUg,
    isExposureUnknown: deduped.isExposureUnknown,
    totalPm25EmissionsSavedGrams: deduped.totalPm25EmissionsSavedGrams,
    totalCo2EmissionsSavedGrams: deduped.totalCo2EmissionsSavedGrams,
    totalCo2EmissionsSavedKg: Number((deduped.totalCo2EmissionsSavedGrams / 1000).toFixed(2)),
  };

  return {
    location: airQuality.location,
    currentAirQuality: airQuality.current,
    hourlyForecast: airQuality.hourlyForecast,
    householdProfile: profile,
    actions: plannedActions,
    summary,
    generationMethod,
    isSampleData: Boolean(airQuality.isSampleData || airQuality.current.isSampleData),
  };
}

import { GoogleGenAI, Type } from '@google/genai';
import { ACTION_CATALOGUE, ActionDefinition } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { buildPlanPrompt } from './prompt-builder';
import { getRuleBasedFallbackActions } from './fallback';
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
 * Default generator invoking the official @google/genai SDK with structured JSON output.
 */
async function defaultGeminiGenerator(
  systemInstruction: string,
  userPrompt: string,
  model: string,
  apiKey: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          selectedActions: {
            type: Type.ARRAY,
            description: 'The 6 to 8 most useful actions selected from the catalogue.',
            items: {
              type: Type.OBJECT,
              properties: {
                actionId: {
                  type: Type.STRING,
                  description: 'The exact ID of the action from the provided catalogue.',
                },
                suggestedTimeOfDay: {
                  type: Type.STRING,
                  description: 'When to perform this action (e.g. Morning, Evening, Night).',
                },
                reason: {
                  type: Type.STRING,
                  description:
                    'A short friendly explanation of why this action suits this family today without mentioning numbers.',
                },
              },
              required: ['actionId', 'suggestedTimeOfDay', 'reason'],
            },
          },
        },
        required: ['selectedActions'],
      },
    },
  });

  return response.text ?? null;
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
  // Step 1: Validate input
  const profile: PlanRequest = PlanRequestSchema.parse(rawInput);

  // Step 2: Fetch air quality
  const fetchAirQuality = options.airQualityFetcher ?? getAirQualityByLocation;
  const airQuality = await fetchAirQuality(profile.place);

  const model = resolveGeminiModel(options.model);
  const apiKey = resolveGeminiApiKey(options.apiKey);

  const catalogueMap = new Map<string, ActionDefinition>(
    ACTION_CATALOGUE.map((a) => [a.id, a])
  );

  let selectedActions: GeminiSelectedAction[] = [];
  let generationMethod: 'gemini' | 'rule_based_fallback' = 'gemini';

  // Step 3: Ask Gemini if API key is configured
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

        // Filter and drop any action IDs that are NOT in the catalogue
        const validActions = validatedOutput.selectedActions.filter((item) =>
          catalogueMap.has(item.actionId)
        );

        // Accept if Gemini returned at least 4 valid actions (targeting 6-8)
        if (validActions.length >= 4) {
          selectedActions = validActions.slice(0, 8);
        } else {
          generationMethod = 'rule_based_fallback';
        }
      } else {
        generationMethod = 'rule_based_fallback';
      }
    } catch {
      // If Gemini fails entirely (timeout, parse error, network, etc.), fall back
      generationMethod = 'rule_based_fallback';
    }
  } else {
    generationMethod = 'rule_based_fallback';
  }

  // Step 4: Fall back to rule-based selection if needed
  if (generationMethod === 'rule_based_fallback' || selectedActions.length === 0) {
    selectedActions = getRuleBasedFallbackActions(profile, airQuality);
    generationMethod = 'rule_based_fallback';
  }

  // Step 5: Attach scientific calculator impact figures in code
  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? 100,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const plannedActions: PlannedAction[] = [];
  for (const item of selectedActions) {
    const def = catalogueMap.get(item.actionId);
    if (!def) continue;

    const impact = calculateActionImpact(def, profile, airQualityContext);
    plannedActions.push({
      actionId: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      suggestedTimeOfDay: item.suggestedTimeOfDay,
      reason: item.reason,
      exposureReduction: impact.exposureReduction,
      emissionReduction: impact.emissionReduction,
      methodologyNotes: impact.methodologyNotes,
    });
  }

  // Step 6: Compute total impact summary across the planned actions
  const totalPm25InhaledDoseAvoidedUg = Number(
    plannedActions
      .reduce((sum, a) => sum + a.exposureReduction.pm25InhaledDoseAvoidedUg, 0)
      .toFixed(1)
  );

  const totalPm25EmissionsSavedGrams = Number(
    plannedActions
      .reduce((sum, a) => sum + a.emissionReduction.pm25SavedGrams, 0)
      .toFixed(3)
  );

  const totalCo2EmissionsSavedGrams = Number(
    plannedActions
      .reduce((sum, a) => sum + a.emissionReduction.co2SavedGrams, 0)
      .toFixed(1)
  );

  const summary: PlanSummary = {
    totalActionsCount: plannedActions.length,
    totalPm25InhaledDoseAvoidedUg,
    totalPm25EmissionsSavedGrams,
    totalCo2EmissionsSavedGrams,
    totalCo2EmissionsSavedKg: Number((totalCo2EmissionsSavedGrams / 1000).toFixed(2)),
  };

  return {
    location: airQuality.location,
    currentAirQuality: airQuality.current,
    householdProfile: profile,
    actions: plannedActions,
    summary,
    generationMethod,
  };
}

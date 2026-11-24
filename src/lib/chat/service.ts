import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import {
  CHAT_TOOLS,
  executeCalculateImpactTool,
  executeGetAirQualityTool,
  executeListActionsTool,
} from './tools';
import { ChatRequest, ChatRequestSchema, ChatResponse, ExecutedToolRecord } from './types';
import { z } from 'zod';

export interface ChatServiceOptions {
  model?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
}

function resolveModel(customModel?: string): string {
  return customModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function resolveApiKey(customApiKey?: string): string | undefined {
  return customApiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
}

/**
 * Builds the system instruction for the conversational smog advisor.
 */
export function buildChatSystemInstruction(
  profile?: ChatRequest['householdProfile'],
  place?: string
): string {
  const profileDetails: string[] = [];

  if (profile) {
    profileDetails.push(`- Adults: ${profile.adultsCount}, Children: ${profile.childrenCount}, Seniors: ${profile.elderlyCount}`);
    if (profile.hasAsthmaOrRespiratoryCondition) {
      profileDetails.push(`- CRITICAL HEALTH CONTEXT: At least one household member has Asthma or a respiratory condition.`);
    }
    profileDetails.push(`- Primary commute: ${profile.primaryCommuteMode} (${profile.dailyCommuteDistanceKm} km/day)`);
    profileDetails.push(`- Cooking fuel: ${profile.cookingFuel}, Air purifier owned: ${profile.hasAirPurifier ? 'Yes' : 'No'}`);
    profileDetails.push(`- Budget focus: ${profile.budget}`);
  }

  const profileContext = profileDetails.length > 0 ? profileDetails.join('\n') : 'Standard household profile';

  return `You are SaafHawa's helpful, empathetic winter smog and clean air assistant.
Your mission is to provide clear, actionable advice to help families and communities navigate hazardous winter air pollution safely.

USER HOUSEHOLD PROFILE:
${profileContext}
Default Location: ${place || '110001'}

CORE BEHAVIOR RULES:
1. TOPIC BOUNDARIES: Keep conversation strictly focused on air quality, winter smog survival, protective health precautions, indoor air quality hacks, and low-emission daily routines. If asked off-topic questions, politely guide the user back to air quality and health.
2. NO NUMERICAL GUESSING: Never guess or invent AQI levels, PM2.5 concentrations, or numerical emission/exposure reductions. Use your provided tools:
   - Call "getAirQualityAndForecast" to check live conditions and hourly 24-hr forecasts before advising on specific hours (e.g. "can my child play outside at 5pm?").
   - Call "calculateActionImpact" to get real scientific impact numbers before recommending specific actions.
3. MEDICAL DISCLAIMER: For any questions about medical symptoms, medications, chest pain, wheezing, or asthma flare-ups:
   - Provide general environmental precautions (e.g., stay inside a sealed room, use HEPA filtration, avoid exertion, keep prescribed inhalers handy).
   - ALWAYS explicitly recommend seeing a doctor or qualified healthcare professional for medical diagnosis and treatment.
4. TONE & STYLE: Keep replies concise, empathetic, warm, and practical. Use bullet points or short paragraphs so it is easy to read on mobile.`;
}

/**
 * Fallback answer generator when Gemini API is unavailable.
 */
async function generateFallbackChatResponse(
  request: ChatRequest,
  airQualityFetcher: (place: string) => Promise<AirQualityReport>
): Promise<ChatResponse> {
  const place = request.place || request.householdProfile?.place || '110001';
  let report: AirQualityReport | null = null;
  const toolsExecuted: ExecutedToolRecord[] = [];

  try {
    report = await airQualityFetcher(place);
    toolsExecuted.push({
      toolName: 'getAirQualityAndForecast',
      args: { place },
      resultSummary: `Fetched current AQI: ${report.current.aqi} (${report.current.category}), PM2.5: ${report.current.pm25?.value} µg/m³`,
    });
  } catch {
    // ignore
  }

  const query = request.message.toLowerCase();
  const aqi = report?.current.aqi ?? 250;
  const category = report?.current.category ?? 'Unhealthy';
  const pm25 = report?.current.pm25?.value ?? 150;
  const hasAsthma = request.householdProfile?.hasAsthmaOrRespiratoryCondition ?? false;

  let reply = '';

  if (query.includes('play') || query.includes('outside') || query.includes('run') || query.includes('exercise') || query.includes('walk')) {
    if (aqi > 250 || pm25 > 120) {
      reply = `Right now in **${report?.location.name || place}**, the air quality is **${category}** with an AQI of **${aqi}** (PM2.5: ${pm25} µg/m³).\n\n` +
        `🚫 **Recommendation:** Strenuous outdoor play or exercise is **not safe** today, especially for children${hasAsthma ? ' and anyone with asthma' : ''}. Cold winter temperature inversions concentrate toxic particulates near the ground.\n\n` +
        `💡 **What to do instead:** Keep activities indoors in a sealed room. If stepping out is unavoidable, wear a fitted N95 mask and aim for early afternoon (1 PM - 3 PM) when sunlight slightly disperses surface pollution.`;
    } else {
      reply = `The current AQI in **${report?.location.name || place}** is **${aqi}** (${category}). While lighter outdoor activities are possible, sensitive groups${hasAsthma ? ' (including asthma sufferers)' : ''} should limit prolonged exertion and wear an N95 mask.`;
    }
  } else if (query.includes('doctor') || query.includes('cough') || query.includes('chest') || query.includes('breath') || query.includes('medicine') || query.includes('inhaler')) {
    reply = `⚠️ **Health & Medical Note:** If you or a family member is experiencing persistent coughing, wheezing, or difficulty breathing, **please consult a qualified medical doctor immediately**.\n\n` +
      `🛡️ **Immediate Environmental Precautions:**\n` +
      `• Move to an enclosed room with a HEPA air purifier or DIY Corsi-Rosenthal box running.\n` +
      `• Keep doors, windows, and draft gaps tightly sealed.\n` +
      `• Avoid dry sweeping, incense sticks, or frying food indoors.\n` +
      `• Keep all prescribed emergency inhalers and medications readily accessible.`;
  } else if (query.includes('purifier') || query.includes('filter') || query.includes('box fan')) {
    reply = `In current smog conditions (AQI ${aqi}), indoor air filtration is essential.\n\n` +
      `• **HEPA Air Purifier:** Running a HEPA purifier in sleeping areas reduces indoor PM2.5 by ~75% over 8 hours.\n` +
      `• **DIY Box-Fan Filter:** If purifiers are too costly, a 20-inch box fan taped to four MERV-13 filters (Corsi-Rosenthal box) provides up to 68% living area particulate reduction at a fraction of the cost.\n` +
      `• **Kitchen Exhaust:** Always run kitchen exhaust fans while cooking to vent frying aerosol spikes directly outside.`;
  } else {
    reply = `In **${report?.location.name || place}**, today's AQI is currently **${aqi}** (${category}, PM2.5: ${pm25} µg/m³).\n\n` +
      `Key daily recommendations for your household:\n` +
      `1. **Wear an N95/FFP2 Mask** whenever stepping outside for commutes or errands.\n` +
      `2. **Keep Windows Sealed** during morning and night temperature inversion hours.\n` +
      `3. **Eliminate Indoor Smoke**: Avoid incense sticks, dhoop, and mosquito coils, which create severe indoor particulate spikes.\n` +
      `4. **Wet Mop** floors instead of dry sweeping to stop settled dust from getting kicked back up.`;
  }

  return { reply, toolsExecuted };
}

/**
 * Handles conversational queries with Gemini Function Calling.
 */
export async function handleChatQuery(
  rawRequest: z.input<typeof ChatRequestSchema>,
  options: ChatServiceOptions = {}
): Promise<ChatResponse> {
  const request = ChatRequestSchema.parse(rawRequest);
  const model = resolveModel(options.model);
  const apiKey = resolveApiKey(options.apiKey);
  const fetcher = options.airQualityFetcher ?? getAirQualityByLocation;

  if (!apiKey) {
    return generateFallbackChatResponse(request, fetcher);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildChatSystemInstruction(
      request.householdProfile,
      request.place
    );

    const toolsExecuted: ExecutedToolRecord[] = [];

    // Format conversation history for Gemini
    const contents: Content[] = [];

    // Include recent history (up to last 6 messages)
    const history = request.conversationHistory || [];
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: request.message }],
    });

    // First call to Gemini with tools
    const initialResponse = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        tools: CHAT_TOOLS,
      },
    });

    // Check if Gemini invoked function calls
    if (initialResponse.functionCalls && initialResponse.functionCalls.length > 0) {
      // Loop over function calls (handles up to 2 calls in multi-turn)
      for (const fc of initialResponse.functionCalls) {
        let toolResult: unknown;

        if (fc.name === 'getAirQualityAndForecast') {
          const placeArg =
            typeof fc.args?.place === 'string' && fc.args.place.trim()
              ? fc.args.place.trim()
              : request.place || '110001';
          const airResult = await executeGetAirQualityTool({ place: placeArg }, request.place, fetcher);
          toolResult = airResult;
          toolsExecuted.push({
            toolName: fc.name,
            args: fc.args as Record<string, unknown>,
            resultSummary: `Retrieved AQI ${airResult.currentAqi} (${airResult.category}) for ${airResult.locationName}`,
          });
        } else if (fc.name === 'calculateActionImpact') {
          const actionId =
            typeof fc.args?.actionId === 'string' && fc.args.actionId.trim()
              ? fc.args.actionId.trim()
              : 'wear_n95_mask_outside';
          const defaultPm25 = 150; // default fallback if no air quality fetched yet
          const impactResult = executeCalculateImpactTool(
            { actionId },
            request.householdProfile || {},
            defaultPm25
          );
          toolResult = impactResult;
          toolsExecuted.push({
            toolName: fc.name,
            args: fc.args as Record<string, unknown>,
            resultSummary: `Calculated impact for ${impactResult.actionTitle}: ${impactResult.pm25InhaledDoseAvoidedUg} µg dose avoided`,
          });
        } else if (fc.name === 'listCatalogueActions') {
          const categoryArg =
            typeof fc.args?.category === 'string' ? fc.args.category : undefined;
          const listResult = executeListActionsTool({ category: categoryArg });
          toolResult = listResult;
          toolsExecuted.push({
            toolName: fc.name,
            args: fc.args as Record<string, unknown>,
            resultSummary: `Listed ${listResult.length} catalogue actions`,
          });
        } else {
          toolResult = { error: `Unknown tool name ${fc.name}` };
        }

        // Add model's turn to conversation history
        contents.push(initialResponse.candidates?.[0]?.content || {
          role: 'model',
          parts: [{ functionCall: fc }],
        });

        // Add function response back to the model
        const functionResponsePart: Part = {
          functionResponse: {
            name: fc.name,
            response: { result: toolResult as Record<string, unknown> },
          },
        };

        contents.push({
          role: 'user',
          parts: [functionResponsePart],
        });
      }

      // Second call to Gemini to synthesize grounded reply
      const finalResponse = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: CHAT_TOOLS,
        },
      });

      return {
        reply: finalResponse.text || 'I checked the latest air quality data for your area to advise you.',
        toolsExecuted,
      };
    }

    return {
      reply: initialResponse.text || 'I am ready to help with your clean air questions.',
      toolsExecuted,
    };
  } catch {
    // If Gemini API fails, fall back to factual rule-based response
    return generateFallbackChatResponse(request, fetcher);
  }
}

import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import {
  CHAT_TOOLS,
  executeCalculateImpactTool,
  executeGetAirQualityTool,
  executeListActionsTool,
} from './tools';
import { ChatRequestSchema, ChatResponse, ExecutedToolRecord } from './types';
import { buildChatSystemInstruction } from './instruction';
import { generateFallbackChatResponse } from './fallback';
import { z } from 'zod';

export { buildChatSystemInstruction, generateFallbackChatResponse };

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
    const contents: Content[] = [];

    const history = request.conversationHistory || [];
    for (const msg of history.slice(-6)) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: request.message }],
    });

    const initialResponse = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        tools: CHAT_TOOLS,
      },
    });

    if (initialResponse.functionCalls && initialResponse.functionCalls.length > 0) {
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
          const targetPlace = request.place || request.householdProfile?.place || '110001';
          let livePm25: number | null = null;
          try {
            const airReport = await fetcher(targetPlace);
            livePm25 = airReport.current.pm25?.value ?? null;
          } catch {
            livePm25 = null;
          }
          const impactResult = executeCalculateImpactTool(
            { actionId },
            request.householdProfile || {},
            livePm25
          );
          toolResult = impactResult;
          toolsExecuted.push({
            toolName: fc.name,
            args: fc.args as Record<string, unknown>,
            resultSummary: `Calculated impact for ${impactResult.actionTitle} using live PM2.5 (${livePm25 ?? 'unknown'} µg/m³): ${impactResult.pm25InhaledDoseAvoidedUg ?? 'unknown'} µg dose avoided`,
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

        contents.push(initialResponse.candidates?.[0]?.content || {
          role: 'model',
          parts: [{ functionCall: fc }],
        });

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
    return generateFallbackChatResponse(request, fetcher);
  }
}

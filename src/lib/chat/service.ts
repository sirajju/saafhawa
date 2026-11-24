import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { capTextLength, withTimeout } from '../gemini-utils';
import { logServerError } from '../logger';
import { CHAT_TOOLS } from './tools';
import { executeSingleToolCall } from './tool-runner';
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
 * Correctly builds history for multiple simultaneous tool calls,
 * allows up to 2 rounds of function execution, returns tool errors to the model,
 * and enforces timeout and response length caps.
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

    // Check if location uses sample data to inform the system prompt
    let isSampleData = false;
    try {
      const checkReport = await fetcher(request.place || '110001');
      isSampleData = Boolean(checkReport.isSampleData || checkReport.current.isSampleData);
    } catch {
      isSampleData = false;
    }

    const systemInstruction = buildChatSystemInstruction(
      request.householdProfile,
      request.place,
      isSampleData
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

    let currentResponse = await withTimeout(
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          tools: CHAT_TOOLS,
        },
      }),
      15000,
      'Gemini Chat Initial'
    );

    // Support up to 2 rounds of function calls
    for (let round = 0; round < 2; round++) {
      const calls = currentResponse.functionCalls;
      if (!calls || calls.length === 0) {
        break;
      }

      // Add the model turn with all function calls
      const modelContent: Content = currentResponse.candidates?.[0]?.content || {
        role: 'model',
        parts: calls.map((fc) => ({ functionCall: fc })),
      };
      contents.push(modelContent);

      // Execute each tool and collect responses; return errors to model rather than throwing
      const responseParts: Part[] = [];
      for (const fc of calls) {
        let toolResult: Record<string, unknown>;
        try {
          toolResult = await executeSingleToolCall(fc, request, fetcher, toolsExecuted);
        } catch (err: unknown) {
          logServerError(`ChatTool:${fc.name}`, err);
          toolResult = {
            error: err instanceof Error ? err.message : 'Tool execution encountered an error',
          };
        }

        responseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        });
      }

      // Add the user/tool response turn containing all function responses
      contents.push({
        role: 'user',
        parts: responseParts,
      });

      // Call Gemini with the updated multi-turn tool history
      currentResponse = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            tools: CHAT_TOOLS,
          },
        }),
        15000,
        `Gemini Chat Round ${round + 2}`
      );
    }

    const replyText = capTextLength(currentResponse.text?.trim(), 3000);

    return {
      reply: replyText || 'I am ready to help with your clean air questions.',
      toolsExecuted,
    };
  } catch (err: unknown) {
    logServerError('ChatService', err);
    return generateFallbackChatResponse(request, fetcher);
  }
}

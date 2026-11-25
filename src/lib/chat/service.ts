import { GoogleGenAI, type Content, type Part } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { capTextLength, withTimeout } from '../gemini-utils';
import { executeWithGeminiRetry } from '../gemini-executor';
import { logServerError } from '../logger';
import { CHAT_TOOLS } from './tools';
import { executeSingleToolCall } from './tool-runner';
import { ChatRequestSchema, ChatResponse, ExecutedToolRecord, ChatRequest } from './types';
import { buildChatSystemInstruction } from './instruction';
import { generateFallbackChatResponse } from './fallback';
import { z } from 'zod';

export { buildChatSystemInstruction, generateFallbackChatResponse };

export interface ChatServiceOptions {
  model?: string;
  fallbackModel?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
}

function resolveModel(customModel?: string): string {
  return customModel || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
}

function resolveApiKey(customApiKey?: string): string | undefined {
  return customApiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
}

async function runGeminiConversation(
  ai: GoogleGenAI,
  activeModel: string,
  request: ChatRequest,
  systemInstruction: string,
  fetcher: (place: string) => Promise<AirQualityReport>,
  toolsExecuted: ExecutedToolRecord[],
  timeoutMs: number
): Promise<string> {
  const contents: Content[] = [];
  const history = request.conversationHistory || [];
  for (const msg of history.slice(-6)) {
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: request.message }] });

  let currentResponse = await withTimeout(
    ai.models.generateContent({ model: activeModel, contents, config: { systemInstruction, tools: CHAT_TOOLS } }),
    timeoutMs,
    'Gemini Chat Initial'
  );

  for (let round = 0; round < 2; round++) {
    const calls = currentResponse.functionCalls;
    if (!calls || calls.length === 0) break;

    const modelContent: Content = currentResponse.candidates?.[0]?.content || {
      role: 'model',
      parts: calls.map((fc) => ({ functionCall: fc })),
    };
    contents.push(modelContent);

    const responseParts: Part[] = [];
    for (const fc of calls) {
      let toolResult: Record<string, unknown>;
      try {
        toolResult = await executeSingleToolCall(fc, request, fetcher, toolsExecuted);
      } catch (err: unknown) {
        logServerError(`ChatTool:${fc.name}`, err);
        toolResult = { error: err instanceof Error ? err.message : 'Tool execution error' };
      }
      responseParts.push({ functionResponse: { name: fc.name, response: { result: toolResult } } });
    }
    contents.push({ role: 'user', parts: responseParts });

    currentResponse = await withTimeout(
      ai.models.generateContent({ model: activeModel, contents, config: { systemInstruction, tools: CHAT_TOOLS } }),
      timeoutMs,
      `Gemini Chat Round ${round + 2}`
    );
  }

  return capTextLength(currentResponse.text?.trim(), 3000) || 'I am ready to help with your clean air questions.';
}

export async function handleChatQuery(
  rawRequest: z.input<typeof ChatRequestSchema>,
  options: ChatServiceOptions = {}
): Promise<ChatResponse> {
  const request = ChatRequestSchema.parse(rawRequest);
  const model = resolveModel(options.model);
  const fallbackModel = options.fallbackModel || process.env.GEMINI_FALLBACK_MODEL || undefined;
  const apiKey = resolveApiKey(options.apiKey);
  const fetcher = options.airQualityFetcher ?? getAirQualityByLocation;

  if (!apiKey) {
    const fallback = await generateFallbackChatResponse(request, fetcher);
    return { ...fallback, fallbackReason: 'no_key' };
  }

  let isSampleData = false;
  try {
    const checkReport = await fetcher(request.place || '110001');
    isSampleData = Boolean(checkReport.isSampleData || checkReport.current.isSampleData);
  } catch {
    isSampleData = false;
  }

  const systemInstruction = buildChatSystemInstruction(request.householdProfile, request.place, isSampleData);
  const toolsExecuted: ExecutedToolRecord[] = [];
  const ai = new GoogleGenAI({ apiKey });

  const execResult = await executeWithGeminiRetry<string>({
    primaryModel: model,
    fallbackModel,
    apiKey,
    label: 'ChatService',
    fn: async (activeModel, timeoutMs) => {
      return runGeminiConversation(ai, activeModel, request, systemInstruction, fetcher, toolsExecuted, timeoutMs);
    },
  });

  if (execResult.data) {
    return { reply: execResult.data, toolsExecuted, modelUsed: execResult.modelUsed };
  }

  const fallback = await generateFallbackChatResponse(request, fetcher);
  return {
    ...fallback,
    fallbackReason: execResult.failedDueToBusy ? 'gemini_busy' : 'model_error',
  };
}

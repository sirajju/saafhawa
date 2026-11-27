import type { GoogleGenAI, Content, Part } from '@google/genai';
import { createGeminiClient, resolveGeminiModels } from '../gemini-client';
import { resolveGeminiApiKey } from '../env';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { capTextLength, withTimeout } from '../gemini-utils';
import { executeWithGeminiRetry } from '../gemini-executor';
import { logServerError } from '../logger';
import { CHAT_TOOLS } from './tools';
import { executeSingleToolCall } from './tool-runner';
import { ChatResponse, ExecutedToolRecord, ChatRequest, ChatMessage } from './types';
import { buildChatSystemInstruction } from './instruction';
import { generateFallbackChatResponse } from './fallback';

export { buildChatSystemInstruction, generateFallbackChatResponse };

export interface ChatServiceOptions {
  models?: string[];
  model?: string;
  fallbackModel?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
}

export type ChatInput = Omit<ChatRequest, 'conversationHistory'> & {
  conversationHistory?: ChatMessage[];
};

async function runGeminiConversation(
  ai: GoogleGenAI,
  activeModel: string,
  request: ChatRequest,
  systemInstruction: string,
  fetcher: (place: string) => Promise<AirQualityReport>,
  toolsExecuted: ExecutedToolRecord[],
  totalBudgetMs: number = 20000
): Promise<string> {
  const contents: Content[] = [];
  const history = request.conversationHistory || [];
  for (const msg of history.slice(-6)) {
    contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }
  contents.push({ role: 'user', parts: [{ text: request.message }] });

  const deadline = Date.now() + Math.min(20000, totalBudgetMs);

  const getTimeoutForRound = (roundIndex: number, maxRounds: number) => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 500) {
      throw new Error('Chat timeout budget exceeded');
    }
    const roundsLeft = maxRounds - roundIndex;
    return Math.min(remainingMs, Math.max(3000, Math.floor(remainingMs / roundsLeft)));
  };

  let currentResponse = await withTimeout(
    ai.models.generateContent({ model: activeModel, contents, config: { systemInstruction, tools: CHAT_TOOLS } }),
    getTimeoutForRound(0, 3),
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
      getTimeoutForRound(round + 1, 3),
      `Gemini Chat Round ${round + 2}`
    );
  }

  return capTextLength(currentResponse.text?.trim(), 3000) || 'I am ready to help with your clean air questions.';
}

/**
 * Handles conversational queries using Gemini model chain with tool execution and fallback logic.
 */
export async function handleChatQuery(
  rawRequest: ChatInput,
  options: ChatServiceOptions = {}
): Promise<ChatResponse> {
  const request: ChatRequest = {
    ...rawRequest,
    conversationHistory: rawRequest.conversationHistory ?? [],
  } as ChatRequest;
  const models = resolveGeminiModels({
    models: options.models,
    model: options.model,
    fallbackModel: options.fallbackModel,
  });
  const apiKey = resolveGeminiApiKey(options.apiKey);
  const fetcher = options.airQualityFetcher ?? getAirQualityByLocation;

  if (!apiKey) {
    const fallback = await generateFallbackChatResponse(request, fetcher);
    return { ...fallback, fallbackReason: 'no_key' };
  }

  const systemInstruction = buildChatSystemInstruction(request.householdProfile, request.place);
  const toolsExecuted: ExecutedToolRecord[] = [];
  const ai = createGeminiClient(apiKey);

  const execResult = await executeWithGeminiRetry<string>({
    models,
    apiKey,
    label: 'ChatService',
    totalTimeoutMs: 20000,
    fn: async (activeModel, timeoutMs) => {
      return runGeminiConversation(ai, activeModel, request, systemInstruction, fetcher, toolsExecuted, timeoutMs);
    },
  });

  if (execResult.data) {
    return { reply: execResult.data, toolsExecuted, modelUsed: execResult.modelUsed };
  }

  const fallback = await generateFallbackChatResponse(request, fetcher);
  let fallbackReason: ChatResponse['fallbackReason'] = 'model_error';
  if (execResult.failedDueToDailyQuota) {
    fallbackReason = 'daily_quota_exhausted';
  } else if (execResult.failedDueToBusy) {
    fallbackReason = 'gemini_busy';
  }

  return {
    ...fallback,
    fallbackReason,
    dailyQuotaResetTime: execResult.dailyQuotaResetTime,
  };
}

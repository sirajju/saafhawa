import { GoogleGenAI } from '@google/genai';
import { env, DEFAULT_GEMINI_MODELS } from '../env';

export { DEFAULT_GEMINI_MODELS };
export const DEFAULT_GEMINI_API_VERSION = 'v1beta';

export interface CreateGeminiClientOptions {
  apiVersion?: string;
}

/**
 * Creates an official GoogleGenAI client configured with apiVersion: 'v1beta'.
 * The v1beta API version is required for modern models (gemini-flash-lite-latest, gemini-2.5-flash-lite)
 * to support developer system instructions and structured JSON schema output without 404/400 errors.
 */
export function createGeminiClient(
  apiKey: string,
  options?: CreateGeminiClientOptions
): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    apiVersion: options?.apiVersion || DEFAULT_GEMINI_API_VERSION,
  });
}

export interface ResolveGeminiModelsOptions {
  models?: string[];
  model?: string;
  fallbackModel?: string;
}

/**
 * Resolves an ordered list of Gemini models to attempt.
 * Priority:
 * 1. Explicit options.models array if provided and non-empty.
 * 2. Backwards-compatible options.model / options.fallbackModel.
 * 3. Environment models or default chain from env.
 */
export function resolveGeminiModels(options?: ResolveGeminiModelsOptions): string[] {
  if (options?.models && options.models.length > 0) {
    return Array.from(new Set(options.models.map((m) => m.trim()).filter(Boolean)));
  }

  if (options?.model || options?.fallbackModel) {
    const list = [
      options.model || 'gemini-flash-lite-latest',
      options.fallbackModel || 'gemini-2.5-flash-lite',
    ]
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }

  return env.geminiModels;
}

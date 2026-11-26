import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_API_VERSION = 'v1beta';

export const DEFAULT_GEMINI_MODELS: readonly string[] = Object.freeze([
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
]);

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
 * 2. GEMINI_MODELS env variable (comma-separated list).
 * 3. Backwards-compatible options.model / options.fallbackModel or GEMINI_MODEL / GEMINI_FALLBACK_MODEL.
 * 4. Default model chain: ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-3.8-flash'].
 */
export function resolveGeminiModels(options?: ResolveGeminiModelsOptions): string[] {
  if (options?.models && options.models.length > 0) {
    return Array.from(new Set(options.models.map((m) => m.trim()).filter(Boolean)));
  }

  const envModels = process.env.GEMINI_MODELS?.trim();
  if (envModels) {
    const parsed = envModels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      return Array.from(new Set(parsed));
    }
  }

  const explicitModel = options?.model || process.env.GEMINI_MODEL;
  const explicitFallback = options?.fallbackModel || process.env.GEMINI_FALLBACK_MODEL;

  if (explicitModel || explicitFallback) {
    const list = [explicitModel || 'gemini-flash-lite-latest', explicitFallback || 'gemini-2.5-flash-lite']
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(list));
  }

  return [...DEFAULT_GEMINI_MODELS];
}

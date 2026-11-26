import { GoogleGenAI } from '@google/genai';

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

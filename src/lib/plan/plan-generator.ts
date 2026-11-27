import { Type } from '@google/genai';
import { createGeminiClient } from '../gemini/client';
import { capTextLength, withAbortTimeout } from '../gemini/utils';
import { TEXT_LIMITS } from '../constants';

/**
 * Default generator invoking the official @google/genai SDK with structured JSON output.
 * Uses v1beta API version via createGeminiClient for model compatibility.
 * Enforces a 15-second timeout and 10,000-character cap on raw JSON text.
 */
export async function defaultGeminiGenerator(
  systemInstruction: string,
  userPrompt: string,
  model: string,
  apiKey: string,
  timeoutMs: number = 15000
): Promise<string | null> {
  const ai = createGeminiClient(apiKey);

  const generate = (abortSignal: AbortSignal) =>
    ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        abortSignal,
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

  const response = await withAbortTimeout(generate, timeoutMs, 'Gemini Plan Generation');

  return capTextLength(response.text, TEXT_LIMITS.PLAN_REPLY_MAX_CHARS) || null;
}

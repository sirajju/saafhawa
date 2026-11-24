import { GoogleGenAI, Type } from '@google/genai';
import { capTextLength, withTimeout } from '../gemini-utils';

/**
 * Default generator invoking the official @google/genai SDK with structured JSON output.
 * Enforces a 15-second timeout and 10,000-character cap on raw JSON text.
 */
export async function defaultGeminiGenerator(
  systemInstruction: string,
  userPrompt: string,
  model: string,
  apiKey: string
): Promise<string | null> {
  const ai = new GoogleGenAI({ apiKey });

  const generatePromise = ai.models.generateContent({
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

  const response = await withTimeout(generatePromise, 15000, 'Gemini Plan Generation');

  return capTextLength(response.text, 10000) || null;
}

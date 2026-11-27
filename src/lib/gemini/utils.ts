/**
 * Utility functions to enforce timeout and response length bounding on Gemini API interactions.
 */

export const DEFAULT_GEMINI_TIMEOUT_MS = 15000;
export const MAX_GEMINI_RESPONSE_CHARS = 4000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = DEFAULT_GEMINI_TIMEOUT_MS,
  label = 'Gemini API'
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} request timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export function capTextLength(
  text: string | null | undefined,
  maxChars: number = MAX_GEMINI_RESPONSE_CHARS
): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars);
}

/**
 * Resilient Gemini execution engine with transient error retries,
 * optional fallback model switching, and 25-second execution ceiling.
 */

export interface GeminiRetryOptions<T> {
  primaryModel: string;
  fallbackModel?: string;
  apiKey?: string;
  label?: string;
  fn: (model: string, timeoutMs: number) => Promise<T>;
  maxRetriesPerModel?: number;
  initialBackoffMs?: number;
  totalTimeoutMs?: number;
}

export interface GeminiExecutionResult<T> {
  data: T | null;
  modelUsed?: string;
  error?: unknown;
  failedDueToBusy: boolean;
}

export function sanitizeErrorMessage(error: unknown, apiKey?: string): string {
  let msg = error instanceof Error ? error.message : String(error || 'Unknown error');
  if (apiKey && apiKey.length > 5) {
    msg = msg.replaceAll(apiKey, '[REDACTED_API_KEY]');
  }
  // Strip common URL query parameter keys
  msg = msg.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]');
  return msg;
}

export function isFatalGeminiError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const errObj = error as { status?: number; code?: number | string; statusCode?: number };
  const status = errObj.status ?? errObj.statusCode;

  if (status === 400 || status === 401 || status === 403) return true;
  if (errObj.code === 400 || errObj.code === 401 || errObj.code === 403) return true;

  return (
    msg.includes('400') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('INVALID_ARGUMENT') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('UNAUTHENTICATED')
  );
}

export function isTransientGeminiError(error: unknown): boolean {
  if (!error || isFatalGeminiError(error)) return false;

  const msg = error instanceof Error ? error.message : String(error);
  const errObj = error as { status?: number; code?: number | string; statusCode?: number };
  const status = errObj.status ?? errObj.statusCode;

  if (status === 429 || status === 503) return true;
  if (errObj.code === 429 || errObj.code === 503) return true;

  const lower = msg.toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('503') ||
    lower.includes('resource_exhausted') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('timed out') ||
    lower.includes('quota')
  );
}

export async function executeWithGeminiRetry<T>(
  options: GeminiRetryOptions<T>
): Promise<GeminiExecutionResult<T>> {
  const label = options.label || 'Gemini';
  const maxRetries = options.maxRetriesPerModel ?? 2;
  const backoffBase = options.initialBackoffMs ?? 500;
  const deadline = Date.now() + Math.min(24000, options.totalTimeoutMs ?? 24000);

  const models: string[] = [options.primaryModel];
  if (options.fallbackModel && options.fallbackModel !== options.primaryModel) {
    models.push(options.fallbackModel);
  }

  let lastError: unknown = null;
  let failedDueToBusy = false;

  for (const model of models) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 1000) {
        console.warn(`[${label}] Total timeout approaching deadline, aborting further attempts.`);
        break;
      }

      try {
        const timeoutForCall = Math.min(12000, remainingMs);
        const data = await options.fn(model, timeoutForCall);
        if (data !== null && data !== undefined) {
          console.log(`[${label}] Model answered successfully: ${model}`);
          return { data, modelUsed: model, failedDueToBusy: false };
        }
      } catch (err: unknown) {
        lastError = err;
        const sanitized = sanitizeErrorMessage(err, options.apiKey);

        if (isFatalGeminiError(err)) {
          console.error(`[${label}] Fatal error (no retry) on model ${model}: ${sanitized}`);
          return { data: null, error: err, failedDueToBusy: false };
        }

        if (isTransientGeminiError(err)) {
          failedDueToBusy = true;
          console.warn(`[${label}] Transient error (attempt ${attempt + 1}/${maxRetries + 1}) on ${model}: ${sanitized}`);
          if (attempt < maxRetries) {
            const delay = backoffBase * Math.pow(2, attempt);
            if (Date.now() + delay < deadline) {
              await new Promise((r) => setTimeout(r, delay));
            }
          }
        } else {
          console.warn(`[${label}] Unexpected error on model ${model}: ${sanitized}`);
          break; // Try next model if available
        }
      }
    }
  }

  console.error(
    `[${label}] All Gemini attempts exhausted. Using rule-based fallback. (Busy: ${failedDueToBusy})`
  );

  return {
    data: null,
    error: lastError,
    failedDueToBusy,
  };
}

import {
  QuotaAnalysis,
  modelExhaustionMap,
  clearModelExhaustion,
  sanitizeErrorMessage,
  isFatalGeminiError,
  parseGeminiQuotaError,
  isTransientGeminiError,
} from './gemini-quota';

export {
  type QuotaAnalysis,
  clearModelExhaustion,
  sanitizeErrorMessage,
  isFatalGeminiError,
  parseGeminiQuotaError,
  isTransientGeminiError,
};

export interface GeminiRetryOptions<T> {
  primaryModel: string;
  fallbackModel?: string;
  apiKey?: string;
  label?: string;
  totalTimeoutMs?: number;
  maxRetriesPerModel?: number;
  initialBackoffMs?: number;
  fn: (activeModel: string, timeoutMs: number) => Promise<T>;
}

export interface GeminiExecutionResult<T> {
  data: T | null;
  modelUsed?: string;
  error?: unknown;
  failedDueToBusy: boolean;
  failedDueToDailyQuota?: boolean;
  dailyQuotaResetTime?: string;
}

export async function executeWithGeminiRetry<T>(
  options: GeminiRetryOptions<T>
): Promise<GeminiExecutionResult<T>> {
  const label = options.label || 'Gemini';
  const deadline = Date.now() + Math.min(24000, options.totalTimeoutMs ?? 24000);
  const models: string[] = [options.primaryModel];
  if (options.fallbackModel && options.fallbackModel !== options.primaryModel) {
    models.push(options.fallbackModel);
  }

  let lastError: unknown = null;
  let failedDueToBusy = false;
  let failedDueToDailyQuota = false;
  let latestDailyResetAt: number | undefined;

  for (const model of models) {
    const exhaustedUntil = modelExhaustionMap.get(model);
    if (exhaustedUntil && Date.now() < exhaustedUntil) {
      console.warn(`[${label}] Model ${model} is exhausted until ${new Date(exhaustedUntil).toLocaleTimeString()} (skipping).`);
      failedDueToDailyQuota = true;
      latestDailyResetAt = Math.max(latestDailyResetAt || 0, exhaustedUntil);
      continue;
    }

    const maxRetries = options.maxRetriesPerModel ?? 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 1000) break;

      try {
        const timeoutForCall = Math.min(12000, remainingMs);
        const data = await options.fn(model, timeoutForCall);
        if (data !== null && data !== undefined) {
          return { data, modelUsed: model, failedDueToBusy: false };
        }
      } catch (err: unknown) {
        lastError = err;
        sanitizeErrorMessage(err, options.apiKey);

        if (isFatalGeminiError(err)) {
          return { data: null, error: err, failedDueToBusy: false };
        }

        const quota = parseGeminiQuotaError(err);
        if (quota.isDailyQuota) {
          failedDueToDailyQuota = true;
          const reset = quota.resetAt || Date.now() + 24 * 3600 * 1000;
          latestDailyResetAt = Math.max(latestDailyResetAt || 0, reset);
          modelExhaustionMap.set(model, reset);
          console.warn(`[${label}] Daily quota exhausted on ${model} until ${new Date(reset).toLocaleTimeString()}. Switching model immediately.`);
          break; // Switch to fallback model without retrying this model
        }

        if (quota.isQuota && !quota.isDailyQuota) {
          failedDueToBusy = true;
          if (attempt === 0 && quota.retryDelayMs !== undefined && quota.retryDelayMs <= 5000) {
            console.warn(`[${label}] Per-minute rate limit on ${model}, waiting ${quota.retryDelayMs}ms once.`);
            await new Promise((r) => setTimeout(r, quota.retryDelayMs));
            continue;
          }
          console.warn(`[${label}] Per-minute rate limit on ${model} (delay > 5s or retried). Switching model.`);
          break; // Move on to next model
        }

        if (isTransientGeminiError(err)) {
          failedDueToBusy = true;
          if (attempt < maxRetries) {
            const delay = (options.initialBackoffMs ?? 500) * Math.pow(2, attempt);
            if (Date.now() + delay < deadline) await new Promise((r) => setTimeout(r, delay));
          }
        } else {
          break;
        }
      }
    }
  }

  const resetTimeString = latestDailyResetAt
    ? new Date(latestDailyResetAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : undefined;

  return {
    data: null,
    error: lastError,
    failedDueToBusy: failedDueToBusy && !failedDueToDailyQuota,
    failedDueToDailyQuota,
    dailyQuotaResetTime: resetTimeString,
  };
}

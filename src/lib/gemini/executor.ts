/* eslint-disable complexity, max-lines-per-function */
import {
  modelExhaustionMap,
  sanitizeErrorMessage,
  isFatalGeminiError,
  isGeminiConfigError,
  parseGeminiQuotaError,
  isTransientGeminiError,
} from './quota';
import { logServerWarning } from '../logger';
import { TIMERS } from '../constants';

export interface GeminiRetryOptions<T> {
  models?: string[];
  primaryModel?: string;
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
  const deadline =
    Date.now() +
    Math.min(
      TIMERS.GEMINI_TOTAL_TIMEOUT_MS,
      options.totalTimeoutMs ?? TIMERS.GEMINI_TOTAL_TIMEOUT_MS
    );
  const candidateModels: string[] =
    options.models && options.models.length > 0
      ? options.models.map((m) => m.trim()).filter(Boolean)
      : [options.primaryModel, options.fallbackModel].filter((m): m is string =>
          Boolean(m && m.trim())
        );
  const models = Array.from(
    new Set(candidateModels.length > 0 ? candidateModels : ['gemini-flash-lite-latest'])
  );

  let lastError: unknown = null;
  let failedDueToBusy = false;
  let failedDueToDailyQuota = false;
  let latestDailyResetAt: number | undefined;

  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const model = models[modelIdx];

    const exhaustedUntil = modelExhaustionMap.get(model);
    if (exhaustedUntil && Date.now() < exhaustedUntil) {
      logServerWarning(
        label,
        `Model ${model} is exhausted until ${new Date(exhaustedUntil).toLocaleTimeString()} (skipping).`
      );
      failedDueToDailyQuota = true;
      latestDailyResetAt = Math.max(latestDailyResetAt || 0, exhaustedUntil);
      continue;
    }

    const maxRetries = options.maxRetriesPerModel ?? 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const remainingMs = deadline - Date.now();
      if (remainingMs < 1000) break;

      try {
        const timeoutForCall = Math.min(TIMERS.GEMINI_CALL_TIMEOUT_MS, remainingMs);
        const data = await options.fn(model, timeoutForCall);
        if (data !== null && data !== undefined) {
          return { data, modelUsed: model, failedDueToBusy: false };
        }
      } catch (err: unknown) {
        lastError = err;

        if (isFatalGeminiError(err)) {
          logServerWarning(label, `Fatal auth error: ${sanitizeErrorMessage(err, options.apiKey)}`);
          return { data: null, error: err, failedDueToBusy: false };
        }

        if (isGeminiConfigError(err)) {
          logServerWarning(
            label,
            `Configuration error on model ${model} (404/400): ${sanitizeErrorMessage(err, options.apiKey)}. Skipping retries and trying next model.`
          );
          break;
        }

        const quota = parseGeminiQuotaError(err);
        if (quota.isDailyQuota) {
          failedDueToDailyQuota = true;
          const reset = quota.resetAt || Date.now() + 24 * 3600 * 1000;
          latestDailyResetAt = Math.max(latestDailyResetAt || 0, reset);
          modelExhaustionMap.set(model, reset);
          logServerWarning(
            label,
            `Daily quota exhausted on ${model} until ${new Date(reset).toLocaleTimeString()}. Switching model immediately.`
          );
          break;
        }

        if (quota.isQuota && !quota.isDailyQuota) {
          failedDueToBusy = true;
          if (attempt === 0 && quota.retryDelayMs !== undefined && quota.retryDelayMs <= 5000) {
            logServerWarning(
              label,
              `Per-minute rate limit on ${model}, waiting ${quota.retryDelayMs}ms once.`
            );
            await new Promise((r) => setTimeout(r, quota.retryDelayMs));
            continue;
          }
          logServerWarning(
            label,
            `Per-minute rate limit on ${model} (delay > 5s or retried). Switching model.`
          );
          break;
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

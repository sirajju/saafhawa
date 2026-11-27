import { modelExhaustionMap } from './quota';
import { decideAfterError, recordDailyReset, type RetryState } from './retry-policy';
import { logServerWarning } from '../logger';
import { TIMERS, FALLBACK_REASONS, type FallbackReason } from '../constants';

const DEFAULT_MODEL = 'gemini-flash-lite-latest';
const MIN_REMAINING_MS = 1000;

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

/**
 * Maps a failed Gemini execution to the fallback reason shown to the user.
 */
export function deriveFallbackReason(
  result: Pick<GeminiExecutionResult<unknown>, 'failedDueToBusy' | 'failedDueToDailyQuota'>
): FallbackReason {
  if (result.failedDueToDailyQuota) return FALLBACK_REASONS.DAILY_QUOTA_EXHAUSTED;
  if (result.failedDueToBusy) return FALLBACK_REASONS.GEMINI_BUSY;
  return FALLBACK_REASONS.MODEL_ERROR;
}

function resolveModelOrder(
  options: Pick<GeminiRetryOptions<unknown>, 'models' | 'primaryModel' | 'fallbackModel'>
): string[] {
  const candidates =
    options.models && options.models.length > 0
      ? options.models.map((m) => m.trim()).filter(Boolean)
      : [options.primaryModel, options.fallbackModel].filter((m): m is string =>
          Boolean(m && m.trim())
        );
  return Array.from(new Set(candidates.length > 0 ? candidates : [DEFAULT_MODEL]));
}

/** Skips a model whose daily quota is known to be exhausted; records when it resets. */
function isModelExhausted(model: string, label: string, state: RetryState): boolean {
  const exhaustedUntil = modelExhaustionMap.get(model);
  if (!exhaustedUntil || Date.now() >= exhaustedUntil) return false;
  logServerWarning(
    label,
    `Model ${model} is exhausted until ${new Date(exhaustedUntil).toLocaleTimeString()} (skipping).`
  );
  recordDailyReset(state, exhaustedUntil);
  return true;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ModelOutcome<T> =
  | { kind: 'success'; data: T }
  | { kind: 'fatal'; error: unknown }
  | { kind: 'exhausted' };

/** Runs up to maxRetries + 1 attempts on one model, following the retry policy. */
async function runModelAttempts<T>(
  model: string,
  options: GeminiRetryOptions<T>,
  deadline: number,
  state: RetryState & { lastError: unknown }
): Promise<ModelOutcome<T>> {
  const label = options.label || 'Gemini';
  const maxRetries = options.maxRetriesPerModel ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < MIN_REMAINING_MS) break;

    try {
      const data = await options.fn(model, Math.min(TIMERS.GEMINI_CALL_TIMEOUT_MS, remainingMs));
      if (data !== null && data !== undefined) return { kind: 'success', data };
    } catch (err: unknown) {
      state.lastError = err;
      const decision = decideAfterError(
        err,
        {
          label,
          model,
          attempt,
          maxRetries,
          deadline,
          apiKey: options.apiKey,
          initialBackoffMs: options.initialBackoffMs ?? 500,
        },
        state
      );
      if (decision.kind === 'fatal') return { kind: 'fatal', error: err };
      if (decision.kind === 'next_model') break;
      if (decision.waitMs > 0) await sleep(decision.waitMs);
    }
  }
  return { kind: 'exhausted' };
}

/**
 * Calls Gemini through an ordered model chain with bounded retries, a total deadline,
 * per-minute rate-limit waits and daily-quota tracking. Never throws: failures are
 * reported in the result so callers can fall back to rule-based output.
 */
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
  const state: RetryState & { lastError: unknown } = {
    failedDueToBusy: false,
    failedDueToDailyQuota: false,
    lastError: null,
  };

  for (const model of resolveModelOrder(options)) {
    if (isModelExhausted(model, label, state)) continue;

    const outcome = await runModelAttempts(model, options, deadline, state);
    if (outcome.kind === 'success') {
      return { data: outcome.data, modelUsed: model, failedDueToBusy: false };
    }
    if (outcome.kind === 'fatal') {
      return { data: null, error: outcome.error, failedDueToBusy: false };
    }
  }

  const resetTimeString = state.latestDailyResetAt
    ? new Date(state.latestDailyResetAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : undefined;

  return {
    data: null,
    error: state.lastError,
    failedDueToBusy: state.failedDueToBusy && !state.failedDueToDailyQuota,
    failedDueToDailyQuota: state.failedDueToDailyQuota,
    dailyQuotaResetTime: resetTimeString,
  };
}

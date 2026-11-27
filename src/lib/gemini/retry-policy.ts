import {
  modelExhaustionMap,
  sanitizeErrorMessage,
  isFatalGeminiError,
  isGeminiConfigError,
  parseGeminiQuotaError,
  isTransientGeminiError,
} from './quota';
import { logServerWarning } from '../logger';
import { MS_PER_DAY } from '../constants';

/** Longest per-minute rate-limit delay we are willing to wait for once. */
const MAX_RATE_LIMIT_WAIT_MS = 5000;

/** Failure signals collected across all models and attempts. */
export interface RetryState {
  failedDueToBusy: boolean;
  failedDueToDailyQuota: boolean;
  latestDailyResetAt?: number;
}

export interface AttemptContext {
  label: string;
  model: string;
  attempt: number;
  maxRetries: number;
  deadline: number;
  apiKey?: string;
  initialBackoffMs: number;
}

/** What the retry loop should do after a failed call. */
export type RetryDecision =
  | { kind: 'fatal' }
  | { kind: 'next_model' }
  | { kind: 'retry'; waitMs: number };

export function recordDailyReset(state: RetryState, resetAt: number): void {
  state.failedDueToDailyQuota = true;
  state.latestDailyResetAt = Math.max(state.latestDailyResetAt || 0, resetAt);
}

function handleDailyQuota(ctx: AttemptContext, state: RetryState, resetAt?: number): RetryDecision {
  const reset = resetAt || Date.now() + MS_PER_DAY;
  recordDailyReset(state, reset);
  modelExhaustionMap.set(ctx.model, reset);
  logServerWarning(
    ctx.label,
    `Daily quota exhausted on ${ctx.model} until ${new Date(reset).toLocaleTimeString()}. Switching model immediately.`
  );
  return { kind: 'next_model' };
}

function handleRateLimit(
  ctx: AttemptContext,
  state: RetryState,
  retryDelayMs?: number
): RetryDecision {
  state.failedDueToBusy = true;
  if (ctx.attempt === 0 && retryDelayMs !== undefined && retryDelayMs <= MAX_RATE_LIMIT_WAIT_MS) {
    logServerWarning(
      ctx.label,
      `Per-minute rate limit on ${ctx.model}, waiting ${retryDelayMs}ms once.`
    );
    return { kind: 'retry', waitMs: retryDelayMs };
  }
  logServerWarning(
    ctx.label,
    `Per-minute rate limit on ${ctx.model} (delay > 5s or retried). Switching model.`
  );
  return { kind: 'next_model' };
}

function handleTransient(ctx: AttemptContext, state: RetryState): RetryDecision {
  state.failedDueToBusy = true;
  if (ctx.attempt >= ctx.maxRetries) return { kind: 'retry', waitMs: 0 };
  const delay = ctx.initialBackoffMs * Math.pow(2, ctx.attempt);
  return { kind: 'retry', waitMs: Date.now() + delay < ctx.deadline ? delay : 0 };
}

/**
 * Classifies a failed Gemini call and updates the shared failure state.
 * Order matters: auth errors stop everything, config errors and daily quota move to the
 * next model, per-minute limits wait once, transient errors back off exponentially.
 */
export function decideAfterError(
  err: unknown,
  ctx: AttemptContext,
  state: RetryState
): RetryDecision {
  if (isFatalGeminiError(err)) {
    logServerWarning(ctx.label, `Fatal auth error: ${sanitizeErrorMessage(err, ctx.apiKey)}`);
    return { kind: 'fatal' };
  }

  if (isGeminiConfigError(err)) {
    logServerWarning(
      ctx.label,
      `Configuration error on model ${ctx.model} (404/400): ${sanitizeErrorMessage(err, ctx.apiKey)}. Skipping retries and trying next model.`
    );
    return { kind: 'next_model' };
  }

  const quota = parseGeminiQuotaError(err);
  if (quota.isDailyQuota) return handleDailyQuota(ctx, state, quota.resetAt);
  if (quota.isQuota) return handleRateLimit(ctx, state, quota.retryDelayMs);
  if (isTransientGeminiError(err)) return handleTransient(ctx, state);
  return { kind: 'next_model' };
}

import { redact } from '../logger';
import { MS_PER_DAY } from '../constants';

export interface QuotaAnalysis {
  isQuota: boolean;
  isDailyQuota: boolean;
  retryDelayMs?: number;
  retryDelaySeconds?: number;
  resetAt?: number;
  resetTimeFormatted?: string;
}

export const modelExhaustionMap = new Map<string, number>();

export function clearModelExhaustion(): void {
  modelExhaustionMap.clear();
}

export function sanitizeErrorMessage(error: unknown, apiKey?: string): string {
  const msg = error instanceof Error ? error.message : String(error || 'Unknown error');
  return redact(msg, apiKey);
}

export function isFatalGeminiError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const errObj = error as { status?: number; code?: number | string; statusCode?: number };
  const status = errObj.status ?? errObj.statusCode;
  if (status === 401 || status === 403) return true;
  if (errObj.code === 401 || errObj.code === 403) return true;
  return (
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED')
  );
}

export function isGeminiConfigError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  const errObj = error as { status?: number; code?: number | string; statusCode?: number };
  const status = errObj.status ?? errObj.statusCode;
  if (status === 404 || status === 400) return true;
  if (errObj.code === 404 || errObj.code === 400) return true;
  return (
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('400') ||
    lower.includes('developer instruction') ||
    lower.includes('bad request') ||
    lower.includes('invalid argument')
  );
}

type GeminiErrorShape = {
  status?: number;
  code?: number | string;
  details?: Array<Record<string, unknown>>;
  errorDetails?: Array<Record<string, unknown>>;
};

const DAILY_MESSAGE_MARKERS = ['per day', 'per-day', 'daily', 'requests_per_day', 'perday'];
const DAILY_METADATA_MARKERS = ['per_day', 'perday', 'requests_per_day', 'daily'];
/** A retry delay longer than a minute means a daily (not per-minute) limit. */
const DAILY_RETRY_THRESHOLD_MS = 60000;

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error || '');
}

function readErrorDetails(errObj: GeminiErrorShape): Array<Record<string, unknown>> {
  if (Array.isArray(errObj.details)) return errObj.details;
  return Array.isArray(errObj.errorDetails) ? errObj.errorDetails : [];
}

function isQuotaFailure(errObj: GeminiErrorShape, lower: string): boolean {
  const is429 =
    errObj.status === 429 ||
    errObj.code === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted');
  return is429 || lower.includes('quota') || lower.includes('rate limit');
}

/** Reads the retry delay and any daily-quota marker from google.rpc error details. */
function readDetailSignals(details: Array<Record<string, unknown>>): {
  retryDelayMs?: number;
  hasDailyMetadata: boolean;
} {
  let retryDelayMs: number | undefined;
  let hasDailyMetadata = false;
  for (const d of details) {
    if (d.retryDelay && typeof d.retryDelay === 'string') {
      const sec = parseFloat(d.retryDelay);
      if (!isNaN(sec)) retryDelayMs = sec * 1000;
    }
    if (d.metadata && typeof d.metadata === 'object') {
      const metaStr = JSON.stringify(d.metadata).toLowerCase();
      if (DAILY_METADATA_MARKERS.some((m) => metaStr.includes(m))) hasDailyMetadata = true;
    }
  }
  return { retryDelayMs, hasDailyMetadata };
}

function readDelayFromMessage(rawMsg: string): number | undefined {
  const delayMatch = rawMsg.match(/retry(?:Delay| after)?[:\s]+(\d+(?:\.\d+)?)\s*s/i);
  return delayMatch ? parseFloat(delayMatch[1]) * 1000 : undefined;
}

/**
 * Classifies a Gemini error as a per-minute or daily quota failure and extracts the
 * retry delay, from structured details first and the message text second.
 */
export function parseGeminiQuotaError(error: unknown): QuotaAnalysis {
  if (!error) return { isQuota: false, isDailyQuota: false };
  const rawMsg = readErrorMessage(error);
  const lower = rawMsg.toLowerCase();
  const errObj = error as GeminiErrorShape;
  if (!isQuotaFailure(errObj, lower)) return { isQuota: false, isDailyQuota: false };

  const signals = readDetailSignals(readErrorDetails(errObj));
  const retryDelayMs = signals.retryDelayMs ?? readDelayFromMessage(rawMsg);
  const isDaily =
    signals.hasDailyMetadata ||
    DAILY_MESSAGE_MARKERS.some((m) => lower.includes(m)) ||
    (retryDelayMs !== undefined && retryDelayMs > DAILY_RETRY_THRESHOLD_MS);

  const resetAt = isDaily ? Date.now() + (retryDelayMs ?? MS_PER_DAY) : undefined;
  const resetTimeFormatted = resetAt
    ? new Date(resetAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : undefined;

  return {
    isQuota: true,
    isDailyQuota: isDaily,
    retryDelayMs,
    retryDelaySeconds: retryDelayMs !== undefined ? Math.round(retryDelayMs / 1000) : undefined,
    resetAt,
    resetTimeFormatted,
  };
}

export function isTransientGeminiError(error: unknown): boolean {
  if (!error || isFatalGeminiError(error) || isGeminiConfigError(error)) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  const errObj = error as { status?: number; code?: number | string };
  const status = errObj.status ?? errObj.code;
  if (status === 429 || status === 503) return true;
  return (
    lower.includes('429') ||
    lower.includes('503') ||
    lower.includes('resource_exhausted') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded') ||
    lower.includes('quota')
  );
}

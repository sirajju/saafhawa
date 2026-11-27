import { redact } from '../logger';

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

export function parseGeminiQuotaError(error: unknown): QuotaAnalysis {
  if (!error) return { isQuota: false, isDailyQuota: false };
  const rawMsg =
    error instanceof Error
      ? error.message
      : error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error || '');
  const lower = rawMsg.toLowerCase();
  const errObj = error as {
    status?: number;
    code?: number | string;
    details?: Array<Record<string, unknown>>;
    errorDetails?: Array<Record<string, unknown>>;
  };

  const details = Array.isArray(errObj.details)
    ? errObj.details
    : Array.isArray(errObj.errorDetails)
      ? errObj.errorDetails
      : [];

  const is429 =
    errObj.status === 429 ||
    errObj.code === 429 ||
    lower.includes('429') ||
    lower.includes('resource_exhausted');
  const isQuota = is429 || lower.includes('quota') || lower.includes('rate limit');
  if (!isQuota) return { isQuota: false, isDailyQuota: false };

  let retryDelayMs: number | undefined;
  let hasDailyMetadata = false;

  for (const d of details) {
    if (d.retryDelay && typeof d.retryDelay === 'string') {
      const sec = parseFloat(d.retryDelay);
      if (!isNaN(sec)) retryDelayMs = sec * 1000;
    }
    if (d.metadata && typeof d.metadata === 'object') {
      const metaStr = JSON.stringify(d.metadata).toLowerCase();
      if (
        metaStr.includes('per_day') ||
        metaStr.includes('perday') ||
        metaStr.includes('requests_per_day') ||
        metaStr.includes('daily')
      ) {
        hasDailyMetadata = true;
      }
    }
  }

  if (retryDelayMs === undefined) {
    const delayMatch = rawMsg.match(/retry(?:Delay| after)?[:\s]+(\d+(?:\.\d+)?)\s*s/i);
    if (delayMatch) retryDelayMs = parseFloat(delayMatch[1]) * 1000;
  }

  const isDaily =
    hasDailyMetadata ||
    lower.includes('per day') ||
    lower.includes('per-day') ||
    lower.includes('daily') ||
    lower.includes('requests_per_day') ||
    lower.includes('perday') ||
    (retryDelayMs !== undefined && retryDelayMs > 60000);

  const resetAt = isDaily ? Date.now() + (retryDelayMs ?? 24 * 3600 * 1000) : undefined;
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

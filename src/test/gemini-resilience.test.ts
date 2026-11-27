import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithGeminiRetry } from '@/lib/gemini/executor';
import {
  isFatalGeminiError,
  isGeminiConfigError,
  isTransientGeminiError,
  sanitizeErrorMessage,
} from '@/lib/gemini/quota';

describe('Gemini Resilience & Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects fatal auth errors (401, 403), config errors (404, 400), and transient errors (429, 503)', () => {
    expect(isFatalGeminiError(new Error('401 Unauthorized: Invalid API key'))).toBe(true);
    expect(isFatalGeminiError(new Error('403 Forbidden: Permission denied'))).toBe(true);
    expect(isFatalGeminiError(new Error('400 Bad Request: Invalid argument'))).toBe(false);
    expect(isFatalGeminiError(new Error('503 Service Unavailable'))).toBe(false);

    expect(
      isGeminiConfigError(
        new Error('404 Not Found: models/gemini-flash-lite-latest not found for API version v1')
      )
    ).toBe(true);
    expect(
      isGeminiConfigError(new Error('400 Developer instruction is not enabled for api version v1'))
    ).toBe(true);
    expect(isGeminiConfigError(new Error('503 Service Unavailable'))).toBe(false);

    expect(isTransientGeminiError(new Error('503 Service Unavailable: High demand'))).toBe(true);
    expect(isTransientGeminiError(new Error('429 Resource Exhausted'))).toBe(true);
    expect(isTransientGeminiError(new Error('Model is overloaded'))).toBe(true);
    expect(isTransientGeminiError(new Error('401 Unauthorized'))).toBe(false);
    expect(isTransientGeminiError(new Error('404 Not Found'))).toBe(false);
    expect(isTransientGeminiError(new Error('400 Bad Request'))).toBe(false);
  });

  it('sanitizes API keys and sensitive tokens from error messages', () => {
    const raw =
      'Error calling https://generativelanguage.googleapis.com?key=AIzaSyD123456789SecretKey: 503 busy';
    const clean = sanitizeErrorMessage(raw);
    expect(clean).not.toContain('AIzaSyD123456789SecretKey');
    expect(clean).toContain('key=[REDACTED]');
  });

  it('executes successfully on first attempt with primary model', async () => {
    const fn = vi.fn().mockResolvedValue('ok-result');
    const res = await executeWithGeminiRetry({
      label: 'test-success',
      primaryModel: 'gemini-3.8-flash',
      fn,
      maxRetriesPerModel: 2,
      initialBackoffMs: 5,
    });

    expect(res.data).toBe('ok-result');
    expect(res.modelUsed).toBe('gemini-3.8-flash');
    expect(res.failedDueToBusy).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('gemini-3.8-flash', expect.any(Number));
  });

  it('retries on 503 and succeeds on 2nd attempt without switching model', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('503 Service Unavailable: high demand'))
      .mockResolvedValueOnce('retry-success');

    const res = await executeWithGeminiRetry({
      label: 'test-retry',
      primaryModel: 'gemini-3.8-flash',
      fn,
      maxRetriesPerModel: 2,
      initialBackoffMs: 5,
    });

    expect(res.data).toBe('retry-success');
    expect(res.modelUsed).toBe('gemini-3.8-flash');
    expect(res.failedDueToBusy).toBe(false);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('never retries on 401 or 403 fatal errors', async () => {
    const err = new Error('403 Forbidden: API key has expired');
    const fn = vi.fn().mockRejectedValue(err);

    const res = await executeWithGeminiRetry({
      label: 'test-fatal',
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-2.5-flash',
      fn,
      maxRetriesPerModel: 2,
      initialBackoffMs: 5,
    });

    expect(res.data).toBeNull();
    expect(res.failedDueToBusy).toBe(false);
    expect(res.error).toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('falls back to secondary model when primary model exhausts retries with 503', async () => {
    const fn = vi.fn().mockImplementation((model: string) => {
      if (model === 'gemini-3.8-flash') {
        return Promise.reject(new Error('503 Service Unavailable: overloaded'));
      }
      return Promise.resolve('fallback-model-success');
    });

    const res = await executeWithGeminiRetry({
      label: 'test-fallback-model',
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-2.5-flash',
      fn,
      maxRetriesPerModel: 1,
      initialBackoffMs: 5,
    });

    expect(res.data).toBe('fallback-model-success');
    expect(res.modelUsed).toBe('gemini-2.5-flash');
    expect(res.failedDueToBusy).toBe(false);
    expect(fn).toHaveBeenCalledWith('gemini-3.8-flash', expect.any(Number));
    expect(fn).toHaveBeenCalledWith('gemini-2.5-flash', expect.any(Number));
  });

  it('treats 404 and 400 as configuration errors: does not retry, tries fallback model once, and logs clearly', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = vi.fn().mockImplementation((model: string) => {
      if (model === 'gemini-flash-lite-latest') {
        return Promise.reject(
          new Error(
            '404 Not Found: models/gemini-flash-lite-latest is not found for API version v1'
          )
        );
      }
      return Promise.resolve('fallback-model-worked');
    });

    const res = await executeWithGeminiRetry({
      label: 'test-config-404',
      primaryModel: 'gemini-flash-lite-latest',
      fallbackModel: 'gemini-2.5-flash-lite',
      fn,
      maxRetriesPerModel: 2,
    });

    expect(res.data).toBe('fallback-model-worked');
    expect(res.modelUsed).toBe('gemini-2.5-flash-lite');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'gemini-flash-lite-latest', expect.any(Number));
    expect(fn).toHaveBeenNthCalledWith(2, 'gemini-2.5-flash-lite', expect.any(Number));
    expect(warnSpy).toHaveBeenCalledWith(
      '[test-config-404]',
      expect.stringContaining('Configuration error on model gemini-flash-lite-latest (404/400)')
    );
    warnSpy.mockRestore();
  });

  it('marks failedDueToBusy: true when all retries and fallback models fail on 429/503', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('429 Resource Exhausted: Rate limit exceeded'));

    const res = await executeWithGeminiRetry({
      label: 'test-all-busy',
      primaryModel: 'gemini-3.8-flash',
      fallbackModel: 'gemini-2.5-flash',
      fn,
      maxRetriesPerModel: 1,
      initialBackoffMs: 5,
    });

    expect(res.data).toBeNull();
    expect(res.failedDueToBusy).toBe(true);
  });
});

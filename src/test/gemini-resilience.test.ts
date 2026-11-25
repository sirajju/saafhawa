import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  executeWithGeminiRetry,
  isFatalGeminiError,
  isTransientGeminiError,
  sanitizeErrorMessage,
} from '@/lib/gemini-executor';
import { getClientIp } from '@/lib/rate-limit';

describe('Gemini Resilience & Retry Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects fatal 400, 401, 403 errors and transient 429, 503 errors', () => {
    expect(isFatalGeminiError(new Error('400 Bad Request: Invalid argument'))).toBe(true);
    expect(isFatalGeminiError(new Error('401 Unauthorized: Invalid API key'))).toBe(true);
    expect(isFatalGeminiError(new Error('403 Forbidden: Permission denied'))).toBe(true);
    expect(isFatalGeminiError(new Error('503 Service Unavailable'))).toBe(false);

    expect(isTransientGeminiError(new Error('503 Service Unavailable: High demand'))).toBe(true);
    expect(isTransientGeminiError(new Error('429 Resource Exhausted'))).toBe(true);
    expect(isTransientGeminiError(new Error('Model is overloaded'))).toBe(true);
    expect(isTransientGeminiError(new Error('401 Unauthorized'))).toBe(false);
  });

  it('sanitizes API keys and sensitive tokens from error messages', () => {
    const raw = 'Error calling https://generativelanguage.googleapis.com?key=AIzaSyD123456789SecretKey: 503 busy';
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
    const fn = vi.fn()
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

describe('Vercel Rate Limiter Client IP Resolution', () => {
  const origVercel = process.env.VERCEL;

  afterEach(() => {
    if (origVercel !== undefined) {
      process.env.VERCEL = origVercel;
    } else {
      delete process.env.VERCEL;
    }
  });

  it('extracts first IP in x-forwarded-for when running on Vercel', () => {
    process.env.VERCEL = '1';
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: {
        'x-forwarded-for': '203.0.113.195, 10.0.0.1, 10.0.0.2',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.195');
  });

  it('extracts x-real-ip when on Vercel and x-forwarded-for is missing', () => {
    process.env.VERCEL = '1';
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: {
        'x-real-ip': '198.51.100.42',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('198.51.100.42');
  });
});

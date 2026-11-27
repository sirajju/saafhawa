import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveGeminiModels, DEFAULT_GEMINI_MODELS } from '@/lib/gemini/client';
import { executeWithGeminiRetry } from '@/lib/gemini/executor';
import { modelExhaustionMap, clearModelExhaustion } from '@/lib/gemini/quota';

describe('GEMINI_MODELS chain resolution & ordered fallback', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    clearModelExhaustion();
    delete process.env.GEMINI_MODELS;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_FALLBACK_MODEL;
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('resolves explicit options.models with deduplication', () => {
    const res = resolveGeminiModels({
      models: ['model-a', ' model-b ', 'model-a', 'model-c'],
    });
    expect(res).toEqual(['model-a', 'model-b', 'model-c']);
  });

  it('resolves comma-separated GEMINI_MODELS environment variable', () => {
    process.env.GEMINI_MODELS = 'gemini-flash-lite-latest, gemini-2.5-flash-lite, gemini-3.8-flash';
    const res = resolveGeminiModels();
    expect(res).toEqual(['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-3.8-flash']);
  });

  it('falls back to GEMINI_MODEL and GEMINI_FALLBACK_MODEL when GEMINI_MODELS is unset', () => {
    process.env.GEMINI_MODEL = 'custom-primary';
    process.env.GEMINI_FALLBACK_MODEL = 'custom-fallback';
    const res = resolveGeminiModels();
    expect(res).toEqual(['custom-primary', 'custom-fallback']);
  });

  it('uses DEFAULT_GEMINI_MODELS when no env vars or options are provided', () => {
    const res = resolveGeminiModels();
    expect(res).toEqual([...DEFAULT_GEMINI_MODELS]);
  });

  it('tries models in order and skips already exhausted models', async () => {
    const models = ['model-alpha', 'model-beta', 'model-gamma'];
    modelExhaustionMap.set('model-alpha', Date.now() + 3600000);

    const fn = vi.fn().mockImplementation(async (activeModel: string) => {
      return activeModel === 'model-beta' ? 'success-from-beta' : 'other';
    });

    const res = await executeWithGeminiRetry({ models, fn, label: 'ChainTest' });
    expect(res.data).toBe('success-from-beta');
    expect(res.modelUsed).toBe('model-beta');
    expect(fn).not.toHaveBeenCalledWith('model-alpha', expect.any(Number));
    expect(fn).toHaveBeenCalledWith('model-beta', expect.any(Number));
  });

  it('switches immediately to next model on daily quota error and saves exhaustion', async () => {
    const models = ['model-1', 'model-2', 'model-3'];
    const fn = vi.fn().mockImplementation(async (activeModel: string) => {
      if (activeModel === 'model-1') {
        throw {
          status: 429,
          message: 'Resource exhausted for daily quota per day',
          errorDetails: [
            {
              '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
              reason: 'QUOTA_EXCEEDED',
              metadata: { quota_limit: 'GenerateRequestsPerDayPerProject' },
            },
          ],
        };
      }
      return activeModel === 'model-2' ? 'success-from-model-2' : null;
    });

    const res = await executeWithGeminiRetry({ models, fn, label: 'DailyQuotaSwitch' });
    expect(res.data).toBe('success-from-model-2');
    expect(res.modelUsed).toBe('model-2');
    expect(modelExhaustionMap.has('model-1')).toBe(true);
  });

  it('skips retries on 404/400 config error and tries next candidate model', async () => {
    const models = ['bad-model', 'good-model'];
    const fn = vi.fn().mockImplementation(async (activeModel: string) => {
      if (activeModel === 'bad-model') {
        throw new Error('404 Not Found: models/bad-model not found for api version v1beta');
      }
      return 'good-result';
    });

    const res = await executeWithGeminiRetry({
      models,
      fn,
      maxRetriesPerModel: 2,
      label: 'ConfigErrorSwitch',
    });
    expect(res.data).toBe('good-result');
    expect(res.modelUsed).toBe('good-model');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'bad-model', expect.any(Number));
    expect(fn).toHaveBeenNthCalledWith(2, 'good-model', expect.any(Number));
  });
});

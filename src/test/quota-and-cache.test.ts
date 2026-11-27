import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeWithGeminiRetry } from '@/lib/gemini/executor';
import { parseGeminiQuotaError, clearModelExhaustion } from '@/lib/gemini/quota';
import {
  buildPlanCacheKey,
  getCachedPlan,
  setCachedPlan,
  buildAdvisoryCacheKey,
  getCachedAdvisory,
  setCachedAdvisory,
  clearGeminiCache,
} from '@/lib/gemini/cache';
import { pruneCleanAirActions } from '@/lib/plan/action-scoring';
import { ACTION_CATALOGUE, type ActionDefinition } from '@/lib/impact/catalogue';
import { type PlanResponse, type GeminiSelectedAction } from '@/lib/plan/types';
import { type AdvisoryResponse } from '@/lib/community/types';

describe('Gemini Quota Handling & Caching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearModelExhaustion();
    clearGeminiCache();
  });

  it('parses per-day quota exhaustion and retry delay from 429 details', () => {
    const errorWithDetails = {
      message: 'Resource has been exhausted (e.g. check quota).',
      status: 429,
      errorDetails: [
        {
          '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
          reason: 'QUOTA_EXCEEDED',
          metadata: { quota_limit: 'GenerateRequestsPerDayPerProject' },
        },
        { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3600s' },
      ],
    };

    const quotaInfo = parseGeminiQuotaError(errorWithDetails);
    expect(quotaInfo.isQuota).toBe(true);
    expect(quotaInfo.isDailyQuota).toBe(true);
    expect(quotaInfo.retryDelaySeconds).toBe(3600);
    expect(quotaInfo.resetTimeFormatted).toMatch(/\d{1,2}:\d{2}\s*(AM|PM)/i);
  });

  it('switches immediately to fallback model on per-day 429 without retrying primary model', async () => {
    const dayQuotaError = {
      message: '429 Quota exceeded: Resource exhausted for daily quota per day',
      status: 429,
    };

    const fn = vi.fn().mockImplementation(async (model: string) => {
      if (model === 'gemini-flash-lite-latest') {
        throw dayQuotaError;
      }
      return 'fallback-model-success';
    });

    const res = await executeWithGeminiRetry<string>({
      label: 'quota-test',
      primaryModel: 'gemini-flash-lite-latest',
      fallbackModel: 'gemini-2.5-flash-lite',
      fn,
      maxRetriesPerModel: 2,
      initialBackoffMs: 5,
    });

    expect(res.data).toBe('fallback-model-success');
    expect(res.modelUsed).toBe('gemini-2.5-flash-lite');
    // Primary model called once, then immediately to fallback
    expect(fn).toHaveBeenCalledTimes(2);

    // Subsequent request skips exhausted primary model entirely
    const fn2 = vi.fn().mockImplementation(async (model: string) => `second-${model}`);
    const res2 = await executeWithGeminiRetry<string>({
      label: 'quota-test-2',
      primaryModel: 'gemini-flash-lite-latest',
      fallbackModel: 'gemini-2.5-flash-lite',
      fn: fn2,
      initialBackoffMs: 5,
    });

    expect(res2.modelUsed).toBe('gemini-2.5-flash-lite');
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledWith('gemini-2.5-flash-lite', expect.any(Number));
  });

  it('marks failedDueToDailyQuota when all models hit per-day limits', async () => {
    const dayQuotaError = {
      message: '429 per_day quota exceeded',
      errorDetails: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '1800s' }],
    };

    const fn = vi.fn().mockRejectedValue(dayQuotaError);
    const res = await executeWithGeminiRetry<string>({
      label: 'all-exhausted',
      primaryModel: 'gemini-flash-lite-latest',
      fallbackModel: 'gemini-2.5-flash-lite',
      fn,
      initialBackoffMs: 5,
    });

    expect(res.data).toBeNull();
    expect(res.failedDueToDailyQuota).toBe(true);
    expect(res.dailyQuotaResetTime).toBeDefined();
    expect(res.dailyQuotaResetTime).toMatch(/\d{1,2}:\d{2}/);
  });

  it('caches plan responses for 30 minutes and returns cached copy', () => {
    const key = buildPlanCacheKey('11.2551, 75.8287', {
      place: '11.2551, 75.8287',
      adultsCount: 2,
      childrenCount: 1,
      elderlyCount: 0,
      commutersCount: 0,
      hasAsthmaOrRespiratoryCondition: false,
      primaryCommuteMode: 'none',
      cookingFuel: 'lpg',
      hasAirPurifier: false,
    } as unknown as PlanResponse['householdProfile']);

    expect(getCachedPlan(key)).toBeNull();
    const fakePlan = { id: 'plan-123', location: { name: 'Kozhikode' } } as unknown as PlanResponse;
    setCachedPlan(key, fakePlan);
    expect(getCachedPlan(key)).toEqual(fakePlan);
  });

  it('caches community advisories per place, audience, language, and hour', () => {
    const key = buildAdvisoryCacheKey('Kozhikode, Kerala', 'housing_society', 'en');
    expect(getCachedAdvisory(key)).toBeNull();

    const fakeAdvisory: AdvisoryResponse = {
      headline: 'Kozhikode Society Advisory',
      advisoryText: 'Keep windows open during clean afternoon hours.',
      audience: 'housing_society',
      language: 'en',
      airQualitySnapshot: {
        locationName: 'Kozhikode',
        aqi: 45,
        category: 'Good',
        pm25UgM3: 15,
      },
    };
    setCachedAdvisory(key, fakeAdvisory);
    expect(getCachedAdvisory(key)).toEqual(fakeAdvisory);
  });

  it('prunes smog actions under clean air conditions', () => {
    const selectedActions: GeminiSelectedAction[] = [
      {
        actionId: 'keep_children_indoors_morning_smog',
        suggestedTimeOfDay: 'Morning',
        reason: 'Smog',
      },
      {
        actionId: 'seal_windows_during_peak_inversion',
        suggestedTimeOfDay: 'Morning',
        reason: 'Smog',
      },
      { actionId: 'damp_mop_surfaces_daily', suggestedTimeOfDay: 'Daytime', reason: 'Hygiene' },
      { actionId: 'wear_n95_mask_outside', suggestedTimeOfDay: 'Morning', reason: 'Smog' },
    ];

    const catalogueMap = new Map<string, ActionDefinition>(ACTION_CATALOGUE.map((a) => [a.id, a]));
    const pruned = pruneCleanAirActions(selectedActions, true, catalogueMap);
    const prunedIds = pruned.map((a) => a.actionId);

    expect(prunedIds).not.toContain('keep_children_indoors_morning_smog');
    expect(prunedIds).not.toContain('seal_windows_during_peak_inversion');
    expect(prunedIds).not.toContain('wear_n95_mask_outside');
    expect(prunedIds).toContain('damp_mop_surfaces_daily');
  });
});

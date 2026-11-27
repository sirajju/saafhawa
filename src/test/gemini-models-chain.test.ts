import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveGeminiModels, DEFAULT_GEMINI_MODELS } from '@/lib/gemini/client';
import { executeWithGeminiRetry } from '@/lib/gemini/executor';
import { modelExhaustionMap, clearModelExhaustion } from '@/lib/gemini/quota';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { handleChatQuery } from '@/lib/chat/service';
import { generateCommunityAdvisory } from '@/lib/community/advisory-generator';
import { AirQualityReport } from '@/lib/air-quality/types';

function makeMockReport(name: string, aqi: number): AirQualityReport {
  return {
    location: { name, latitude: 12.97, longitude: 77.59, timeZone: 'Asia/Kolkata' },
    current: {
      dateTime: '2026-11-26T06:00:00.000Z',
      aqi,
      category: aqi > 200 ? 'Poor' : 'Moderate',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: { value: 65, units: 'ug/m3' },
      pm10: { value: 120, units: 'ug/m3' },
      dataSource: 'Open-Meteo',
    },
    hourlyForecast: [],
    dataSource: 'cpcb',
  };
}

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
          errorDetails: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'QUOTA_EXCEEDED', metadata: { quota_limit: 'GenerateRequestsPerDayPerProject' } }],
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

    const res = await executeWithGeminiRetry({ models, fn, maxRetriesPerModel: 2, label: 'ConfigErrorSwitch' });
    expect(res.data).toBe('good-result');
    expect(res.modelUsed).toBe('good-model');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'bad-model', expect.any(Number));
    expect(fn).toHaveBeenNthCalledWith(2, 'good-model', expect.any(Number));
  });

  it('reports which model answered in generateHouseholdPlan', async () => {
    const mockReport = makeMockReport('Bengaluru', 120);
    const validJson = JSON.stringify({
      selectedActions: [
        { actionId: 'ventilate_at_cleanest_afternoon_hour', suggestedTimeOfDay: 'midday', reason: 'Ventilate during low PM2.5 window' },
        { actionId: 'diy_corsi_rosenthal_box', suggestedTimeOfDay: 'evening', reason: 'Filter indoor dust' },
        { actionId: 'wet_mop_instead_of_dry_sweeping', suggestedTimeOfDay: 'morning', reason: 'Control settled particles' },
        { actionId: 'eliminate_incense_and_mosquito_coils', suggestedTimeOfDay: 'morning', reason: 'Reduce indoor emissions' },
      ],
    });

    const plan = await generateHouseholdPlan(
      { place: 'Bengaluru', budgetLevel: 'low', hasChildren: true, hasElderly: false },
      {
        apiKey: 'test-key',
        models: ['model-first', 'model-second'],
        airQualityFetcher: async () => mockReport,
        geminiGenerator: async (_sys, _prompt, activeModel) => {
          if (activeModel === 'model-first') throw new Error('503 Service Unavailable');
          return validJson;
        },
      }
    );

    expect(plan.generationMethod).toBe('gemini');
    expect(plan.modelUsed).toBe('model-second');
  });

  it('reports which model answered in handleChatQuery', async () => {
    const mockReport = makeMockReport('Delhi', 200);
    const res = await handleChatQuery(
      { message: 'What is the AQI?', place: 'Delhi' },
      { apiKey: 'test-key', models: ['primary-chat', 'backup-chat'], airQualityFetcher: async () => mockReport }
    );
    expect(res).toBeDefined();
  });

  it('reports which model answered in generateCommunityAdvisory', async () => {
    const mockReport = makeMockReport('Kozhikode', 85);
    const advisory = await generateCommunityAdvisory(
      { place: 'Kozhikode', audience: 'housing_society', language: 'en' },
      { apiKey: 'test-key', models: ['adv-model-1', 'adv-model-2'], airQualityFetcher: async () => mockReport }
    );
    expect(advisory).toBeDefined();
    expect(advisory.headline).toContain('Kozhikode');
  });
});

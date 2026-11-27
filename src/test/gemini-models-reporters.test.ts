import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearModelExhaustion } from '@/lib/gemini/quota';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { handleChatQuery } from '@/lib/chat/service';
import { generateCommunityAdvisory } from '@/lib/community/advisory-generator';
import { type AirQualityReport } from '@/lib/air-quality/types';

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

describe('GEMINI_MODELS chain reporters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearModelExhaustion();
  });

  it('reports which model answered in generateHouseholdPlan', async () => {
    const mockReport = makeMockReport('Bengaluru', 120);
    const validJson = JSON.stringify({
      selectedActions: [
        {
          actionId: 'ventilate_at_cleanest_afternoon_hour',
          suggestedTimeOfDay: 'midday',
          reason: 'Ventilate during low PM2.5 window',
        },
        {
          actionId: 'diy_corsi_rosenthal_box',
          suggestedTimeOfDay: 'evening',
          reason: 'Filter indoor dust',
        },
        {
          actionId: 'wet_mop_instead_of_dry_sweeping',
          suggestedTimeOfDay: 'morning',
          reason: 'Control settled particles',
        },
        {
          actionId: 'eliminate_incense_and_mosquito_coils',
          suggestedTimeOfDay: 'morning',
          reason: 'Reduce indoor emissions',
        },
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
      {
        apiKey: 'test-key',
        models: ['primary-chat', 'backup-chat'],
        airQualityFetcher: async () => mockReport,
      }
    );
    expect(res).toBeDefined();
  });

  it('reports which model answered in generateCommunityAdvisory', async () => {
    const mockReport = makeMockReport('Kozhikode', 85);
    const advisory = await generateCommunityAdvisory(
      { place: 'Kozhikode', audience: 'housing_society', language: 'en' },
      {
        apiKey: 'test-key',
        models: ['adv-model-1', 'adv-model-2'],
        airQualityFetcher: async () => mockReport,
      }
    );
    expect(advisory).toBeDefined();
    expect(advisory.headline).toContain('Kozhikode');
  });
});

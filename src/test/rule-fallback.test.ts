import { describe, it, expect } from 'vitest';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';
import { getRuleBasedFallbackActions } from '@/lib/plan/fallback';
import { MOCK_PROFILE } from '@/test/plan-fixtures';

describe('Rule-Based Clean Air Fallback Selection', () => {
  it('scales hero advice to Satisfactory AQI without pushing best window or stay indoors tonight', () => {
    const forecast = Array.from({ length: 24 }, (_, i) => ({
      dateTime: new Date(Date.now() + i * 3600000).toISOString(),
      aqi: 50 + (i % 8),
      category: 'Satisfactory',
      dominantPollutant: 'pm25',
    }));

    const advice = buildForecastAdvice(54, forecast, {
      ...MOCK_PROFILE,
      hasAsthmaOrRespiratoryCondition: true,
    });

    expect(advice.plainAdvice.toLowerCase()).not.toContain('avoid strenuous outdoor activities tonight');
    expect(advice.plainAdvice.toLowerCase()).not.toContain('cleanest window: tomorrow');
    expect(advice.plainAdvice.toLowerCase()).toContain('satisfactory');
    expect(advice.plainAdvice.toLowerCase()).toContain('asthma');
  });

  it('does not push N95 masks or sealed windows when air is clean or satisfactory', () => {
    const mockCleanReport = {
      location: { name: 'Kozhikode, Kerala', latitude: 11.2551, longitude: 75.8287 },
      current: {
        dateTime: new Date().toISOString(),
        aqi: 54,
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        indexCode: 'cpcb',
        indexDisplayName: 'CPCB AQI',
        pm25: { value: 16, units: 'µg/m³' },
        pm10: { value: 35, units: 'µg/m³' },
      },
      hourlyForecast: Array.from({ length: 24 }, (_, i) => ({
        dateTime: new Date(Date.now() + i * 3600000).toISOString(),
        aqi: 50 + (i % 6),
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        indexCode: 'cpcb',
        indexDisplayName: 'CPCB AQI',
        pm25: { value: 15, units: 'µg/m³' },
        pm10: { value: 30, units: 'µg/m³' },
      })),
    };

    const actions = getRuleBasedFallbackActions(MOCK_PROFILE, mockCleanReport);
    const actionIds = actions.map((a) => a.actionId);
    expect(actionIds).not.toContain('wear_n95_mask_outside');
    expect(actionIds).not.toContain('seal_windows_during_peak_inversion');
    expect(actionIds).not.toContain('keep_children_indoors_morning_smog');
  });
});

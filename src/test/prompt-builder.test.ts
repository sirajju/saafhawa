import { describe, it, expect } from 'vitest';
import { buildPlanPrompt } from '@/lib/plan/prompt-builder';
import { MOCK_PROFILE } from './plan-fixtures';
import { AirQualityReport } from '@/lib/air-quality/types';

describe('Plan Prompt Builder', () => {
  const mockReport: AirQualityReport = {
    location: { name: 'Connaught Place, Delhi', latitude: 28.63, longitude: 77.22, timeZone: 'Asia/Kolkata' },
    current: {
      dateTime: '2026-11-26T10:00:00Z',
      aqi: 220,
      category: 'Poor',
      dominantPollutant: 'pm25',
      pm25: { value: 95, units: 'µg/m³' },
      pm10: { value: 160, units: 'µg/m³' },
    },
    hourlyForecast: [],
  };

  it('builds system instruction and user prompt with clinical rules and occupant demographics', () => {
    const profile = {
      ...MOCK_PROFILE,
      hasAsthmaOrRespiratoryCondition: true,
      childrenCount: 2,
      elderlyCount: 1,
    };

    const { systemInstruction, userPrompt } = buildPlanPrompt(profile, mockReport, undefined, '12 PM to 3 PM');

    expect(systemInstruction).toContain('CLINICAL RULES');
    expect(systemInstruction).toContain('12 PM to 3 PM');
    expect(userPrompt).toContain('Connaught Place, Delhi');
    expect(userPrompt).toContain('Asthma / Respiratory condition');
    expect(userPrompt).toContain('2 Child(ren)');
    expect(userPrompt).toContain('1 Senior(s)');
    expect(userPrompt).toContain('Current AQI: 220');
    expect(userPrompt).toContain('Action Catalogue:');
  });

  it('handles household with no reported vulnerabilities gracefully', () => {
    const profile = {
      ...MOCK_PROFILE,
      hasAsthmaOrRespiratoryCondition: false,
      childrenCount: 0,
      elderlyCount: 0,
    };

    const { userPrompt } = buildPlanPrompt(profile, mockReport);
    expect(userPrompt).toContain('No high-risk health conditions reported');
  });
});

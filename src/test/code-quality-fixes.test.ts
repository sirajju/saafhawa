import { describe, it, expect } from 'vitest';
import { PlanRequestSchema } from '@/lib/plan/types';
import { DEFAULT_PROFILE } from '@/components/onboarding/default-profile';
import { ChatRequestSchema } from '@/lib/chat/types';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';
import { getAqiCategoryDetails } from '@/lib/impact/category-details';
import { buildPlanCacheKey } from '@/lib/gemini-cache';
import { MOCK_PROFILE } from './plan-fixtures';

describe('Code Quality & Bug Fixes 1-4', () => {
  it('Fix 1: validates coordinates format as "lat, lon" with max length 50', () => {
    const valid = PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '12.9716, 77.5946' });
    expect(valid.coordinates).toBe('12.9716, 77.5946');

    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: 'InvalidCityName' })).toThrow(/lat, lon/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '12.97, 77.59' + '0'.repeat(45) })).toThrow(/50 characters/);
  });

  it('Fix 2: onboarding starts with empty place and schemas require place without 110001 defaults', () => {
    expect(DEFAULT_PROFILE.place).toBe('');

    expect(() => ChatRequestSchema.parse({ message: 'Hello' })).toThrow();
    expect(() => AdvisoryRequestSchema.parse({})).toThrow();

    const validChat = ChatRequestSchema.parse({ message: 'Hello', place: 'Kolkata' });
    expect(validChat.place).toBe('Kolkata');
  });

  it('Fix 3: never invents air quality values when AQI or category is missing', () => {
    const advice = buildForecastAdvice(null, [], null);
    expect(advice.plainAdvice).not.toContain('300');
    expect(advice.plainAdvice).not.toContain('200');
    expect(advice.plainAdvice).not.toContain('Severe');

    const details = getAqiCategoryDetails(null, null);
    expect(details.categoryText).toBe('unavailable');
  });

  it('Fix 4: builds plan cache key from stable JSON of the whole profile', () => {
    const profileA = { ...MOCK_PROFILE, homeAreaSqFt: 1200, exerciseHoursPerDay: 1 };
    const profileB = { ...MOCK_PROFILE, homeAreaSqFt: 1500, exerciseHoursPerDay: 1 };
    const profileAKeyReordered = JSON.parse(JSON.stringify(profileA));

    const keyA1 = buildPlanCacheKey('Delhi', profileA);
    const keyA2 = buildPlanCacheKey('Delhi', profileAKeyReordered);
    const keyB = buildPlanCacheKey('Delhi', profileB);

    expect(keyA1).toBe(keyA2);
    expect(keyA1).not.toBe(keyB);
  });
});

import { describe, it, expect } from 'vitest';
import { buildPlanCacheKey } from '@/lib/gemini-cache';
import { MOCK_PROFILE } from './plan-fixtures';

describe('Plan Cache Key Hashing', () => {
  it('builds plan cache key from stable JSON of the whole profile', () => {
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

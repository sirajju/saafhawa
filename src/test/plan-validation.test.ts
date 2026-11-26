import { describe, it, expect } from 'vitest';
import {
  buildPlanPrompt,
  PlanRequestSchema,
} from '@/lib/plan';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './plan-fixtures';

describe('Plan Module - Zod Validation', () => {
  it('validates a complete household profile correctly', () => {
    const validated = PlanRequestSchema.parse(MOCK_PROFILE);
    expect(validated.place).toBe('110001');
    expect(validated.adultsCount).toBe(2);
    expect(validated.hasAsthmaOrRespiratoryCondition).toBe(true);
  });

  it('rejects profiles with invalid or empty place names', () => {
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, place: '' })).toThrow();
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, place: 'a' })).toThrow();
  });

  it('rejects profiles with place name > 120 characters', () => {
    expect(() =>
      PlanRequestSchema.parse({ ...MOCK_PROFILE, place: 'X'.repeat(121) })
    ).toThrow();
  });

  it('rejects profiles with adultsCount < 1', () => {
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, adultsCount: 0 })).toThrow();
  });

  it('rejects absurd inputs exceeding upper limits on people, distance, and home area', () => {
    // Absurd adults count
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, adultsCount: 31 })).toThrow(/Cannot exceed 30 adults/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, adultsCount: 9999 })).toThrow();

    // Absurd children and elderly counts
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, childrenCount: 31 })).toThrow(/Cannot exceed 30 children/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, elderlyCount: 31 })).toThrow(/Cannot exceed 30 seniors/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, commutersCount: 31 })).toThrow(/Cannot exceed 30 commuters/);

    // Absurd commute distance
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, dailyCommuteDistanceKm: 301 })).toThrow(/cannot exceed 300 km/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, dailyCommuteDistanceKm: 50000 })).toThrow();

    // Absurd home area
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, homeAreaSqFt: 25001 })).toThrow(/cannot exceed 25,000 sq ft/);
    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, homeAreaSqFt: 40 })).toThrow(/at least 50 sq ft/);
  });

  it('validates coordinates format as "lat, lon" with maximum length of 50', () => {
    const validCoords = PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '11.2551, 75.8287' });
    expect(validCoords.coordinates).toBe('11.2551, 75.8287');

    const omittedCoords = PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: undefined });
    expect(omittedCoords.coordinates).toBeUndefined();

    expect(() => PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: 'Mumbai' })).toThrow(/lat, lon/);
    expect(() =>
      PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '11.2551, 75.8287' + '0'.repeat(45) })
    ).toThrow(/cannot exceed 50 characters/);
  });
});

describe('Plan Module - Prompt Builder', () => {
  it('builds system instruction and user prompt containing profile, AQI, and strict constraints', () => {
    const { systemInstruction, userPrompt } = buildPlanPrompt(MOCK_PROFILE, MOCK_AIR_QUALITY);

    // Negative constraints
    expect(systemInstruction).toContain('DO NOT include, calculate, or mention any numbers');
    expect(systemInstruction).toContain('Select ONLY valid action IDs');

    // Profile details
    expect(userPrompt).toContain('Connaught Place');
    expect(userPrompt).toContain('Asthma / Respiratory condition');
    expect(userPrompt).toContain('1 Child(ren)');
    expect(userPrompt).toContain('1 Senior(s)');
    expect(userPrompt).toContain('petrol_car');
    expect(userPrompt).toContain('Current AQI: 342');
    expect(userPrompt).toContain('wear_n95_mask_outside');
  });
});

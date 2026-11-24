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

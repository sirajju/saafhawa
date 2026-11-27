import { describe, it, expect } from 'vitest';
import { PlanRequestSchema } from '@/lib/plan/types';
import { DEFAULT_PROFILE } from '@/components/onboarding/default-profile';
import { ChatRequestSchema } from '@/lib/chat/types';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { MOCK_PROFILE } from './plan-fixtures';

describe('Plan and Request Schemas Validation', () => {
  it('validates coordinates format as "lat, lon" with max length 50', () => {
    const valid = PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '12.9716, 77.5946' });
    expect(valid.coordinates).toBe('12.9716, 77.5946');
    const validNegative = PlanRequestSchema.parse({
      ...MOCK_PROFILE,
      coordinates: '-33.8688, 151.2093',
    });
    expect(validNegative.coordinates).toBe('-33.8688, 151.2093');

    expect(() =>
      PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: 'InvalidCityName' })
    ).toThrow(/lat, lon/);
    expect(() =>
      PlanRequestSchema.parse({ ...MOCK_PROFILE, coordinates: '12.97, 77.59' + '0'.repeat(45) })
    ).toThrow(/50 characters/);
  });

  it('onboarding starts with empty place and schemas require place without 110001 defaults', () => {
    expect(DEFAULT_PROFILE.place).toBe('');

    expect(() => ChatRequestSchema.parse({ message: 'Hello' })).toThrow();
    expect(() => AdvisoryRequestSchema.parse({})).toThrow();

    const validChat = ChatRequestSchema.parse({ message: 'Hello', place: 'Kolkata' });
    expect(validChat.place).toBe('Kolkata');
  });
});

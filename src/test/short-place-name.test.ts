import { describe, it, expect } from 'vitest';
import { getShortPlaceName } from '@/lib/design-system';

describe('getShortPlaceName', () => {
  it('uses a neutral label instead of assuming a city when no place is known', () => {
    expect(getShortPlaceName(undefined)).toBe('your area');
    expect(getShortPlaceName('   ')).toBe('your area');
  });

  it('keeps a bare pincode', () => {
    expect(getShortPlaceName('673001')).toBe('673001');
  });

  it('returns the first locality and drops pincodes and station suffixes', () => {
    expect(getShortPlaceName('Kozhikode 673001, Kerala, India')).toBe('Kozhikode');
    expect(getShortPlaceName('Bandra, Mumbai · Station: Bandra Kurla')).toBe('Bandra');
  });

  it('prefers the locality for Delhi addresses', () => {
    expect(getShortPlaceName('Connaught Place, New Delhi, Delhi 110001, India')).toBe(
      'Connaught Place'
    );
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleTtlCache, normalizeLocationKey } from '@/lib/air-quality/cache';
import { extractPrimaryIndex } from '@/lib/air-quality/service';
import {
  MOCK_CURRENT_CONDITIONS_WITH_CPCB,
  MOCK_CURRENT_CONDITIONS_UAQI_ONLY,
} from './air-quality-fixtures';

describe('Air Quality - Capped TTL Cache', () => {
  let testCache: SimpleTtlCache<string>;

  beforeEach(() => {
    testCache = new SimpleTtlCache<string>(15, 3);
  });

  it('normalizes location query keys properly', () => {
    expect(normalizeLocationKey('  New Delhi   110001  ')).toBe('new delhi 110001');
    expect(normalizeLocationKey('Delhi')).toBe('delhi');
  });

  it('stores and retrieves cached entries within TTL', () => {
    testCache.set('delhi', 'report-delhi');
    const cached = testCache.get('delhi');
    expect(cached).not.toBeNull();
    expect(cached?.value).toBe('report-delhi');
  });

  it('evicts oldest entries when capacity exceeds maxEntries limit', () => {
    testCache.set('item1', 'val1');
    testCache.set('item2', 'val2');
    testCache.set('item3', 'val3');
    expect(testCache.size()).toBe(3);

    testCache.set('item4', 'val4');
    expect(testCache.size()).toBe(3);
    expect(testCache.get('item1')).toBeNull();
    expect(testCache.get('item2')?.value).toBe('val2');
    expect(testCache.get('item4')?.value).toBe('val4');
  });
});

describe('Air Quality - Index Selection & Null Handling', () => {
  it('selects India local AQI (ind_cpcb) as the primary index when available', () => {
    const selected = extractPrimaryIndex(MOCK_CURRENT_CONDITIONS_WITH_CPCB.indexes);
    expect(selected.indexCode).toBe('ind_cpcb');
    expect(selected.aqi).toBe(342);
    expect(selected.category).toBe('Very Poor');
    expect(selected.dominantPollutant).toBe('pm25');
  });

  it('falls back to Universal AQI (uaqi) when ind_cpcb is not available', () => {
    const selected = extractPrimaryIndex(MOCK_CURRENT_CONDITIONS_UAQI_ONLY.indexes);
    expect(selected.indexCode).toBe('uaqi');
    expect(selected.aqi).toBe(45);
    expect(selected.category).toBe('Fair air quality');
  });

  it('returns AQI as null (not 0) when no index is returned', () => {
    const selected = extractPrimaryIndex([]);
    expect(selected.aqi).toBeNull();
    expect(selected.category).toBeNull();
    expect(selected.dominantPollutant).toBeNull();
    expect(selected.indexCode).toBeNull();
  });
});

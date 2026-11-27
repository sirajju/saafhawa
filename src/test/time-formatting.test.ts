import { describe, it, expect } from 'vitest';
import { formatHourInPlaceLocalTime } from '@/lib/air-quality/time-utils';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';

describe('Localized Time Formatting', () => {
  it('uses non-breaking spaces between number and meridiem', () => {
    const sampleDate = '2026-11-25T13:00:00Z'; // 1 PM UTC
    const formatted = formatHourInPlaceLocalTime(sampleDate, 'UTC');
    // Must contain non-breaking space \u00A0
    expect(formatted).toBe('1\u00A0PM');
    expect(formatted).not.toBe('1 PM');

    const advice = buildForecastAdvice(200, [], null, 'Asia/Kolkata');
    expect(advice.plainAdvice).toContain('1\u00A0PM to 4\u00A0PM');
  });
});

import { describe, it, expect } from 'vitest';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';
import { getAqiCategoryDetails } from '@/lib/impact/category-details';

describe('Forecast Advice When Data is Incomplete', () => {
  it('never invents air quality values when AQI or category is missing', () => {
    const advice = buildForecastAdvice(null, [], null);
    expect(advice.plainAdvice).not.toContain('300');
    expect(advice.plainAdvice).not.toContain('200');
    expect(advice.plainAdvice).not.toContain('Severe');

    const details = getAqiCategoryDetails(null, null);
    expect(details.categoryText).toBe('unavailable');
  });
});

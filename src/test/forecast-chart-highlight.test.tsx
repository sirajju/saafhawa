import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ForecastChart, ForecastPoint } from '@/components/ForecastChart';

describe('Forecast Chart Cleanest Window Highlighting', () => {
  it('highlight band matches advice cleanest window start and end hours', () => {
    const mockPoints: ForecastPoint[] = Array.from({ length: 24 }, (_, i) => ({
      dateTime: new Date(Date.UTC(2026, 10, 25, i, 0, 0)).toISOString(),
      aqi: i === 13 || i === 14 || i === 15 ? 50 : 250, // Low AQI at 13, 14, 15 UTC (which is 18:30 IST)
      category: 'Moderate',
    }));

    // Advice for a known window: start at "1 PM", end at "4 PM"
    const { container } = render(
      <ForecastChart
        hourlyForecast={mockPoints}
        timeZone="UTC"
        cleanestWindowStart="1 PM"
        cleanestWindowEnd="4 PM"
      />
    );

    // The shaded rect in the SVG
    const rects = Array.from(container.querySelectorAll('rect'));
    const highlightRect = rects.find((r) => r.getAttribute('fill') === 'var(--brand-soft)');
    expect(highlightRect).toBeInTheDocument();

    // 1 PM is index 13 in UTC mockPoints, 4 PM is index 16. Difference is 3 hours.
    const bw = 720 / 24;
    const expectedX = 13 * bw;
    const expectedW = 3 * bw;

    expect(Number(highlightRect?.getAttribute('x'))).toBeCloseTo(expectedX, 1);
    expect(Number(highlightRect?.getAttribute('width'))).toBeCloseTo(expectedW, 1);
  });
});

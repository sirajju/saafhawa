import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ForecastChartSvg } from '@/components/forecast/ForecastChartSvg';

describe('Forecast Chart SVG Responsive Typography', () => {
  it('text sizes are >= 12px and labels step every 6 hours on small screens', () => {
    const mockPoints = Array.from({ length: 24 }, (_, i) => ({
      dateTime: new Date(Date.UTC(2026, 10, 25, i, 0, 0)).toISOString(),
      aqi: 120 + (i % 5) * 10,
    }));

    // Render with small width (e.g. 360px on phone)
    const { container } = render(
      <ForecastChartSvg
        points={mockPoints}
        timeZone="Asia/Kolkata"
        chartWidth={360}
        cleanestIndex={5}
        cleanestWindowLength={3}
        srSummary="24-hour forecast chart"
      />
    );

    const textElements = Array.from(container.querySelectorAll('text'));
    expect(textElements.length).toBeGreaterThan(0);

    // Verify all text elements have fontSize >= 12
    for (const el of textElements) {
      const fs = el.getAttribute('font-size') || el.getAttribute('fontSize');
      expect(Number(fs)).toBeGreaterThanOrEqual(12);
    }

    // Verify hour labels rendered: with chartWidth=360, width < 520, step is 6 (indices 0, 6, 12, 18)
    // plus "Now", "Best", and 3 gridline labels
    const hourLabels = textElements.filter((t) => t.textContent?.match(/(AM|PM)/));
    expect(hourLabels.length).toBe(4); // 24 / 6 = 4 labels
  });
});

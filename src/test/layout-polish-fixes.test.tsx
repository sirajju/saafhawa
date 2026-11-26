import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingForm } from '@/components/OnboardingForm';
import { ForecastChart, ForecastPoint } from '@/components/ForecastChart';
import { ForecastChartSvg } from '@/components/forecast/ForecastChartSvg';
import { ChatPanel } from '@/components/ChatPanel';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { buildForecastAdvice } from '@/lib/air-quality/forecast-advice';
import { formatHourInPlaceLocalTime } from '@/lib/chat/tools';
import { MOCK_PLAN } from './fixtures/mock-plan-data';

describe('Layout and Interaction Polish Fixes', () => {
  it('1. Onboarding container has wrap class for 16px side padding and location button hides text on small screens', () => {
    const { container } = render(<OnboardingForm onSubmit={() => {}} />);
    const mainOnb = container.querySelector('#onb');
    expect(mainOnb).toBeInTheDocument();
    expect(mainOnb?.classList.contains('wrap')).toBe(true);

    const locateBtn = screen.getByRole('button', { name: /Use my location/i });
    expect(locateBtn).toBeInTheDocument();
    expect(locateBtn.classList.contains('icon-btn')).toBe(true);
  });

  it('2. Forecast chart text sizes are >= 12px and labels step every 6 hours on small screens', () => {
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

  it('3. Chat composer input and form expand to 100% width to fill card', () => {
    const { container } = render(
      <ChatPanel
        place="Delhi"
        dataSource="CPCB Real-time"
        measuredTime="2026-11-25T10:00:00Z"
        timeZone="Asia/Kolkata"
      />
    );

    const form = container.querySelector('form.composer-form') as HTMLFormElement;
    expect(form).toBeInTheDocument();
    expect(form.style.width).toBe('100%');
    expect(form.style.display).toBe('flex');

    const input = container.querySelector('form.composer-form input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.style.width).toBe('100%');
  });

  it('4. Chart "Best" highlight band matches advice cleanest window start and end hours', () => {
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

  it('5. Plan title h1 has outline: none to suppress programmatic focus box', () => {
    const headingRef = React.createRef<HTMLHeadingElement>();
    const { container } = render(
      <DashboardHeader
        headingRef={headingRef}
        plan={MOCK_PLAN}
        currentPlaceName="Connaught Place"
      />
    );

    const h1 = container.querySelector('h1');
    expect(h1).toBeInTheDocument();
    expect(h1?.getAttribute('tabindex')).toBe('-1');
    expect(h1?.style.outlineStyle).toBe('none');
  });

  it('6. Time formatting uses non-breaking spaces between number and meridiem', () => {
    const sampleDate = '2026-11-25T13:00:00Z'; // 1 PM UTC
    const formatted = formatHourInPlaceLocalTime(sampleDate, 'UTC');
    // Must contain non-breaking space \u00A0
    expect(formatted).toBe('1\u00A0PM');
    expect(formatted).not.toBe('1 PM');

    const advice = buildForecastAdvice(200, [], null, 'Asia/Kolkata');
    expect(advice.plainAdvice).toContain('1\u00A0PM to 4\u00A0PM');
  });
});

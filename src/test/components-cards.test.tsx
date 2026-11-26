import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AirQualityCard } from '@/components/AirQualityCard';
import { DailyTimelineItem } from '@/components/dashboard/DailyTimelineItem';
import { TotalSavingsBanner } from '@/components/TotalSavingsBanner';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { MOCK_LOCATION, MOCK_CURRENT, MOCK_ACTION } from './components-fixtures';

describe('Accessibility - AirQualityCard (Screen Reader Text & Visual Metrics)', () => {
  it('renders section landmark with clean place name', () => {
    render(<AirQualityCard location={MOCK_LOCATION} current={MOCK_CURRENT} />);

    const section = screen.getByRole('region', { name: /Today's Air Quality & Family Guidance/i }) ||
      document.querySelector('section[aria-labelledby="air-quality-heading"]');
    expect(section).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 2, name: /Today's Air Quality/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText(MOCK_LOCATION.name)).toBeInTheDocument();
  });

  it('renders large AQI number, category words, and plain advice sentence', () => {
    render(
      <AirQualityCard
        location={MOCK_LOCATION}
        current={MOCK_CURRENT}
        hourlyForecast={[{ dateTime: '2026-11-24T11:00:00Z', aqi: 350, category: 'Very Poor', dominantPollutant: 'pm25' }]}
      />
    );

    // Large AQI number
    expect(screen.getByText('342')).toBeInTheDocument();
    // Category in words
    expect(screen.getAllByText(/Very Poor/i).length).toBeGreaterThanOrEqual(1);
    // Plain advice sentence
    expect(screen.getByText(/For your family today/i)).toBeInTheDocument();
    expect(screen.queryByText(/Today's Family Guidance/i)).toBeNull();
    expect(screen.getByText(/Cleanest window today/i)).toBeInTheDocument();
  });

  it('provides screen reader text equivalents for all colored indicators and metrics', () => {
    render(
      <AirQualityCard
        location={MOCK_LOCATION}
        current={MOCK_CURRENT}
        hourlyForecast={[
          {
            dateTime: '2026-11-24T11:00:00Z',
            aqi: 350,
            category: 'Very Poor',
            dominantPollutant: 'pm25',
            pm25: { value: 190, units: 'MICROGRAMS_PER_CUBIC_METER' },
            pm10: { value: 330, units: 'MICROGRAMS_PER_CUBIC_METER' },
          },
        ]}
      />
    );

    const srCategory = screen.getByText(/Current air quality category is Very Poor/i);
    expect(srCategory).toBeInTheDocument();
    expect(srCategory.className).toContain('sr-only');

    const srAqi = screen.getByText(/Current Air Quality Index is 342/i);
    expect(srAqi).toBeInTheDocument();

    const srPm25 = screen.getByText(/PM2.5 particulate level is 185.5 micrograms per cubic meter/i);
    expect(srPm25).toBeInTheDocument();

    const srForecast = screen.getByText(/24-hour forecast chart/i);
    expect(srForecast).toBeInTheDocument();
  });

  it('24-hour forecast chart region is rendered with accessible aria-label', () => {
    render(
      <AirQualityCard
        location={MOCK_LOCATION}
        current={MOCK_CURRENT}
        hourlyForecast={[{ dateTime: '2026-11-24T11:00:00Z', aqi: 350, category: 'Very Poor', dominantPollutant: 'pm25' }]}
      />
    );

    const chartRegion = screen.getByLabelText(/24-hour air quality forecast chart/i);
    expect(chartRegion).toBeInTheDocument();
  });
});

describe('Accessibility - DailyTimelineItem (Article Landmark & Keyboard Toggle)', () => {
  it('renders article landmark with title and interactive Mark as done button', async () => {
    const user = userEvent.setup();
    const handleToggle = vi.fn();
    const { rerender } = render(
      <DailyTimelineItem action={MOCK_ACTION} isDone={false} onToggle={handleToggle} />
    );

    const article = screen.getByRole('article');
    expect(article).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 3, name: /Wear Certified N95 Mask/i });
    expect(heading).toBeInTheDocument();

    const doneButton = screen.getByRole('button', {
      name: /Mark action "Wear Certified N95 Mask During Outdoor Commutes" as completed/i,
    });
    expect(doneButton).toBeInTheDocument();
    expect(doneButton.getAttribute('aria-pressed')).toBe('false');

    await user.click(doneButton);
    expect(handleToggle).toHaveBeenCalledTimes(1);

    rerender(<DailyTimelineItem action={MOCK_ACTION} isDone={true} onToggle={handleToggle} />);
    expect(article.className).toContain('is-done');
  });

  it('renders TotalSavingsBanner with calculation note', () => {
    const summary = {
      totalActionsCount: 5,
      totalPm25InhaledDoseAvoidedUg: 350,
      totalPm25EmissionsSavedGrams: 1.2,
      totalCo2EmissionsSavedGrams: 4200,
      totalCo2EmissionsSavedKg: 4.2,
    };
    render(<TotalSavingsBanner summary={summary} generationMethod="gemini" />);
    expect(
      screen.getByText(/Overlapping actions are adjusted, so the total can be less than the cards added together/i)
    ).toBeInTheDocument();
  });
});

describe('Accessibility - CommunityAdvisoryModal (Dialog Trap, Labels & Escape Key)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          headline: 'Community Smog Advisory',
          advisoryText: 'Mock advisory text',
          audience: 'housing_society',
          language: 'en',
          airQualitySnapshot: {
            locationName: 'Delhi',
            aqi: 342,
            category: 'Very Poor',
            pm25UgM3: 185.5,
          },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders modal dialog landmark with aria-modal and aria-labelledby', async () => {
    const handleClose = vi.fn();
    render(
      <CommunityAdvisoryModal
        isOpen={true}
        onClose={handleClose}
        place="Delhi 110001"
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('advisory-modal-title');

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    expect(closeBtn).toBeInTheDocument();

    expect(await screen.findByText('Mock advisory text')).toBeInTheDocument();
  });

  it('closes dialog on Escape key press', async () => {
    const handleClose = vi.fn();
    render(
      <CommunityAdvisoryModal
        isOpen={true}
        onClose={handleClose}
        place="Delhi 110001"
      />
    );

    expect(await screen.findByText('Mock advisory text')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

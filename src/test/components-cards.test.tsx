import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AirQualityCard } from '@/components/AirQualityCard';
import { PlanCard } from '@/components/PlanCard';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { MOCK_LOCATION, MOCK_CURRENT, MOCK_ACTION } from './components-fixtures';

describe('Accessibility - AirQualityCard (Screen Reader Text & Sample Badge)', () => {
  it('renders section landmark with clean place name', () => {
    render(<AirQualityCard location={MOCK_LOCATION} current={MOCK_CURRENT} />);

    const section = screen.getByRole('region', { name: /Today's Air Quality & Family Guidance/i }) ||
      document.querySelector('section[aria-labelledby="air-quality-heading"]');
    expect(section).not.toBeNull();

    const heading = screen.getByRole('heading', { level: 2, name: /Today's Air Quality/i });
    expect(heading).toBeDefined();
    expect(screen.getByText(MOCK_LOCATION.name)).toBeDefined();
  });

  it('renders large AQI number, category words, and plain advice sentence', () => {
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
          },
        ]}
      />
    );

    // Large AQI number
    expect(screen.getByText('342')).toBeDefined();
    // Category in words
    expect(screen.getAllByText(/Very Poor/i).length).toBeGreaterThanOrEqual(1);
    // Plain advice sentence
    expect(screen.getByText(/Today's Family Guidance/i)).toBeDefined();
    expect(screen.getByText(/Cleanest window today/i)).toBeDefined();
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
    expect(srCategory).toBeDefined();
    expect(srCategory.className).toContain('sr-only');

    const srAqi = screen.getByText(/Current Air Quality Index is 342/i);
    expect(srAqi).toBeDefined();

    const srPm25 = screen.getByText(/PM2.5 particulate level is 185.5 micrograms per cubic meter/i);
    expect(srPm25).toBeDefined();

    const srForecast = screen.getByText(/24-hour forecast chart/i);
    expect(srForecast).toBeDefined();
  });

  it('24-hour forecast chart region is rendered with accessible aria-label', () => {
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
          },
        ]}
      />
    );

    const chartRegion = screen.getByLabelText(/24-hour air quality forecast chart/i);
    expect(chartRegion).toBeDefined();
  });
});

describe('Accessibility - PlanCard (Landmarks & Keyboard Toggle)', () => {
  it('renders article landmark with accessible headings and interactive Mark as done button', async () => {
    const user = userEvent.setup();
    render(<PlanCard action={MOCK_ACTION} />);

    const article = screen.getByRole('article');
    expect(article).toBeDefined();

    const heading = screen.getByRole('heading', { level: 3, name: /Wear Certified N95 Mask/i });
    expect(heading).toBeDefined();

    const doneButton = screen.getByRole('button', {
      name: /Mark action "Wear Certified N95 Mask During Outdoor Commutes" as completed/i,
    });
    expect(doneButton).toBeDefined();
    expect(doneButton.getAttribute('aria-pressed')).toBe('false');

    await user.click(doneButton);
    expect(doneButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Done')).toBeDefined();
    expect(screen.getByText('Completed today')).toBeDefined();
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
    expect(dialog).toBeDefined();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('advisory-modal-title');

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });
    expect(closeBtn).toBeDefined();

    // Await async fetch state update
    expect(await screen.findByText('Mock advisory text')).toBeDefined();
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

    expect(await screen.findByText('Mock advisory text')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

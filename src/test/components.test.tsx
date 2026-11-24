import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/components/OnboardingForm';
import { AirQualityCard } from '@/components/AirQualityCard';
import { PlanCard } from '@/components/PlanCard';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';
import { PlannedAction } from '@/lib/plan/types';
import { CleanLocation, CurrentAirQuality } from '@/lib/air-quality/types';

const MOCK_LOCATION: CleanLocation = {
  name: 'Connaught Place, New Delhi, Delhi 110001, India',
  latitude: 28.6315,
  longitude: 77.2167,
};

const MOCK_CURRENT: CurrentAirQuality = {
  dateTime: '2026-11-24T10:00:00Z',
  aqi: 342,
  category: 'Very Poor',
  dominantPollutant: 'pm25',
  indexCode: 'ind_cpcb',
  indexDisplayName: 'India National AQI (CPCB)',
  pm25: { value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
  pm10: { value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
  isSampleData: true,
};

const MOCK_ACTION: PlannedAction = {
  actionId: 'wear_n95_mask_outside',
  title: 'Wear Certified N95 Mask During Outdoor Commutes',
  description: 'Blocks >= 85% of respirable PM2.5 particles from reaching deep lung tissue.',
  category: 'daily_routine',
  suggestedTimeOfDay: 'Morning Commute',
  reason: 'Protects children and adults during heavy morning temperature inversion.',
  exposureReduction: {
    pm25InhaledDoseAvoidedUg: 157.25,
    pm25ConcentrationReductionUgM3: 176.22,
    percentageDrop: 95.0,
  },
  emissionReduction: {
    pm25SavedGrams: 0,
    co2SavedGrams: 0,
  },
  methodologyNotes: 'US EPA / CDC inhalation rates',
};

describe('Accessibility - OnboardingForm (Landmarks, Labels & Keyboard)', () => {
  it('contains appropriate landmarks and fieldsets with legends', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    // Form element landmark
    const form = screen.getByRole('form', { name: /Household Profile Form/i });
    expect(form).toBeDefined();

    // Fieldsets and legends
    const fieldsets = document.querySelectorAll('fieldset');
    expect(fieldsets.length).toBeGreaterThanOrEqual(3);

    const legends = document.querySelectorAll('legend');
    expect(legends.length).toBeGreaterThanOrEqual(3);
  });

  it('provides explicit labels associated with all form inputs', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    // Place input label association
    const placeInput = screen.getByLabelText(/Where do you live/i);
    expect(placeInput).toBeDefined();
    expect(placeInput.getAttribute('id')).toBe('place-input');

    // Adults input label association
    const adultsInput = screen.getByLabelText(/Adults/i);
    expect(adultsInput).toBeDefined();

    // Commute select label association
    const commuteSelect = screen.getByLabelText(/Primary Commute Mode/i);
    expect(commuteSelect).toBeDefined();

    // Cooking fuel select label association
    const fuelSelect = screen.getByLabelText(/Cooking Fuel/i);
    expect(fuelSelect).toBeDefined();

    // Budget select label association
    const budgetSelect = screen.getByLabelText(/Action Budget Preference/i);
    expect(budgetSelect).toBeDefined();
  });

  it('supports full keyboard navigation and submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;

    // Focus and type via keyboard
    await user.clear(placeInput);
    await user.type(placeInput, 'Noida Sector 62');
    expect(placeInput.value).toBe('Noida Sector 62');

    // Submit button receives keyboard focus and triggers submit on click/Enter
    const submitBtn = screen.getByRole('button', { name: /Generate My Smog Action Plan/i });
    submitBtn.focus();
    expect(document.activeElement).toBe(submitBtn);

    await user.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        place: 'Noida Sector 62',
      })
    );
  });
});

describe('Accessibility - AirQualityCard (Screen Reader Text & Sample Badge)', () => {
  it('renders section landmark with accessible heading label', () => {
    render(<AirQualityCard location={MOCK_LOCATION} current={MOCK_CURRENT} />);

    const section = screen.getByRole('region', { name: /Connaught Place, New Delhi/i }) ||
      document.querySelector('section[aria-labelledby="air-quality-heading"]');
    expect(section).not.toBeNull();

    const heading = screen.getByRole('heading', { level: 2, name: /Connaught Place/i });
    expect(heading).toBeDefined();
  });

  it('displays visible "Sample Data" label when sample mode is active', () => {
    render(<AirQualityCard location={MOCK_LOCATION} current={MOCK_CURRENT} isSampleData={true} />);

    const sampleNotice = screen.getByText('Sample Data');
    expect(sampleNotice).toBeDefined();

    const noticeContainer = screen.getByRole('status', { name: /Sample data notice/i });
    expect(noticeContainer).toBeDefined();
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

    // Screen reader text for category badge
    const srCategory = screen.getByText(/Current air quality category is Very Poor/i);
    expect(srCategory).toBeDefined();
    expect(srCategory.className).toContain('sr-only');

    // Screen reader text for AQI score
    const srAqi = screen.getByText(/Current Air Quality Index is 342/i);
    expect(srAqi).toBeDefined();

    // Screen reader text for PM2.5
    const srPm25 = screen.getByText(/PM2.5 particulate level is 185.5 micrograms per cubic meter/i);
    expect(srPm25).toBeDefined();

    // Screen reader text for hourly forecast point
    const srForecast = screen.getByText(/Forecast at.*AQI 350.*category Very Poor/i);
    expect(srForecast).toBeDefined();
  });

  it('forecast scroll container is keyboard focusable with aria-label', () => {
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

    const scrollContainer = screen.getByLabelText(/Hourly air quality forecast scroll list/i);
    expect(scrollContainer).toBeDefined();
    expect(scrollContainer.getAttribute('tabIndex')).toBe('0');
  });
});

describe('Accessibility - PlanCard (Landmarks & Keyboard Toggle)', () => {
  it('renders article landmark with accessible headings and interactive checkbox', async () => {
    const user = userEvent.setup();
    render(<PlanCard action={MOCK_ACTION} />);

    // Article landmark
    const article = screen.getByRole('article');
    expect(article).toBeDefined();

    // Heading level 3
    const heading = screen.getByRole('heading', { level: 3, name: /Wear Certified N95 Mask/i });
    expect(heading).toBeDefined();

    // Checkbox has accessible name matching action title
    const checkbox = screen.getByRole('checkbox', {
      name: /Mark action "Wear Certified N95 Mask During Outdoor Commutes" as completed/i,
    }) as HTMLInputElement;
    expect(checkbox).toBeDefined();
    expect(checkbox.checked).toBe(false);

    // Toggle via keyboard Space/click
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
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

  it('renders modal dialog landmark with aria-modal and aria-labelledby', () => {
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
  });

  it('closes dialog on Escape key press', () => {
    const handleClose = vi.fn();
    render(
      <CommunityAdvisoryModal
        isOpen={true}
        onClose={handleClose}
        place="Delhi 110001"
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

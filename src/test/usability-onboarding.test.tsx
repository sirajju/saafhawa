import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/components/OnboardingForm';

describe('Usability Overhaul - Three-Step Onboarding & Habit Defaults', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('asks place first and supports browser location button', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({
          coords: {
            latitude: 28.5355,
            longitude: 77.391,
          },
        })
      ),
    };
    // @ts-expect-error Mocking navigator.geolocation
    navigator.geolocation = mockGeolocation;

    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={() => {}} />);

    // Step 1: Who lives here
    expect(screen.getByText(/Step 1 of 3: Who lives here/i)).toBeDefined();

    // Place input is top field
    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;
    expect(placeInput).toBeDefined();

    // Browser location button
    const locationBtn = screen.getByRole('button', { name: /Use browser location/i });
    await user.click(locationBtn);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(placeInput.value).toBe('28.5355, 77.3910');
  });

  it('does NOT pre-tick incense, leaf burning, or outdoor exercise habits', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={() => {}} />);

    // Advance to Step 2
    const toCommuteBtn = screen.getByRole('button', { name: /Continue to Commute/i });
    await user.click(toCommuteBtn);

    // Advance to Step 3
    const toHomeBtn = screen.getByRole('button', { name: /Continue to Home/i });
    await user.click(toHomeBtn);

    expect(screen.getByText(/Step 3 of 3: Your home/i)).toBeDefined();

    // Incense habit: "No (Never / Rarely)" must be selected by default (not pre-ticked!)
    const incenseRadios = screen.getAllByRole('radio', { name: /No \(Never \/ Rarely\)/i });
    expect(incenseRadios[0].getAttribute('aria-checked')).toBe('true');

    // Waste burning: "No nearby burning" selected by default
    const burningNoRadio = screen.getByRole('radio', { name: /No nearby burning/i });
    expect(burningNoRadio.getAttribute('aria-checked')).toBe('true');

    // Outdoor workouts: "No outdoor workouts" selected by default
    const workoutsNoRadio = screen.getByRole('radio', { name: /No outdoor workouts/i });
    expect(workoutsNoRadio.getAttribute('aria-checked')).toBe('true');
  });

  it('shows clear error and focuses place input when location permission is denied', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) =>
        error({ code: 1, message: 'User denied Geolocation' })
      ),
    };
    // @ts-expect-error Mocking navigator.geolocation
    navigator.geolocation = mockGeolocation;

    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={() => {}} />);

    const locationBtn = screen.getByRole('button', { name: /Use browser location/i });
    await user.click(locationBtn);

    expect(
      screen.getByText(/Location permission denied\. Please enter your locality or PIN code\./i)
    ).toBeDefined();

    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;
    expect(document.activeElement).toBe(placeInput);
  });
});

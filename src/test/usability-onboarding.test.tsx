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

    // Step 1: Your home
    expect(screen.getByText(/Step 1 of 3 · Your home/i)).toBeInTheDocument();

    // Place input is top field with label "Your area"
    const placeInput = screen.getByLabelText(/Your area/i) as HTMLInputElement;
    expect(placeInput).toBeInTheDocument();

    // Browser location button
    const locationBtn = screen.getByRole('button', { name: /Use my location/i });
    await user.click(locationBtn);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(placeInput.value).toBe('28.5355, 77.3910');
  });

  it('clears saved coordinates when user types a place after using browser location', async () => {
    let submittedProfile: unknown;
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({ coords: { latitude: 28.5355, longitude: 77.391 } })
      ),
    };
    // @ts-expect-error Mocking navigator.geolocation
    navigator.geolocation = mockGeolocation;

    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={(p) => { submittedProfile = p; }} />);

    const locationBtn = screen.getByRole('button', { name: /Use my location/i });
    await user.click(locationBtn);

    const placeInput = screen.getByLabelText(/Your area/i) as HTMLInputElement;
    await user.clear(placeInput);
    await user.type(placeInput, 'Mumbai');

    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /See my plan/i }));

    expect((submittedProfile as { place: string; coordinates?: string }).place).toBe('Mumbai');
    expect((submittedProfile as { place: string; coordinates?: string }).coordinates).toBeUndefined();
  });

  it('does NOT preselect incense choice on step 3', async () => {
    const user = userEvent.setup();
    render(<OnboardingForm initialProfile={{ place: 'Delhi' }} onSubmit={() => {}} />);

    // Advance to Step 2
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueBtn);
    expect(screen.getByText(/Step 2 of 3 · Getting around/i)).toBeInTheDocument();

    // Advance to Step 3
    await user.click(continueBtn);
    expect(screen.getByText(/Step 3 of 3 · Inside your home/i)).toBeInTheDocument();

    // Incense question options: all must have aria-checked="false" initially
    const incenseGroup = screen.getByRole('radiogroup', { name: /Incense/i });
    expect(incenseGroup).toBeInTheDocument();
    const incenseRadios = screen.getAllByRole('radio', { name: /Yes, often|Sometimes|No/i });
    for (const radio of incenseRadios) {
      expect(radio.getAttribute('aria-checked')).toBe('false');
    }
  });

  it('shows clear note and focuses area input when location permission is denied', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success, error) =>
        error({ code: 1, message: 'User denied Geolocation' })
      ),
    };
    // @ts-expect-error Mocking navigator.geolocation
    navigator.geolocation = mockGeolocation;

    const user = userEvent.setup();
    render(<OnboardingForm onSubmit={() => {}} />);

    const locationBtn = screen.getByRole('button', { name: /Use my location/i });
    await user.click(locationBtn);

    expect(
      screen.getByText(/Location access was blocked\. Type your area or pincode instead\./i)
    ).toBeInTheDocument();

    const placeInput = screen.getByLabelText(/Your area/i) as HTMLInputElement;
    expect(document.activeElement).toBe(placeInput);
  });
});

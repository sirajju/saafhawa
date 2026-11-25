import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/components/OnboardingForm';

describe('Accessibility - OnboardingForm (3 Steps, Progress, Labels & Keyboard)', () => {
  it('contains appropriate landmarks and fieldsets with legends in step 1', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const form = screen.getByRole('form', { name: /Household Profile Form/i });
    expect(form).toBeDefined();

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeDefined();
    expect(progressbar.getAttribute('aria-valuenow')).toBe('1');

    const fieldsets = document.querySelectorAll('fieldset');
    expect(fieldsets.length).toBeGreaterThanOrEqual(1);

    const legends = document.querySelectorAll('legend');
    expect(legends.length).toBeGreaterThanOrEqual(1);
  });

  it('provides explicit labels and browser location button in step 1', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i);
    expect(placeInput).toBeDefined();
    expect(placeInput.getAttribute('id')).toBe('place-input');

    const locationBtn = screen.getByRole('button', { name: /Use browser location/i });
    expect(locationBtn).toBeDefined();

    expect(screen.getByText(/Adults in home/i)).toBeDefined();
  });

  it('supports navigation across all 3 steps with back button and submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;

    await user.clear(placeInput);
    await user.type(placeInput, 'Noida Sector 62');
    expect(placeInput.value).toBe('Noida Sector 62');

    // Step 1 -> Step 2
    const nextToCommuteBtn = screen.getByRole('button', { name: /Continue to Commute/i });
    await user.click(nextToCommuteBtn);

    // Verify Step 2 is active
    expect(screen.getByText(/Step 2 of 3: How you get around/i)).toBeDefined();
    expect(screen.getByText(/Primary Commute Mode/i)).toBeDefined();

    // Verify Back button returns to Step 1
    const backBtn = screen.getByRole('button', { name: /Back to step 1/i });
    await user.click(backBtn);
    expect(screen.getByText(/Step 1 of 3: Who lives here/i)).toBeDefined();

    // Return to Step 2, then advance to Step 3
    const nextAgain = screen.getByRole('button', { name: /Continue to Commute/i });
    await user.click(nextAgain);
    const nextToHomeBtn = screen.getByRole('button', { name: /Continue to Home/i });
    await user.click(nextToHomeBtn);

    // Verify Step 3 is active
    expect(screen.getByText(/Step 3 of 3: Your home/i)).toBeDefined();
    expect(screen.getByText(/Primary Cooking Fuel/i)).toBeDefined();

    // Submit form on Step 3
    const submitBtn = screen.getByRole('button', { name: /Generate My Smog Action Plan/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        place: 'Noida Sector 62',
      })
    );
  });

  it('validates place input and ties errors to invalid input', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;

    // Clear place input to trigger validation error
    await user.clear(placeInput);
    const nextBtn = screen.getByRole('button', { name: /Continue to Commute/i });
    await user.click(nextBtn);

    // Verify error alert and accessibility linkage
    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain('valid place name');
    expect(placeInput.getAttribute('aria-invalid')).toBe('true');
    expect(placeInput.getAttribute('aria-describedby')).toContain('form-error-alert');

    // Type valid place and continue
    await user.type(placeInput, 'Dwarka');
    expect(placeInput.getAttribute('aria-invalid')).toBe('false');
  });
});

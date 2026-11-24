import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/components/OnboardingForm';

describe('Accessibility - OnboardingForm (Landmarks, Labels & Keyboard)', () => {
  it('contains appropriate landmarks and fieldsets with legends', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const form = screen.getByRole('form', { name: /Household Profile Form/i });
    expect(form).toBeDefined();

    const fieldsets = document.querySelectorAll('fieldset');
    expect(fieldsets.length).toBeGreaterThanOrEqual(3);

    const legends = document.querySelectorAll('legend');
    expect(legends.length).toBeGreaterThanOrEqual(3);
  });

  it('provides explicit labels associated with all form inputs', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i);
    expect(placeInput).toBeDefined();
    expect(placeInput.getAttribute('id')).toBe('place-input');

    const adultsInput = screen.getByLabelText(/Adults/i);
    expect(adultsInput).toBeDefined();

    const commuteSelect = screen.getByLabelText(/Primary Commute Mode/i);
    expect(commuteSelect).toBeDefined();

    const fuelSelect = screen.getByLabelText(/Cooking Fuel/i);
    expect(fuelSelect).toBeDefined();

    const budgetSelect = screen.getByLabelText(/Action Budget Preference/i);
    expect(budgetSelect).toBeDefined();
  });

  it('supports full keyboard navigation and submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;

    await user.clear(placeInput);
    await user.type(placeInput, 'Noida Sector 62');
    expect(placeInput.value).toBe('Noida Sector 62');

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

  it('tabs sequentially through form controls and ties errors to invalid input', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const placeInput = screen.getByLabelText(/Where do you live/i) as HTMLInputElement;

    // Clear place input to trigger validation error
    await user.clear(placeInput);
    const submitBtn = screen.getByRole('button', { name: /Generate My Smog Action Plan/i });
    await user.click(submitBtn);

    // Verify error alert and accessibility linkage
    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain('valid place name');
    expect(placeInput.getAttribute('aria-invalid')).toBe('true');
    expect(placeInput.getAttribute('aria-describedby')).toContain('form-error-alert');

    // Type valid place and tab through fields
    await user.type(placeInput, 'Dwarka');
    expect(placeInput.getAttribute('aria-invalid')).toBe('false');

    // Tab through successive controls
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText(/Adults/i));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText(/Children/i));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText(/Seniors/i));
  });
});

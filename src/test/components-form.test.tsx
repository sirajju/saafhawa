import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingForm } from '@/components/OnboardingForm';

describe('Accessibility - OnboardingForm (3 Steps, Progress, Labels & Keyboard)', () => {
  it('contains appropriate landmarks and radiogroups in step 1', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const step1 = screen.getByText(/Step 1 of 3 · Your home/i);
    expect(step1).toBeInTheDocument();

    const adultsGroup = screen.getByRole('radiogroup', { name: /Adults/i });
    expect(adultsGroup).toBeInTheDocument();

    const childrenGroup = screen.getByRole('radiogroup', { name: /Children/i });
    expect(childrenGroup).toBeInTheDocument();

    const seniorsGroup = screen.getByRole('radiogroup', { name: /Seniors/i });
    expect(seniorsGroup).toBeInTheDocument();
  });

  it('provides explicit labels and location button in step 1', () => {
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const areaInput = screen.getByLabelText(/Your area/i);
    expect(areaInput).toBeInTheDocument();
    expect(areaInput.getAttribute('id')).toBe('area');

    const locationBtn = screen.getByRole('button', { name: /Use my location/i });
    expect(locationBtn).toBeInTheDocument();
    expect(locationBtn.classList.contains('icon-btn')).toBe(true);

    expect(screen.getByText(/Adults/i)).toBeInTheDocument();
  });

  it('supports navigation across all 3 steps with back button and submission', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const areaInput = screen.getByLabelText(/Your area/i) as HTMLInputElement;

    await user.clear(areaInput);
    await user.type(areaInput, 'Noida Sector 62');
    expect(areaInput.value).toBe('Noida Sector 62');

    // Step 1 -> Step 2
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueBtn);

    // Verify Step 2 is active
    expect(screen.getByText(/Step 2 of 3 · Getting around/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Main commute/i })).toBeInTheDocument();

    // Verify Back button returns to Step 1
    const backBtn = screen.getByRole('button', { name: /Back/i });
    await user.click(backBtn);
    expect(screen.getByText(/Step 1 of 3 · Your home/i)).toBeInTheDocument();

    // Return to Step 2, then advance to Step 3
    await user.click(screen.getByRole('button', { name: /Continue/i }));
    await user.click(screen.getByRole('button', { name: /Continue/i }));

    // Verify Step 3 is active
    expect(screen.getByText(/Step 3 of 3 · Inside your home/i)).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /Cooking fuel/i })).toBeInTheDocument();

    // Submit form on Step 3: button labelled "See my plan"
    const submitBtn = screen.getByRole('button', { name: /See my plan/i });
    await user.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        place: 'Noida Sector 62',
      })
    );
  });

  it('validates area input and outlines in red when empty', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<OnboardingForm onSubmit={handleSubmit} />);

    const areaInput = screen.getByLabelText(/Your area/i) as HTMLInputElement;

    // Clear area input to trigger validation error
    await user.clear(areaInput);
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueBtn);

    // Verify error message and focus
    expect(screen.getByText(/Enter your city, area or pincode to continue\./i)).toBeInTheDocument();
    expect(areaInput.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(areaInput);

    // Type valid place to clear error
    await user.type(areaInput, 'Dwarka');
    expect(areaInput.getAttribute('aria-invalid')).toBeNull();
  });
});

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingForm } from '@/components/OnboardingForm';

describe('Onboarding Layout Container and Controls', () => {
  it('container has wrap class for 16px side padding and location button hides text on small screens', () => {
    const { container } = render(<OnboardingForm onSubmit={() => {}} />);
    const mainOnb = container.querySelector('#onb');
    expect(mainOnb).toBeInTheDocument();
    expect(mainOnb?.classList.contains('wrap')).toBe(true);

    const locateBtn = screen.getByRole('button', { name: /Use my location/i });
    expect(locateBtn).toBeInTheDocument();
    expect(locateBtn.classList.contains('icon-btn')).toBe(true);
  });
});

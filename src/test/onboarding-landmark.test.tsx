import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { OnboardingForm } from '../components/OnboardingForm';

describe('Onboarding Semantic Landmarks', () => {
  it('renders section tag instead of nested main landmark', () => {
    const { container } = render(<OnboardingForm onSubmit={() => {}} />);
    const section = container.querySelector('section#onb');
    const main = container.querySelector('main#onb');

    expect(section).not.toBeNull();
    expect(main).toBeNull();
  });
});

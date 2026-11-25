'use client';

import React from 'react';

export const ONBOARDING_STEPS = [
  {
    step: 1,
    category: 'Who lives here',
    heading: 'Tell Us About Your Household',
    description: 'We use this to tailor timing and advice. Nothing is stored on our servers.',
  },
  {
    step: 2,
    category: 'How you get around',
    heading: 'How do members of your household travel?',
    description: 'Daily commute habits directly shape both your personal toxic exposure and your tailpipe footprint.',
  },
  {
    step: 3,
    category: 'Your home',
    heading: 'Tell us about your home and indoor appliances',
    description: 'Indoor air quality can be up to 5 times cleaner than outdoor air with proper setup and ventilation.',
  },
] as const;

interface OnboardingProgressBarProps {
  currentStep: 1 | 2 | 3;
  isEditing: boolean;
  progressPercent: number;
}

export function OnboardingProgressBar({
  currentStep,
}: OnboardingProgressBarProps) {
  const current = ONBOARDING_STEPS[currentStep - 1];

  return (
    <div>
      <div
        className="steps"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={3}
        aria-label={`Step ${currentStep} of 3: ${current.category}`}
      >
        <i className={currentStep >= 1 ? 'on' : ''} />
        <i className={currentStep >= 2 ? 'on' : ''} />
        <i className={currentStep >= 3 ? 'on' : ''} />
      </div>

      <div className="eyebrow">
        Step {currentStep} of 3: {current.category}
      </div>
      <h1 style={{ marginTop: '6px' }}>{current.heading}</h1>
      <p style={{ color: 'var(--ink-2)', marginTop: '8px' }}>{current.description}</p>
    </div>
  );
}

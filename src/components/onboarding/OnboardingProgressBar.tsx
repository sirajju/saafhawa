'use client';

import React from 'react';
import { BrandIcon } from '../ui/Icons';

export const ONBOARDING_STEPS = [
  { step: 1, title: 'Who lives here', shortTitle: 'Household' },
  { step: 2, title: 'How you get around', shortTitle: 'Commute' },
  { step: 3, title: 'Your home', shortTitle: 'Home' },
] as const;

interface OnboardingProgressBarProps {
  currentStep: 1 | 2 | 3;
  isEditing: boolean;
  progressPercent: number;
}

export function OnboardingProgressBar({
  currentStep,
  isEditing,
  progressPercent,
}: OnboardingProgressBarProps) {
  return (
    <div className="border-b border-slate-200 bg-slate-50/70 p-6 sm:p-7 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-800 text-white shadow-2xs dark:bg-teal-700">
            <BrandIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
              {isEditing ? 'Update Household Profile' : 'Tell Us About Your Household'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Step {currentStep} of 3: {ONBOARDING_STEPS[currentStep - 1].title}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 border border-teal-200/70 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800">
          {progressPercent}%
        </span>
      </div>

      <div className="mt-5">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={3}
          aria-label={`Onboarding progress step ${currentStep} of 3: ${ONBOARDING_STEPS[currentStep - 1].title}`}
        >
          <div
            className="h-full rounded-full bg-teal-800 transition-all duration-300 dark:bg-teal-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          {ONBOARDING_STEPS.map((s) => (
            <span
              key={s.step}
              className={currentStep === s.step ? 'font-bold text-teal-800 dark:text-teal-400' : ''}
            >
              {s.step}. {s.shortTitle}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

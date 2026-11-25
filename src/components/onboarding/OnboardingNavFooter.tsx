'use client';

import React from 'react';
import { BrandIcon, ChevronRightIcon, ChevronLeftIcon } from '../ui/Icons';

interface OnboardingNavFooterProps {
  currentStep: 1 | 2 | 3;
  isEditing: boolean;
  onCancel?: () => void;
  onBack: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
}

export function OnboardingNavFooter({
  currentStep,
  isEditing,
  onCancel,
  onBack,
  onNext,
}: OnboardingNavFooterProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <div className="flex gap-2.5">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        )}

        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            aria-label={`Back to step ${currentStep - 1}`}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {currentStep < 3 ? (
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-800 px-6 py-2.5 text-base font-semibold text-white shadow-xs transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            <span>Continue to {currentStep === 1 ? 'Commute' : 'Home'}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-800 px-7 py-2.5 text-base font-semibold text-white shadow-xs transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            <span>{isEditing ? 'Save & Regenerate Plan' : 'Generate My Smog Action Plan'}</span>
            <BrandIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

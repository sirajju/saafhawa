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
    <div className="actions-sticky">
      <div className="actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost"
          >
            Cancel
          </button>
        )}

        {currentStep > 1 && (
          <button
            type="button"
            onClick={onBack}
            aria-label={`Back to step ${currentStep - 1}`}
            className="btn btn-ghost"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}

        {currentStep < 3 ? (
          <button
            type="button"
            onClick={onNext}
            className="btn btn-primary"
          >
            <span>Continue to {currentStep === 1 ? 'Commute' : 'Home'}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            className="btn btn-primary"
          >
            <span>{isEditing ? 'Save & Regenerate Plan' : 'Generate My Smog Action Plan'}</span>
            <BrandIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

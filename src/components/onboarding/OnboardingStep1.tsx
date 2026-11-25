'use client';

import React from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { DemographicsFields } from './DemographicsFields';
import { LocationIcon } from '../ui/Icons';

interface OnboardingStep1Props {
  formData: PlanRequest;
  errorMessage: string | null;
  geoStatus: string | null;
  isLocating: boolean;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
  onClearError: () => void;
  onUseBrowserLocation: () => void;
}

export function OnboardingStep1({
  formData,
  errorMessage,
  geoStatus,
  isLocating,
  onChange,
  onClearError,
  onUseBrowserLocation,
}: OnboardingStep1Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="place-input" className="block text-base font-bold text-slate-900 dark:text-slate-100">
          Where do you live? <span className="text-rose-600">*</span>
        </label>
        <p id="place-hint" className="text-sm text-slate-600 dark:text-slate-400">
          Enter your locality, neighborhood, landmark, or 6-digit pincode.
        </p>

        <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
          <input
            id="place-input"
            type="text"
            required
            aria-required="true"
            aria-invalid={Boolean(errorMessage)}
            aria-describedby={errorMessage ? 'form-error-alert place-hint' : 'place-hint'}
            value={formData.place}
            onChange={(e) => {
              onClearError();
              onChange('place', e.target.value);
            }}
            placeholder="e.g. Connaught Place, New Delhi or 110001"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-900 shadow-2xs transition placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <button
            type="button"
            onClick={onUseBrowserLocation}
            disabled={isLocating}
            aria-label="Use browser location to set your coordinates"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LocationIcon className={`h-4 w-4 text-teal-700 dark:text-teal-400 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Locating...' : 'Use my location'}</span>
          </button>
        </div>

        {geoStatus && (
          <p className="mt-2 text-xs font-medium text-teal-800 dark:text-teal-300">
            {geoStatus}
          </p>
        )}
      </div>

      <DemographicsFields formData={formData} onChange={onChange} />
    </div>
  );
}

'use client';

import React from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { DemographicsFields } from './DemographicsFields';
import { LocateIcon } from '../ui/Icons';

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
    <div className="stack">
      <div className="q">
        <label htmlFor="place-input">
          Where do you live? <span style={{ color: 'var(--brand)' }}>*</span>
        </label>
        <div id="place-hint" className="caption">
          Locality, neighbourhood, landmark or 6-digit PIN code.
        </div>

        <div className="input-row">
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
          />

          <button
            type="button"
            onClick={onUseBrowserLocation}
            disabled={isLocating}
            aria-label="Use browser location to set your coordinates"
            className="btn"
          >
            <LocateIcon className={isLocating ? 'animate-spin' : ''} />
            <span className="hide-sm">{isLocating ? 'Locating...' : 'Use my location'}</span>
          </button>
        </div>

        {geoStatus && (
          <div className="caption" style={{ color: 'var(--brand)', marginTop: 8 }}>
            {geoStatus}
          </div>
        )}
      </div>

      <DemographicsFields formData={formData} onChange={onChange} />
    </div>
  );
}

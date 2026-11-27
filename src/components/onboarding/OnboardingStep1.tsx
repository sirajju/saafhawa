'use client';

import React from 'react';
import { OptionGroup } from './OptionGroup';
import { LocateIcon, AlertCircleIcon } from '../ui/Icons';

interface OnboardingStep1Props {
  area: string;
  adultsCount: number;
  childrenCount: number;
  elderlyCount: number;
  hasAsthmaOrRespiratoryCondition: boolean;
  areaError: string | null;
  areaNote: string | null;
  isLocating: boolean;
  onAreaChange: (val: string) => void;
  onFieldChange: (field: string, val: unknown) => void;
  onLocate: () => void;
  areaInputRef: React.RefObject<HTMLInputElement | null>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

export function OnboardingStep1({
  area,
  adultsCount,
  childrenCount,
  elderlyCount,
  hasAsthmaOrRespiratoryCondition,
  areaError,
  areaNote,
  isLocating,
  onAreaChange,
  onFieldChange,
  onLocate,
  areaInputRef,
  headingRef,
}: OnboardingStep1Props) {
  return (
    <section className="onb-step" data-step="1" aria-labelledby="s1h">
      <div className="eyebrow">Step 1 of 3 · Your home</div>
      <h1 id="s1h" ref={headingRef} tabIndex={-1} style={{ marginTop: '6px' }}>
        Where do you live, and who lives with you?
      </h1>
      <p className="onb-intro">
        We use this to tailor timing and advice. Nothing is stored on our servers.
      </p>

      <div className="q">
        <h3>
          <label htmlFor="area">Your area</label>
        </h3>
        <p className="caption" id="area-hint">
          City, locality or 6-digit pincode
        </p>
        <div className="input-row">
          <input
            id="area"
            ref={areaInputRef}
            type="text"
            value={area}
            onChange={(e) => onAreaChange(e.target.value)}
            placeholder="e.g. Lajpat Nagar, Delhi or 110024"
            aria-describedby="area-hint area-msg"
            aria-invalid={areaError ? 'true' : undefined}
          />
          <button
            type="button"
            className="btn icon-btn"
            id="locate"
            onClick={onLocate}
            disabled={isLocating}
            aria-label="Use my location"
          >
            <LocateIcon className={`icon ${isLocating ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div id="area-msg" aria-live="polite">
          {areaError && (
            <p className="field-error">
              <AlertCircleIcon className="icon" />
              {areaError}
            </p>
          )}
          {areaNote && <p className="field-note">{areaNote}</p>}
        </div>
      </div>

      <div className="q">
        <h3>Adults</h3>
        <p className="caption">18 to 64 years</p>
        <OptionGroup<number>
          label="Adults"
          value={adultsCount}
          onChange={(val) => onFieldChange('adultsCount', val)}
          options={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 5, label: '5+' },
          ]}
        />
      </div>

      <div className="q">
        <h3>Children</h3>
        <p className="caption">Under 18 — their lungs are most sensitive</p>
        <OptionGroup<number>
          label="Children"
          value={childrenCount}
          onChange={(val) => onFieldChange('childrenCount', val)}
          options={[
            { value: 0, label: 'None' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3+' },
          ]}
        />
      </div>

      <div className="q">
        <h3>Seniors</h3>
        <p className="caption">65 and over — morning smog hits them hardest</p>
        <OptionGroup<number>
          label="Seniors"
          value={elderlyCount}
          onChange={(val) => onFieldChange('elderlyCount', val)}
          options={[
            { value: 0, label: 'None' },
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3+' },
          ]}
        />
      </div>

      <div className="q">
        <h3>Does anyone have asthma or a breathing condition?</h3>
        <p className="caption">We&apos;ll prioritise filtration and stricter timing</p>
        <OptionGroup<boolean>
          label="Breathing condition"
          value={hasAsthmaOrRespiratoryCondition}
          onChange={(val) => onFieldChange('hasAsthmaOrRespiratoryCondition', val)}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
        />
      </div>
    </section>
  );
}

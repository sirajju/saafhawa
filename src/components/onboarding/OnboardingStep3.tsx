'use client';

import React from 'react';
import { OptionGroup } from './OptionGroup';
import { PlanRequest } from '@/lib/plan/types';

interface OnboardingStep3Props {
  homeAreaSqFt: number;
  cookingFuel: PlanRequest['cookingFuel'];
  hasAirPurifier: boolean;
  hasKitchenChimneyOrExhaust: boolean;
  hasAirConditioner: boolean;
  incenseChoice: 'often' | 'sometimes' | 'no' | null;
  budget: PlanRequest['budget'];
  onFieldChange: (field: string, val: unknown) => void;
  onToggleEquipment: (field: 'hasAirPurifier' | 'hasKitchenChimneyOrExhaust' | 'hasAirConditioner') => void;
  onIncenseChange: (choice: 'often' | 'sometimes' | 'no') => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

export function OnboardingStep3({
  homeAreaSqFt,
  cookingFuel,
  hasAirPurifier,
  hasKitchenChimneyOrExhaust,
  hasAirConditioner,
  incenseChoice,
  budget,
  onFieldChange,
  onToggleEquipment,
  onIncenseChange,
  headingRef,
}: OnboardingStep3Props) {
  // Map home area sq ft to 4 BHK sizes
  const homeSize =
    homeAreaSqFt <= 600 ? 550 :
    homeAreaSqFt <= 1100 ? 950 :
    homeAreaSqFt <= 1600 ? 1400 : 2000;

  return (
    <section className="onb-step" data-step="3" aria-labelledby="s3h">
      <div className="eyebrow">Step 3 of 3 · Inside your home</div>
      <h1 id="s3h" ref={headingRef} tabIndex={-1} style={{ marginTop: '6px' }}>
        What&apos;s your home like inside?
      </h1>
      <p className="onb-intro">
        Indoor air can be far cleaner than outside — or worse. These answers decide which fixes we suggest.
      </p>

      <div className="q">
        <h3>Home size</h3>
        <p className="caption">Used to size purifiers and filters</p>
        <OptionGroup<number>
          label="Home size"
          value={homeSize}
          onChange={(val) => onFieldChange('homeAreaSqFt', val)}
          options={[
            { value: 550, label: '1 BHK' },
            { value: 950, label: '2 BHK' },
            { value: 1400, label: '3 BHK' },
            { value: 2000, label: 'Larger' },
          ]}
        />
      </div>

      <div className="q">
        <h3>Cooking fuel</h3>
        <p className="caption">Burning fuel indoors adds fine particles</p>
        <OptionGroup<PlanRequest['cookingFuel']>
          label="Cooking fuel"
          value={cookingFuel}
          onChange={(val) => onFieldChange('cookingFuel', val)}
          options={[
            { value: 'lpg', label: 'LPG' },
            { value: 'piped_gas', label: 'Piped gas' },
            { value: 'induction', label: 'Induction' },
            { value: 'biomass', label: 'Wood or chulha' },
          ]}
        />
      </div>

      <div className="q">
        <h3>What do you already have?</h3>
        <p className="caption">Select all that apply</p>
        <div className="opts" role="group" aria-label="Equipment">
          <button
            type="button"
            className="opt"
            aria-pressed={hasAirPurifier}
            onClick={() => onToggleEquipment('hasAirPurifier')}
          >
            Air purifier
          </button>
          <button
            type="button"
            className="opt"
            aria-pressed={hasKitchenChimneyOrExhaust}
            onClick={() => onToggleEquipment('hasKitchenChimneyOrExhaust')}
          >
            Kitchen chimney or exhaust
          </button>
          <button
            type="button"
            className="opt"
            aria-pressed={hasAirConditioner}
            onClick={() => onToggleEquipment('hasAirConditioner')}
          >
            Air conditioner
          </button>
        </div>
      </div>

      <div className="q">
        <h3>Does anyone burn incense, dhoop or mosquito coils indoors?</h3>
        <p className="caption">Common and easy to fix — no judgement</p>
        <OptionGroup<'often' | 'sometimes' | 'no'>
          label="Incense"
          value={incenseChoice}
          onChange={onIncenseChange}
          options={[
            { value: 'often', label: 'Yes, often' },
            { value: 'sometimes', label: 'Sometimes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </div>

      <div className="q">
        <h3>Budget for fixes this month</h3>
        <p className="caption">We&apos;ll start with free actions either way</p>
        <OptionGroup<PlanRequest['budget']>
          label="Budget"
          value={budget === 'moderate' || budget === 'flexible' ? 'moderate' : budget === 'low' ? 'low' : 'zero_cost'}
          onChange={(val) => onFieldChange('budget', val)}
          options={[
            { value: 'zero_cost', label: 'Free only' },
            { value: 'low', label: 'Up to ₹2,000 ', cost: '· DIY filter' },
            { value: 'moderate', label: 'Up to ₹10,000 ', cost: '· purifier' },
          ]}
        />
      </div>
    </section>
  );
}

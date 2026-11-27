'use client';

import React from 'react';
import { OptionGroup } from './OptionGroup';
import { CarIcon, BikeIcon, BusIcon, WalkIcon, HomeIcon } from '../ui/Icons';
import { type PlanRequest } from '@/lib/plan/types';

interface OnboardingStep2Props {
  primaryCommuteMode: PlanRequest['primaryCommuteMode'];
  dailyCommuteDistanceKm: number;
  commutersCount: number;
  canWorkFromHome: boolean;
  hasCarpoolOption: boolean;
  onFieldChange: (field: string, val: unknown) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}

export function OnboardingStep2({
  primaryCommuteMode,
  dailyCommuteDistanceKm,
  commutersCount,
  canWorkFromHome,
  hasCarpoolOption,
  onFieldChange,
  headingRef,
}: OnboardingStep2Props) {
  // Map numeric km to the 4 discrete ranges in reference
  const distanceRange =
    dailyCommuteDistanceKm <= 5
      ? 4
      : dailyCommuteDistanceKm <= 15
        ? 10
        : dailyCommuteDistanceKm <= 30
          ? 20
          : 35;

  return (
    <section className="onb-step" data-step="2" aria-labelledby="s2h">
      <div className="eyebrow">Step 2 of 3 · Getting around</div>
      <h1 id="s2h" ref={headingRef} tabIndex={-1} style={{ marginTop: '6px' }}>
        How does your household get around?
      </h1>
      <p className="onb-intro">
        Your commute shapes both the smog you breathe and the smog you add.
      </p>

      <div className="q">
        <h3>Main way to work, school or college</h3>
        <p className="caption">Pick the one used most days</p>
        <OptionGroup<PlanRequest['primaryCommuteMode']>
          label="Main commute"
          className="opt-grid"
          isCard={true}
          value={primaryCommuteMode}
          onChange={(val) => onFieldChange('primaryCommuteMode', val)}
          options={[
            {
              value: 'petrol_car',
              label: 'Car',
              hint: 'Petrol, diesel or CNG',
              icon: <CarIcon className="icon" />,
            },
            {
              value: 'two_wheeler',
              label: 'Two-wheeler',
              hint: 'Bike or scooter',
              icon: <BikeIcon className="icon" />,
            },
            {
              value: 'public_transit',
              label: 'Metro or bus',
              hint: 'Public transport',
              icon: <BusIcon className="icon" />,
            },
            {
              value: 'walking_cycling',
              label: 'Walk or cycle',
              hint: 'Most exposed to street air',
              icon: <WalkIcon className="icon" />,
            },
            {
              value: 'none',
              label: 'No daily commute',
              hint: 'Work or study from home',
              icon: <HomeIcon className="icon" />,
            },
          ]}
        />
      </div>

      <div className="q">
        <h3>Round trip per day</h3>
        <p className="caption">Rough distance for one person</p>
        <OptionGroup<number>
          label="Distance"
          value={distanceRange}
          onChange={(val) => onFieldChange('dailyCommuteDistanceKm', val)}
          options={[
            { value: 4, label: 'Under 5 km' },
            { value: 10, label: '5–15 km' },
            { value: 20, label: '15–30 km' },
            { value: 35, label: '30+ km' },
          ]}
        />
      </div>

      <div className="q">
        <h3>People who commute</h3>
        <p className="caption">Travel outside most weekdays</p>
        <OptionGroup<number>
          label="Commuters"
          value={commutersCount >= 3 ? 3 : commutersCount <= 1 ? 1 : 2}
          onChange={(val) => onFieldChange('commutersCount', val)}
          options={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3+' },
          ]}
        />
      </div>

      <div className="q">
        <h3>On bad days, could someone work from home?</h3>
        <p className="caption">We&apos;ll suggest it only when the air is worst</p>
        <OptionGroup<boolean>
          label="Work from home"
          value={canWorkFromHome}
          onChange={(val) => onFieldChange('canWorkFromHome', val)}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
        />
      </div>

      <div className="q">
        <h3>Could you share rides with someone?</h3>
        <p className="caption">Colleagues, neighbours or a school pool</p>
        <OptionGroup<boolean>
          label="Carpool"
          value={hasCarpoolOption}
          onChange={(val) => onFieldChange('hasCarpoolOption', val)}
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
        />
      </div>
    </section>
  );
}

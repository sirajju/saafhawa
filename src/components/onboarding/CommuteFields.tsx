'use client';

import React from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { ChoiceChipGroup } from './ChoiceChipGroup';
import { CarIcon, BikeIcon, BusIcon, WalkIcon, HomeIcon, ShieldIcon } from '../ui/Icons';

interface CommuteFieldsProps {
  formData: PlanRequest;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
}

export function CommuteFields({ formData, onChange }: CommuteFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Primary Commute Mode */}
      <ChoiceChipGroup<PlanRequest['primaryCommuteMode']>
        label="Primary Commute Mode"
        description="How does your household typically travel to work, college, or daily destinations?"
        value={formData.primaryCommuteMode}
        onChange={(val) => onChange('primaryCommuteMode', val)}
        options={[
          { value: 'petrol_car', label: 'Car (Petrol / Diesel)', icon: <CarIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'two_wheeler', label: 'Two-Wheeler (Bike / Scooter)', icon: <BikeIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'public_transit', label: 'Metro / Public Bus', icon: <BusIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'walking_cycling', label: 'Walk / Bicycle', icon: <WalkIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'none', label: 'Work From Home / None', icon: <HomeIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
        ]}
      />

      {/* Daily Commute Distance */}
      <ChoiceChipGroup<number>
        label="Round-trip commute distance per person"
        description="Typical total distance traveled each working day."
        value={formData.dailyCommuteDistanceKm}
        onChange={(val) => onChange('dailyCommuteDistanceKm', val)}
        options={[
          { value: 5, label: '5 km' },
          { value: 10, label: '10 km' },
          { value: 20, label: '20 km' },
          { value: 35, label: '35+ km' },
        ]}
      />

      {/* Commuters Count */}
      <ChoiceChipGroup<number>
        label="Number of daily commuters"
        description="Occupants traveling outside daily on weekdays."
        value={formData.commutersCount}
        onChange={(val) => onChange('commutersCount', val)}
        options={[
          { value: 0, label: '0' },
          { value: 1, label: '1 Commuter' },
          { value: 2, label: '2 Commuters' },
          { value: 3, label: '3+ Commuters' },
        ]}
      />

      {/* Work From Home Flexibility */}
      <ChoiceChipGroup<boolean>
        label="Can you work from home on high smog days?"
        description="Allows your workplace or school to accommodate remote schedules during severe smog emergencies."
        value={formData.canWorkFromHome}
        onChange={(val) => onChange('canWorkFromHome', val)}
        options={[
          { value: true, label: 'Yes (WFH Option)', icon: <HomeIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: false, label: 'No (In-person required)' },
        ]}
      />

      {/* Carpool Option */}
      <ChoiceChipGroup<boolean>
        label="Do you have a carpool or ride-sharing option?"
        description="Can share transit with colleagues, neighbors, or organized carpool pools."
        value={formData.hasCarpoolOption}
        onChange={(val) => onChange('hasCarpoolOption', val)}
        options={[
          { value: true, label: 'Yes (Carpool viable)', icon: <CarIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: false, label: 'No (Solo transit)', icon: <ShieldIcon className="h-4 w-4 text-slate-500" /> },
        ]}
      />
    </div>
  );
}

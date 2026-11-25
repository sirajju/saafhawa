'use client';

import React from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { ChoiceChipGroup } from './ChoiceChipGroup';
import { ShieldIcon, AlertTriangleIcon } from '../ui/Icons';

interface DemographicsFieldsProps {
  formData: PlanRequest;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
}

export function DemographicsFields({ formData, onChange }: DemographicsFieldsProps) {
  return (
    <div className="stack">
      {/* Adults Count */}
      <ChoiceChipGroup<number>
        label="Adults in home (18–64 yrs)"
        description="Adult occupants needing active daily commute and exposure guidance."
        value={formData.adultsCount}
        onChange={(val) => onChange('adultsCount', val)}
        options={[
          { value: 1, label: '1 Adult' },
          { value: 2, label: '2 Adults' },
          { value: 3, label: '3 Adults' },
          { value: 4, label: '4 Adults' },
          { value: 5, label: '5+ Adults' },
        ]}
      />

      {/* Children Count */}
      <ChoiceChipGroup<number>
        label="Children in home (0–17 yrs)"
        description="Developing lungs are exceptionally vulnerable to morning smog peaks."
        value={formData.childrenCount}
        onChange={(val) => onChange('childrenCount', val)}
        options={[
          { value: 0, label: '0' },
          { value: 1, label: '1 Child' },
          { value: 2, label: '2 Children' },
          { value: 3, label: '3+ Children' },
        ]}
      />

      {/* Seniors Count */}
      <ChoiceChipGroup<number>
        label="Seniors (65+ yrs)"
        description="High cardiovascular and respiratory susceptibility during winter temperature inversions."
        value={formData.elderlyCount}
        onChange={(val) => onChange('elderlyCount', val)}
        options={[
          { value: 0, label: '0' },
          { value: 1, label: '1 Senior' },
          { value: 2, label: '2 Seniors' },
          { value: 3, label: '3+ Seniors' },
        ]}
      />

      {/* Asthma / Respiratory Sensitivity */}
      <ChoiceChipGroup<boolean>
        label="Asthma or Respiratory Sensitivity?"
        description="Does anyone in the household suffer from asthma, chronic bronchitis, or severe dust allergies?"
        value={formData.hasAsthmaOrRespiratoryCondition}
        onChange={(val) => onChange('hasAsthmaOrRespiratoryCondition', val)}
        options={[
          { value: false, label: 'No', icon: <ShieldIcon className="h-4 w-4" /> },
          { value: true, label: 'Yes (High Sensitivity)', icon: <AlertTriangleIcon className="h-4 w-4" /> },
        ]}
      />

      {/* Outdoor Exposure Time */}
      <ChoiceChipGroup<number>
        label="Daily outdoor hours per person"
        description="Average daily time spent outside for school, shopping, or errands."
        value={formData.dailyOutdoorHoursPerPerson}
        onChange={(val) => onChange('dailyOutdoorHoursPerPerson', val)}
        options={[
          { value: 0.5, label: '< 1 hr' },
          { value: 1.5, label: '1–2 hrs' },
          { value: 3.5, label: '3–4 hrs' },
          { value: 5, label: '5+ hrs' },
        ]}
      />
    </div>
  );
}

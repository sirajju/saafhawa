'use client';

import React from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { ChoiceChipGroup } from './ChoiceChipGroup';
import { FlameIcon, ZapIcon, FilterIcon, WindIcon, ShieldIcon, AlertTriangleIcon } from '../ui/Icons';

interface IndoorEnvironmentFieldsProps {
  formData: PlanRequest;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
}

export function IndoorEnvironmentFields({ formData, onChange }: IndoorEnvironmentFieldsProps) {
  return (
    <div className="space-y-6">
      {/* Home Area */}
      <ChoiceChipGroup<number>
        label="Home floor area"
        description="Used to compute air changes per hour (ACH) and clean air delivery rates."
        value={formData.homeAreaSqFt}
        onChange={(val) => onChange('homeAreaSqFt', val)}
        options={[
          { value: 500, label: 'Small (< 600 sq ft)' },
          { value: 1000, label: 'Medium (600–1200 sq ft)' },
          { value: 1600, label: 'Large (1200–2000 sq ft)' },
          { value: 2500, label: 'Villa (2000+ sq ft)' },
        ]}
      />

      {/* Cooking Fuel */}
      <ChoiceChipGroup<PlanRequest['cookingFuel']>
        label="Primary Cooking Fuel"
        description="Direct combustion sources create substantial indoor fine PM2.5 spikes."
        value={formData.cookingFuel}
        onChange={(val) => onChange('cookingFuel', val)}
        options={[
          { value: 'lpg', label: 'LPG Cylinder', icon: <FlameIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'piped_gas', label: 'Piped Natural Gas (PNG)' },
          { value: 'induction', label: 'Induction / Electric', icon: <ZapIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'biomass', label: 'Traditional Wood / Biomass' },
        ]}
      />

      {/* Winter Heating */}
      <ChoiceChipGroup<PlanRequest['heatingFuel']>
        label="Winter Heating Source"
        description="Heating fuels used during chilly winter mornings and nights."
        value={formData.heatingFuel}
        onChange={(val) => onChange('heatingFuel', val)}
        options={[
          { value: 'none', label: 'None / Not needed' },
          { value: 'electric', label: 'Electric Room Heater', icon: <ZapIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'kerosene', label: 'Kerosene Heater' },
          { value: 'biomass', label: 'Wood / Fireplace' },
        ]}
      />

      {/* Window Sealing */}
      <ChoiceChipGroup<PlanRequest['windowSealingQuality']>
        label="Window Sealing & Draftiness"
        description="Drafty doors and unsealed window cracks allow outdoor particulate infiltration."
        value={formData.windowSealingQuality}
        onChange={(val) => onChange('windowSealingQuality', val)}
        options={[
          { value: 'poor', label: 'Poor (Drafty cracks)' },
          { value: 'average', label: 'Average' },
          { value: 'good', label: 'Good (Tightly sealed)' },
        ]}
      />

      {/* Air Purifier Equipment */}
      <ChoiceChipGroup<boolean>
        label="Do you have an Air Purifier at home?"
        description="HEPA or equivalent mechanical particulate filter in sleeping or living area."
        value={formData.hasAirPurifier}
        onChange={(val) => onChange('hasAirPurifier', val)}
        options={[
          { value: false, label: 'No Purifier' },
          { value: true, label: 'Yes, Air Purifier Installed', icon: <FilterIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
        ]}
      />

      {/* Kitchen Chimney / Exhaust */}
      <ChoiceChipGroup<boolean>
        label="Kitchen Exhaust Fan or Chimney?"
        description="Mechanical exhaust that pulls cooking smoke and oil aerosols outdoors."
        value={formData.hasKitchenChimneyOrExhaust}
        onChange={(val) => onChange('hasKitchenChimneyOrExhaust', val)}
        options={[
          { value: false, label: 'No Exhaust / Chimney' },
          { value: true, label: 'Yes, Chimney / Exhaust Installed', icon: <WindIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
        ]}
      />

      {/* Daily Habits & Combustions (NOT PRE-TICKED: User must explicitly choose) */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Daily Household Habits (Choose if applicable)
        </div>

        {/* Incense / Coils (Default FALSE / NOT PRE-TICKED) */}
        <ChoiceChipGroup<boolean>
          label="Uses incense (agarbatti), dhoop, or mosquito coils daily?"
          description="Burning incense emits ultra-fine PM2.5 and benzene directly into enclosed living spaces."
          value={formData.usesIncenseOrMosquitoCoils}
          onChange={(val) => onChange('usesIncenseOrMosquitoCoils', val)}
          options={[
            { value: false, label: 'No (Never / Rarely)', icon: <ShieldIcon className="h-4 w-4 text-slate-500" /> },
            { value: true, label: 'Yes (Daily / Frequent)', icon: <FlameIcon className="h-4 w-4 text-amber-600" /> },
          ]}
        />

        {/* Garden Waste Burning (Default FALSE / NOT PRE-TICKED) */}
        <ChoiceChipGroup<boolean>
          label="Open waste or garden leaf burning nearby?"
          description="Local smoldering leaf or plastic waste piles nearby that cause localized smoke plumes."
          value={formData.hasGardenOrOpenWasteBurning}
          onChange={(val) => onChange('hasGardenOrOpenWasteBurning', val)}
          options={[
            { value: false, label: 'No nearby burning', icon: <ShieldIcon className="h-4 w-4 text-slate-500" /> },
            { value: true, label: 'Yes, neighborhood burning occurs', icon: <AlertTriangleIcon className="h-4 w-4 text-amber-600" /> },
          ]}
        />

        {/* Outdoor Exercise (Default FALSE / NOT PRE-TICKED) */}
        <ChoiceChipGroup<boolean>
          label="Does outdoor exercise (morning jogging, cycling, brisk walking)?"
          description="Deep ventilation during morning smog spikes multiplies inhaled particulate dose 4×."
          value={formData.doesOutdoorExercise}
          onChange={(val) => onChange('doesOutdoorExercise', val)}
          options={[
            { value: false, label: 'No outdoor workouts', icon: <ShieldIcon className="h-4 w-4 text-slate-500" /> },
            { value: true, label: 'Yes, exercises outdoors' },
          ]}
        />
      </div>

      {/* Action Budget Preference */}
      <ChoiceChipGroup<PlanRequest['budget']>
        label="Action Budget Preference"
        description="Select the investment level you prefer for recommended clean air interventions."
        value={formData.budget}
        onChange={(val) => onChange('budget', val)}
        options={[
          { value: 'zero_cost', label: 'Zero-Cost Only' },
          { value: 'low', label: 'Low Cost (DIY & Masks)', icon: <ShieldIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" /> },
          { value: 'moderate', label: 'Moderate' },
          { value: 'flexible', label: 'Flexible' },
        ]}
      />
    </div>
  );
}

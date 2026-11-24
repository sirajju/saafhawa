import React from 'react';
import { PlanRequest } from '@/lib/plan/types';

interface IndoorEnvironmentFieldsProps {
  formData: PlanRequest;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
}

export function IndoorEnvironmentFields({ formData, onChange }: IndoorEnvironmentFieldsProps) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-800">
      <legend className="px-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Indoor Air & Cooking Setup
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="cooking-fuel"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Primary Cooking Fuel
          </label>
          <select
            id="cooking-fuel"
            value={formData.cookingFuel}
            onChange={(e) => onChange('cookingFuel', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="lpg">LPG Cylinder</option>
            <option value="piped_gas">Piped Natural Gas (PNG)</option>
            <option value="induction">Electric Induction Cooktop</option>
            <option value="biomass">Traditional Biomass / Firewood / Chulha</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="budget-preference"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Action Budget Preference
          </label>
          <select
            id="budget-preference"
            value={formData.budget}
            onChange={(e) => onChange('budget', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="zero_cost">Zero Cost Only (DIY & Behavioural routines)</option>
            <option value="low">Low Budget (N95 masks, DIY box fan filter, weatherseals)</option>
            <option value="moderate">Moderate (Ready for air purifiers or induction swaps)</option>
            <option value="flexible">Flexible / Any budget</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <label className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasAirPurifier}
            onChange={(e) => onChange('hasAirPurifier', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Household already owns a HEPA air purifier</span>
        </label>

        <label className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.usesIncenseOrMosquitoCoils}
            onChange={(e) => onChange('usesIncenseOrMosquitoCoils', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Regularly burns incense sticks (agarbatti), dhoop, or mosquito coils</span>
        </label>
      </div>
    </fieldset>
  );
}

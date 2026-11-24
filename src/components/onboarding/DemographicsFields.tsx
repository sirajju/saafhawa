import React from 'react';
import { PlanRequest } from '@/lib/plan/types';

interface DemographicsFieldsProps {
  formData: PlanRequest;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
}

export function DemographicsFields({ formData, onChange }: DemographicsFieldsProps) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-800">
      <legend className="px-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Who lives in your home?
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="adults-count"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Adults (18-64 yrs)
          </label>
          <input
            id="adults-count"
            type="number"
            min="1"
            max="15"
            value={formData.adultsCount}
            onChange={(e) => onChange('adultsCount', Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="children-count"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Children (0-17 yrs)
          </label>
          <input
            id="children-count"
            type="number"
            min="0"
            max="10"
            value={formData.childrenCount}
            onChange={(e) => onChange('childrenCount', Math.max(0, parseInt(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="elderly-count"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Seniors (65+ yrs)
          </label>
          <input
            id="elderly-count"
            type="number"
            min="0"
            max="10"
            value={formData.elderlyCount}
            onChange={(e) => onChange('elderlyCount', Math.max(0, parseInt(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasAsthmaOrRespiratoryCondition}
            onChange={(e) => onChange('hasAsthmaOrRespiratoryCondition', e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"
          />
          <div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Someone in the home has Asthma, COPD, or a respiratory condition
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We will prioritize clinical-grade indoor filtration and high-filtration routines.
            </p>
          </div>
        </label>
      </div>
    </fieldset>
  );
}

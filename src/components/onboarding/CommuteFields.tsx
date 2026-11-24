import React from 'react';
import { PlanRequest } from '@/lib/plan/types';

interface CommuteFieldsProps {
  formData: PlanRequest;
  onChange: (field: keyof PlanRequest, value: string | number | boolean) => void;
}

export function CommuteFields({ formData, onChange }: CommuteFieldsProps) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-800">
      <legend className="px-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Daily Commute & Travel
      </legend>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="commute-mode"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Primary Commute Mode
          </label>
          <select
            id="commute-mode"
            value={formData.primaryCommuteMode}
            onChange={(e) => onChange('primaryCommuteMode', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="petrol_car">Petrol Car</option>
            <option value="diesel_car">Diesel Car</option>
            <option value="two_wheeler">Two-Wheeler (Motorcycle / Scooter)</option>
            <option value="public_transit">Metro / Bus / Train</option>
            <option value="walking_cycling">Walking / Bicycle</option>
            <option value="none">Work from Home / No Daily Commute</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="commute-distance"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Round-Trip Distance (km/day)
          </label>
          <input
            id="commute-distance"
            type="number"
            min="0"
            max="300"
            value={formData.dailyCommuteDistanceKm}
            onChange={(e) => onChange('dailyCommuteDistanceKm', Math.max(0, parseFloat(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>

        <div>
          <label
            htmlFor="commuters-count"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Number of Commuters
          </label>
          <input
            id="commuters-count"
            type="number"
            min="0"
            max="15"
            value={formData.commutersCount ?? 1}
            onChange={(e) => onChange('commutersCount', Math.max(0, parseInt(e.target.value) || 0))}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.canWorkFromHome}
            onChange={(e) => onChange('canWorkFromHome', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Can work from home on peak smog days</span>
        </label>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.hasCarpoolOption}
            onChange={(e) => onChange('hasCarpoolOption', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Has carpool or ride-sharing options</span>
        </label>
      </div>
    </fieldset>
  );
}

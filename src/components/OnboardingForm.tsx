'use client';

import React, { useState } from 'react';
import { PlanRequest } from '@/lib/plan/types';

interface OnboardingFormProps {
  initialProfile?: Partial<PlanRequest> | null;
  onSubmit: (profile: PlanRequest) => void;
  onCancel?: () => void;
  isEditing?: boolean;
}

const DEFAULT_PROFILE: PlanRequest = {
  place: '110001',
  adultsCount: 2,
  childrenCount: 0,
  elderlyCount: 0,
  hasAsthmaOrRespiratoryCondition: false,
  primaryCommuteMode: 'petrol_car',
  dailyCommuteDistanceKm: 20,
  cookingFuel: 'lpg',
  heatingFuel: 'none',
  hasAirPurifier: false,
  hasKitchenChimneyOrExhaust: true,
  usesIncenseOrMosquitoCoils: true,
  hasGardenOrOpenWasteBurning: false,
  windowSealingQuality: 'average',
  dailyOutdoorHoursPerPerson: 1.5,
  doesOutdoorExercise: false,
  exerciseHoursPerDay: 1,
  homeAreaSqFt: 1000,
  canWorkFromHome: true,
  hasCarpoolOption: true,
  budget: 'low',
};

export function OnboardingForm({
  initialProfile,
  onSubmit,
  onCancel,
  isEditing = false,
}: OnboardingFormProps) {
  const [formData, setFormData] = useState<PlanRequest>({
    ...DEFAULT_PROFILE,
    ...(initialProfile || {}),
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (
    field: keyof PlanRequest,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const placeTrimmed = formData.place.trim();
    if (placeTrimmed.length < 2) {
      setErrorMessage('Please enter a valid place name, city, or pincode (at least 2 characters).');
      return;
    }
    if (placeTrimmed.length > 120) {
      setErrorMessage('Place name cannot exceed 120 characters.');
      return;
    }

    if (formData.adultsCount < 1) {
      setErrorMessage('Household must include at least 1 adult occupant.');
      return;
    }

    onSubmit({
      ...formData,
      place: placeTrimmed,
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="border-b border-slate-200 bg-slate-50/70 p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-2xl text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
              🏡
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
                {isEditing ? 'Update Household Profile' : 'Tell Us About Your Household'}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                We personalize daily low-emission routines and indoor clean-air hacks to where and how you live.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8" noValidate>
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950/80 dark:text-rose-200"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* 1. Location / Pincode */}
            <div>
              <label
                htmlFor="place-input"
                className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
              >
                Where do you live? <span className="text-rose-600">*</span>
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Enter your area name, landmark, city, or 6-digit Indian pincode.
              </p>
              <div className="relative mt-2">
                <input
                  id="place-input"
                  type="text"
                  required
                  aria-required="true"
                  value={formData.place}
                  onChange={(e) => handleChange('place', e.target.value)}
                  placeholder="e.g. Connaught Place, New Delhi or 110001"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {/* 2. Demographics */}
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
                    onChange={(e) => handleChange('adultsCount', Math.max(1, parseInt(e.target.value) || 1))}
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
                    onChange={(e) => handleChange('childrenCount', Math.max(0, parseInt(e.target.value) || 0))}
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
                    onChange={(e) => handleChange('elderlyCount', Math.max(0, parseInt(e.target.value) || 0))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Respiratory condition checkbox */}
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasAsthmaOrRespiratoryCondition}
                    onChange={(e) => handleChange('hasAsthmaOrRespiratoryCondition', e.target.checked)}
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

            {/* 3. Commute Details */}
            <fieldset className="rounded-xl border border-slate-200 p-4 sm:p-5 dark:border-slate-800">
              <legend className="px-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daily Commute & Travel
              </legend>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                    onChange={(e) => handleChange('primaryCommuteMode', e.target.value)}
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
                    max="150"
                    value={formData.dailyCommuteDistanceKm}
                    onChange={(e) => handleChange('dailyCommuteDistanceKm', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.canWorkFromHome}
                    onChange={(e) => handleChange('canWorkFromHome', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Can work from home on peak smog days</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasCarpoolOption}
                    onChange={(e) => handleChange('hasCarpoolOption', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Has carpool or ride-sharing options</span>
                </label>
              </div>
            </fieldset>

            {/* 4. Cooking & Indoor Environment */}
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
                    onChange={(e) => handleChange('cookingFuel', e.target.value)}
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
                    onChange={(e) => handleChange('budget', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value="zero_cost">Zero Cost Only (DIY & Behavioural routines)</option>
                    <option value="low">Low Budget (N95 masks, DIY box fan filter, weatherseals)</option>
                    <option value="moderate">Moderate (Ready for air purifiers or induction swaps)</option>
                    <option value="flexible">Flexible / Any budget</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <label className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasAirPurifier}
                    onChange={(e) => handleChange('hasAirPurifier', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Household already owns a HEPA air purifier</span>
                </label>

                <label className="flex items-center gap-3 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.usesIncenseOrMosquitoCoils}
                    onChange={(e) => handleChange('usesIncenseOrMosquitoCoils', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Regularly burns incense sticks (agarbatti), dhoop, or mosquito coils</span>
                </label>
              </div>
            </fieldset>
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto dark:hover:bg-emerald-500"
            >
              <span>{isEditing ? 'Save & Regenerate Plan' : 'Generate My Smog Action Plan'}</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

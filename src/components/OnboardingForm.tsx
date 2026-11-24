'use client';

import React, { useState } from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { DemographicsFields } from './onboarding/DemographicsFields';
import { CommuteFields } from './onboarding/CommuteFields';
import { IndoorEnvironmentFields } from './onboarding/IndoorEnvironmentFields';

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
  commutersCount: 1,
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

        <form onSubmit={handleSubmit} aria-label="Household Profile Form" className="p-6 sm:p-8" noValidate>
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

            <DemographicsFields formData={formData} onChange={handleChange} />
            <CommuteFields formData={formData} onChange={handleChange} />
            <IndoorEnvironmentFields formData={formData} onChange={handleChange} />
          </div>

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

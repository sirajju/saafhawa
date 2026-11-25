'use client';

import React from 'react';
import { PlanSummary } from '@/lib/plan/types';
import { EQUIVALENCY_FACTORS, VEHICULAR_EMISSION_FACTORS } from '@/lib/impact/factors';
import { ShieldIcon, SparklesIcon, CarIcon, BrandIcon } from './ui/Icons';

interface TotalSavingsBannerProps {
  summary: PlanSummary;
  generationMethod?: 'gemini' | 'rule_based_fallback';
}

export function TotalSavingsBanner({
  summary,
  generationMethod = 'gemini',
}: TotalSavingsBannerProps) {
  const dose = summary.totalPm25InhaledDoseAvoidedUg;
  const isDoseUnknown = summary.isExposureUnknown || dose === null;
  const co2Kg = summary.totalCo2EmissionsSavedKg;
  const pm25Grams = summary.totalPm25EmissionsSavedGrams;

  const cigaretteEquiv =
    !isDoseUnknown && dose > 0
      ? Math.round(dose / EQUIVALENCY_FACTORS.CIGARETTE_INHALED_PM25_DOSE_UG)
      : 0;

  const carKmEquiv = Math.round(
    (summary.totalCo2EmissionsSavedGrams || 0) / VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM
  );

  return (
    <section
      aria-labelledby="total-savings-heading"
      className="rounded-2xl border border-teal-900/30 bg-teal-950 p-6 text-white shadow-sm dark:border-teal-800/40 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800/40 pb-3.5">
        <div className="flex items-center gap-2">
          <BrandIcon className="h-5 w-5 text-teal-300" />
          <h2
            id="total-savings-heading"
            className="text-lg font-bold tracking-tight text-white"
          >
            What Following This Plan Saves Today
          </h2>
        </div>
        <span className="rounded-full bg-teal-500/20 px-3 py-0.5 text-xs font-semibold text-teal-300 border border-teal-400/30">
          {generationMethod === 'gemini' ? 'AI-Curated' : 'Rule-Based Priority'}
        </span>
      </div>

      {/* Compact Row of 3 Numbers with 1-Line Explanation Each (No nested bordered boxes) */}
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Metric 1: Inhaled Dose Avoided */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300">
            <ShieldIcon className="h-3.5 w-3.5" />
            <span>Inhaled Dose Avoided</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {isDoseUnknown ? 'Unknown' : dose.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-teal-200">
              {isDoseUnknown ? '(missing PM2.5)' : 'µg PM₂.₅'}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-teal-100/80">
            {isDoseUnknown
              ? 'Local PM2.5 measurements are currently unavailable.'
              : dose > 0
              ? `Avoids toxic smoke equivalent to ~${cigaretteEquiv} cigarettes across your family today.`
              : 'Zero particulate exposure avoided under clean baseline air.'}
          </p>
        </div>

        {/* Metric 2: PM2.5 Emissions Prevented */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300">
            <SparklesIcon className="h-3.5 w-3.5" />
            <span>PM₂.₅ Emissions Saved</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {pm25Grams.toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-teal-200">grams</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-teal-100/80">
            {pm25Grams > 0
              ? 'Prevents hazardous fine soot from entering your neighborhood’s shared air.'
              : 'Focuses entirely on defensive indoor exposure protection today.'}
          </p>
        </div>

        {/* Metric 3: CO2 Emissions Saved */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300">
            <CarIcon className="h-3.5 w-3.5" />
            <span>CO₂ Tailpipe Saved</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {co2Kg.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-teal-200">kg CO₂</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-teal-100/80">
            {co2Kg > 0
              ? `Equivalent to taking an average passenger car off the road for ~${carKmEquiv} km.`
              : 'No travel combustion changes recommended in today’s plan.'}
          </p>
        </div>
      </div>

      {/* Explanatory line explaining overlapping actions */}
      <p className="mt-5 border-t border-teal-800/40 pt-3 text-center text-xs text-teal-200/90 sm:text-left">
        Overlapping actions are adjusted, so the total can be less than the cards added together.
      </p>
    </section>
  );
}

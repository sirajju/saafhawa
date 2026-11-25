import React from 'react';
import { PlanSummary } from '@/lib/plan/types';
import { EQUIVALENCY_FACTORS, VEHICULAR_EMISSION_FACTORS } from '@/lib/impact/factors';

interface TotalSavingsBannerProps {
  summary: PlanSummary;
  householdName?: string;
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

  const cigaretteEquiv = !isDoseUnknown && dose > 0
    ? Math.round(dose / EQUIVALENCY_FACTORS.CIGARETTE_INHALED_PM25_DOSE_UG)
    : 0;

  const carKmEquiv = Math.round((summary.totalCo2EmissionsSavedGrams || 0) / VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM);

  return (
    <section
      aria-labelledby="total-savings-heading"
      className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-lg sm:p-8 dark:border-emerald-800"
    >
      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
            <span aria-hidden="true">🌱</span>
            <span>Cumulative Daily Action Plan Impact</span>
          </div>

          {generationMethod === 'gemini' ? (
            <span className="rounded-full bg-teal-400/20 px-2.5 py-0.5 text-[11px] font-medium text-teal-200 ring-1 ring-teal-300/30">
              ✨ AI-Curated with Scientific Arithmetic
            </span>
          ) : (
            <span className="rounded-full bg-slate-400/20 px-2.5 py-0.5 text-[11px] font-medium text-slate-200 ring-1 ring-slate-300/30">
              🛡️ Rule-Based Priority Plan
            </span>
          )}
        </div>

        <h2
          id="total-savings-heading"
          className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          What Following This Plan Saves Today
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-emerald-100/90">
          Small, coordinated routine shifts and filtration hacks create massive cumulative health defense and cleaner air for your community.
        </p>

        {/* 3 Metric Pillars */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 1. PM2.5 Inhaled Dose Avoided */}
          <div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <span aria-hidden="true">🫁</span>
              <span>Inhaled Dose Avoided</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white sm:text-4xl">
                {isDoseUnknown ? 'Unknown' : dose.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-emerald-200">
                {isDoseUnknown ? '(missing PM2.5)' : 'µg PM₂.₅'}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-emerald-100/80">
              {isDoseUnknown ? (
                'Local PM2.5 measurements are currently unavailable to calculate particulate dose.'
              ) : dose > 0 ? (
                <>
                  Equivalent to avoiding the toxic smoke of{' '}
                  <strong className="text-white font-bold">~{cigaretteEquiv} cigarettes</strong> across your family today.
                </>
              ) : (
                'Zero particulate dose avoided under clean ambient baseline air.'
              )}
            </p>
          </div>

          {/* 2. Direct CO2 Emissions Prevented */}
          <div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-300">
              <span aria-hidden="true">🌍</span>
              <span>CO₂ Emissions Saved</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white sm:text-4xl">
                {co2Kg}
              </span>
              <span className="text-sm font-semibold text-teal-200">kg CO₂</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-emerald-100/80">
              Equal to keeping an average car off city roads for{' '}
              <strong className="text-white font-bold">~{carKmEquiv} km</strong>.
            </p>
          </div>

          {/* 3. Direct PM2.5 Source Emissions Prevented */}
          <div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <span aria-hidden="true">🛑</span>
              <span>Source PM₂.₅ Prevented</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white sm:text-4xl">
                {pm25Grams >= 1
                  ? pm25Grams.toFixed(1)
                  : (pm25Grams * 1000).toFixed(0)}
              </span>
              <span className="text-sm font-semibold text-amber-200">
                {pm25Grams >= 1 ? 'grams' : 'mg'} PM₂.₅
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-emerald-100/80">
              Stops hazardous soot and tailpipe smoke from polluting your neighborhood air.
            </p>
          </div>
        </div>

        {/* Adjusted Overlapping Actions Note */}
        <p className="mt-4 text-xs text-emerald-100/80">
          Overlapping actions are adjusted, so the total can be less than the cards added together.
        </p>
      </div>
    </section>
  );
}

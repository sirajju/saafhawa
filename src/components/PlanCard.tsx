'use client';

import React, { useState } from 'react';
import { PlannedAction } from '@/lib/plan/types';
import {
  getCategoryBadgeDetails,
  getEmissionComparisonText,
  getExposureComparisonText,
} from '@/lib/impact/comparisons';

interface PlanCardProps {
  action: PlannedAction;
}

export function PlanCard({ action }: PlanCardProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const badge = getCategoryBadgeDetails(action.category);
  const exposureText = getExposureComparisonText(action.exposureReduction, action.actionId);
  const emissionText = getEmissionComparisonText(action.emissionReduction, action.actionId);

  const dose = action.exposureReduction.pm25InhaledDoseAvoidedUg;
  const pm25Saved = action.emissionReduction.pm25SavedGrams;
  const co2Saved = action.emissionReduction.co2SavedGrams;

  return (
    <article
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border transition-all duration-200 ${
        isCompleted
          ? 'border-emerald-300 bg-emerald-50/40 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
      }`}
    >
      <div className="p-5 sm:p-6">
        {/* Top Badges & Time of Day */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${badge.badgeClass}`}
          >
            <span aria-hidden="true">{badge.icon}</span>
            <span>{badge.label}</span>
          </span>

          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
            <span aria-hidden="true">⏰</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {action.suggestedTimeOfDay}
            </span>
          </div>
        </div>

        {/* Action Title & Description */}
        <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {action.title}
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {action.description}
        </p>

        {/* Why this suits your family */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/60">
          <div className="flex items-start gap-2">
            <span className="text-base" aria-hidden="true">
              💡
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Why this suits your family today:
              </span>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                {action.reason}
              </p>
            </div>
          </div>
        </div>

        {/* Two Impact Figures with Plain-Language Comparisons */}
        <div className="mt-4 space-y-3">
          {/* Figure 1: Exposure Avoided */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">🛡️</span>
                <span>Personal Exposure Avoided</span>
              </span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                {dose > 0 ? `${dose} µg dose avoided` : 'Shields from peak spikes'}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {exposureText}
            </p>
          </div>

          {/* Figure 2: Emissions Saved */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">🌿</span>
                <span>Emissions Saved</span>
              </span>
              <span className="font-bold text-teal-700 dark:text-teal-400">
                {co2Saved > 0 || pm25Saved > 0
                  ? `${co2Saved >= 1000 ? `${(co2Saved / 1000).toFixed(1)} kg` : `${co2Saved.toFixed(0)} g`} CO₂`
                  : 'Zero added emissions'}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {emissionText}
            </p>
          </div>
        </div>
      </div>

      {/* Card Footer: Interactive Toggle */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/30">
        <label className="flex items-center justify-between cursor-pointer select-none">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {isCompleted ? '✓ Completed for today' : 'Mark as completed'}
          </span>
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950"
            aria-label={`Mark action "${action.title}" as completed`}
          />
        </label>
      </div>
    </article>
  );
}

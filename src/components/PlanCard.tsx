'use client';

import React, { useState } from 'react';
import { PlannedAction } from '@/lib/plan/types';
import {
  getCategoryBadgeDetails,
  getEmissionComparisonText,
  getExposureComparisonText,
} from '@/lib/impact/comparisons';
import { ClockIcon, ShieldIcon, SparklesIcon, CheckIcon, CircleIcon, ChevronDownIcon } from './ui/Icons';

interface PlanCardProps {
  action: PlannedAction;
  isDone?: boolean;
  isCompleted?: boolean;
  onToggleDone?: (actionId: string) => void;
}

export function PlanCard({
  action,
  isDone: controlledDone,
  isCompleted: propCompleted,
  onToggleDone,
}: PlanCardProps) {
  const [internalDone, setInternalDone] = useState(false);
  const isDoneResolved = propCompleted !== undefined ? propCompleted : controlledDone;
  const isCompleted = isDoneResolved !== undefined ? isDoneResolved : internalDone;

  const handleToggle = () => {
    if (onToggleDone) {
      onToggleDone(action.actionId);
    } else {
      setInternalDone((prev) => !prev);
    }
  };

  const badge = getCategoryBadgeDetails(action.category);
  const exposureText = getExposureComparisonText(action.exposureReduction, action.actionId);
  const emissionText = getEmissionComparisonText(action.emissionReduction, action.actionId);

  const dose = action.exposureReduction.pm25InhaledDoseAvoidedUg;
  const pm25Saved = action.emissionReduction.pm25SavedGrams;
  const co2Saved = action.emissionReduction.co2SavedGrams;
  const hasEmissions = pm25Saved > 0 || co2Saved > 0;

  return (
    <article
      className={`group relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition-all duration-200 animate-card-enter ${
        isCompleted
          ? 'border-teal-300 bg-teal-50/40 shadow-xs dark:border-teal-800 dark:bg-teal-950/20'
          : 'border-slate-200/90 bg-white shadow-xs hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <ClockIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
            <span>{action.suggestedTimeOfDay}</span>
          </span>

          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{badge.label}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <h3
            className={`mt-2.5 text-lg font-bold tracking-tight ${
              isCompleted
                ? 'text-teal-950 line-through decoration-teal-600 dark:text-teal-100'
                : 'text-slate-900 dark:text-slate-50'
            }`}
          >
            {action.title}
          </h3>
          {action.costLabel && (
            <span className="mt-2.5 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {action.costLabel}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-base leading-relaxed text-slate-600 dark:text-slate-400">
          <strong className="font-semibold text-slate-800 dark:text-slate-200">Why this suits your family: </strong>
          {action.reason}
        </p>

        {action.basisExplanation && (
          <p className="mt-1 text-xs italic text-slate-500 dark:text-slate-400">
            Based on: {action.basisExplanation}
          </p>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-3">
          {action.exposureReduction.isUnknown || dose === null ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <ShieldIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>Impact unknown</span>
            </span>
          ) : dose > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-900 dark:bg-teal-950/60 dark:text-teal-200">
              <ShieldIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              <span>{dose} µg dose avoided</span>
            </span>
          ) : null}

          {hasEmissions && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              <SparklesIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              <span>
                {pm25Saved > 0 ? `${pm25Saved.toFixed(2)} g PM₂.₅` : ''}
                {pm25Saved > 0 && co2Saved > 0 ? ' · ' : ''}
                {co2Saved > 0 ? `${(co2Saved / 1000).toFixed(1)} kg CO₂` : ''} saved
              </span>
            </span>
          )}
        </div>

        <details className="group mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <summary className="cursor-pointer select-none text-xs font-semibold text-teal-800 hover:text-teal-900 focus:outline-none dark:text-teal-400 dark:hover:text-teal-300">
            <span className="inline-flex items-center gap-1.5">
              <span>Details</span>
              <ChevronDownIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-2.5 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            <p>{action.description}</p>
            {action.methodologyNotes && (
              <p className="text-xs text-slate-500 italic dark:text-slate-400">
                Methodology: {action.methodologyNotes}
              </p>
            )}
            <p className="text-xs">{exposureText}</p>
            {hasEmissions && <p className="text-xs">{emissionText}</p>}
          </div>
        </details>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={isCompleted}
          aria-label={`Mark action "${action.title}" as ${isCompleted ? 'incomplete' : 'completed'}`}
          className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
            isCompleted
              ? 'bg-teal-800 text-white shadow-xs hover:bg-teal-900 dark:bg-teal-700 dark:hover:bg-teal-600'
              : 'border border-slate-300 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {isCompleted ? (
            <CheckIcon className="h-4 w-4 text-white" />
          ) : (
            <CircleIcon className="h-4 w-4 text-slate-400" />
          )}
          <span>{isCompleted ? 'Done' : 'Mark as done'}</span>
        </button>

        {isCompleted && (
          <span className="text-xs font-semibold text-teal-800 dark:text-teal-400">
            Completed today
          </span>
        )}
      </div>
    </article>
  );
}

'use client';

import React from 'react';
import { PlanResponse } from '@/lib/plan/types';
import { ShareIcon, AlertTriangleIcon, CheckCircleIcon } from '@/components/ui/Icons';

interface DashboardHeaderProps {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  plan: PlanResponse;
  currentPlaceName: string;
  doneCount: number;
  totalActions: number;
  progressPercent: number;
  onOpenAdvisoryModal?: () => void;
}

export function DashboardHeader({
  headingRef,
  plan,
  currentPlaceName,
  doneCount,
  totalActions,
  progressPercent,
  onOpenAdvisoryModal,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-slate-200 pb-5 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50 focus:outline-none"
          >
            Clean Air Action Plan for {plan.location.name}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tailored daily routine, indoor air interventions, and low-emission swaps for your household today.
          </p>
        </div>

        {onOpenAdvisoryModal && (
          <button
            type="button"
            onClick={onOpenAdvisoryModal}
            aria-label={`Share advisory for ${currentPlaceName}`}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-900 shadow-2xs hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-teal-800 dark:bg-teal-950/70 dark:text-teal-200"
          >
            <ShareIcon className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            <span>Share Advisory</span>
          </button>
        )}
      </div>

      {plan.isSampleData && (
        <div
          role="status"
          aria-label="Sample data mode active notice"
          className="mt-3.5 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
        >
          <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
          <span>Sample Data: Using built-in reference air quality data.</span>
        </div>
      )}

      {/* Today's Action Progress Counter */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5">
          <CheckCircleIcon className="h-5 w-5 text-teal-700 dark:text-teal-400 shrink-0" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today&apos;s Action Progress
            </span>
            <div className="text-base font-extrabold text-slate-900 dark:text-slate-50">
              {doneCount} of {totalActions} done ({progressPercent}%)
            </div>
          </div>
        </div>

        <div className="w-full max-w-xs sm:w-56">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={totalActions}
            aria-label="Daily action plan completion progress"
          >
            <div
              className="h-full rounded-full bg-teal-700 transition-all duration-300 ease-out dark:bg-teal-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

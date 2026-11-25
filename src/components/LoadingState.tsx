'use client';

import React, { useEffect, useState } from 'react';
import { BrandIcon, AlertTriangleIcon } from './ui/Icons';

interface LoadingStateProps {
  isSampleData?: boolean;
}

const getLoadingMessages = (isSample: boolean) => [
  isSample
    ? 'Connecting to reference air quality data...'
    : 'Connecting to air quality sensors...',
  'Analyzing PM2.5, PM10, and diurnal temperature inversion...',
  'Evaluating 21 mitigation strategies for your family...',
  'Consulting Gemini AI for customized routine optimizations...',
  'Computing exact microgram exposure reductions and carbon savings...',
  'Finalizing your customized clean air plan...',
];

export function LoadingState({ isSampleData = false }: LoadingStateProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const loadingMessages = getLoadingMessages(isSampleData);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 space-y-8"
    >
      {/* Reassuring Loading Status Card */}
      <div className="rounded-2xl border border-teal-200/80 bg-teal-50/70 p-5 dark:border-teal-900/60 dark:bg-teal-950/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-800 text-white shadow-xs dark:bg-teal-700 animate-pulse motion-reduce:animate-none">
              <BrandIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-teal-950 dark:text-teal-100">
                Crafting Your Winter Smog Action Plan
              </h2>
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300">
                {loadingMessages[stepIndex]}
              </p>
            </div>
          </div>

          {isSampleData && (
            <div
              role="status"
              aria-label="Sample data mode active"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200"
            >
              <AlertTriangleIcon className="h-3.5 w-3.5" />
              <span>Sample Data Mode</span>
            </div>
          )}
        </div>

        {/* Pulse Bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-teal-200/60 dark:bg-teal-900/60">
          <div
            className="h-full bg-teal-700 transition-all duration-500 ease-out motion-reduce:transition-none dark:bg-teal-400"
            style={{ width: `${Math.min(100, Math.round(((stepIndex + 1) / loadingMessages.length) * 100))}%` }}
          />
        </div>
      </div>

      {/* SKELETON: Matches Real Layout */}
      <div className="animate-pulse space-y-8 motion-reduce:animate-none">
        {/* Header Skeleton */}
        <div className="space-y-3 border-b border-slate-200 pb-5 dark:border-slate-800">
          <div className="h-7 w-2/3 max-w-md rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/2 max-w-sm rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-10 w-full max-w-sm rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Top AQI Card Skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex justify-between items-center">
            <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="flex items-baseline gap-4">
            <div className="h-16 w-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>

          <div className="h-14 w-full rounded-xl bg-slate-200 dark:bg-slate-800" />

          {/* 24-hr Chart Skeleton */}
          <div className="h-36 w-full rounded-xl bg-slate-100 dark:bg-slate-800/60 p-4 flex items-end gap-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-slate-200 dark:bg-slate-700"
                style={{ height: `${30 + (i % 7) * 10}%` }}
              />
            ))}
          </div>
        </div>

        {/* Total Savings Banner Skeleton */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900/60 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>

        {/* Daily Timeline Slots Skeleton */}
        <div className="space-y-6">
          <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" />
            <div className="h-44 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" />
          </div>
        </div>
      </div>
    </div>
  );
}

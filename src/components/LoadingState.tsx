'use client';

import React, { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  'Connecting to live air quality sensors...',
  'Analyzing PM2.5, PM10, and diurnal temperature inversion...',
  'Evaluating 21 mitigation strategies for your family...',
  'Consulting Gemini AI for customized routine optimizations...',
  'Computing exact microgram exposure reductions and carbon savings...',
  'Finalizing your customized clean air plan...',
];

export function LoadingState() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6"
    >
      <div className="flex flex-col items-center text-center">
        {/* Animated breathing circle */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute h-20 w-20 animate-ping rounded-full bg-emerald-400 opacity-20 motion-reduce:animate-none" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-700 text-3xl shadow-lg shadow-emerald-700/30">
            <span aria-hidden="true" className="animate-pulse motion-reduce:animate-none">
              🍃
            </span>
          </div>
        </div>

        <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
          Crafting Your Winter Smog Action Plan
        </h2>
        <p className="mt-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          {LOADING_MESSAGES[stepIndex]}
        </p>

        {/* Visual Progress Bar */}
        <div className="mt-6 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-emerald-700 transition-all duration-500 ease-out motion-reduce:transition-none dark:bg-emerald-500"
            style={{
              width: `${Math.min(95, ((stepIndex + 1) / LOADING_MESSAGES.length) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Skeleton Preview Cards */}
      <div className="mt-12 space-y-6">
        <div className="h-44 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
        <div className="h-32 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/80 motion-reduce:animate-none dark:border-slate-800 dark:bg-slate-900" />
        </div>
      </div>
    </div>
  );
}

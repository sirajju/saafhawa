import React from 'react';
import { AlertTriangleIcon, RefreshIcon, EditIcon } from './Icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onChangeLocation?: () => void;
}

export function ErrorState({
  message,
  onRetry,
  onChangeLocation,
}: ErrorStateProps) {
  return (
    <div className="mx-auto mt-8 max-w-2xl px-4 sm:px-6">
      <div
        role="alert"
        className="rounded-2xl border border-rose-200/90 bg-rose-50/70 p-6 sm:p-8 shadow-xs dark:border-rose-900/60 dark:bg-rose-950/40"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
            <AlertTriangleIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-rose-950 sm:text-lg dark:text-rose-100">
              Unable to Load Air Quality or Plan
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-rose-800 dark:text-rose-300">
              {message || 'We could not reach the air quality sensors or generate your family’s plan right now.'}
            </p>
            <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-400/80">
              Your profile is safely stored. Please check your internet connection or try again.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-700 dark:hover:bg-teal-600"
                >
                  <RefreshIcon className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              )}
              {onChangeLocation && (
                <button
                  type="button"
                  onClick={onChangeLocation}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-900 shadow-2xs hover:bg-rose-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200"
                >
                  <EditIcon className="h-4 w-4" />
                  <span>Change Location</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

interface ChatHeaderProps {
  isSampleData?: boolean;
}

export function ChatHeader({ isSampleData = false }: ChatHeaderProps) {
  return (
    <>
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-lg dark:bg-emerald-950 dark:text-emerald-300">
              💬
            </span>
            <div>
              <h2
                id="chat-heading"
                className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-50"
              >
                Ask SaafHawa Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSampleData
                  ? 'Connected to reference AQI data, 24-hr forecast, and scientific calculator'
                  : 'Connected to live AQI sensors, 24-hr forecast, and scientific calculator'}
              </p>
            </div>
          </div>

          {isSampleData ? (
            <span
              role="status"
              aria-label="Sample data mode active"
              className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Sample Data Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
              Live Tools Active
            </span>
          )}
        </div>
      </div>

      <div className="border-b border-amber-200/80 bg-amber-50/70 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="font-semibold">⚠️ Health Advisory: </span>
        For persistent cough, asthma attacks, or chest distress, always consult a qualified medical doctor.
      </div>
    </>
  );
}

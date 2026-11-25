import React from 'react';
import { AdvisoryResponse } from '@/lib/community/types';
import { RefreshIcon, AlertTriangleIcon } from './ui/Icons';

interface AdvisoryModalBodyProps {
  isLoading: boolean;
  errorMessage: string | null;
  advisory: AdvisoryResponse | null;
  language: 'en' | 'hi';
}

export function AdvisoryModalBody({
  isLoading,
  errorMessage,
  advisory,
  language,
}: AdvisoryModalBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-6">
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <RefreshIcon className="h-8 w-8 animate-spin text-teal-700 dark:text-teal-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Generating customized {language === 'hi' ? 'Hindi' : 'English'} advisory...
          </p>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-rose-700 dark:text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {advisory && !isLoading && (
        <div className="space-y-4">
          {advisory.isSampleData && (
            <div
              role="status"
              aria-label="Sample data advisory notice"
              className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
            >
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                <span><strong>Sample Data Active:</strong> This advisory was generated using reference baseline data.</span>
              </div>
            </div>
          )}

          {/* WhatsApp Preview Share Card */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <span className="uppercase tracking-wider">WhatsApp Message Preview</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                Ready to Broadcast
              </span>
            </div>

            {/* Simulated WhatsApp Chat Bubble */}
            <div className="mt-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 text-slate-900 shadow-2xs dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-slate-100">
              <div
                lang={language === 'hi' ? 'hi' : 'en'}
                className="whitespace-pre-wrap font-sans text-sm leading-relaxed"
              >
                {advisory.advisoryText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

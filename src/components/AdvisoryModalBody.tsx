import React from 'react';
import { AdvisoryResponse } from '@/lib/community/types';

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
          <span className="text-3xl animate-spin" aria-hidden="true">
            ⚙️
          </span>
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
            <span aria-hidden="true">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {advisory && !isLoading && (
        <div className="space-y-4">
          <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 font-mono text-xs text-slate-800 shadow-inner sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-slate-200">
            <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[11px] font-sans font-bold text-emerald-800 dark:text-emerald-400">
              <span aria-hidden="true">📱</span>
              <span>WhatsApp Ready</span>
            </div>

            <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed pr-16">
              {advisory.advisoryText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { BrandIcon, ShieldIcon } from './ui/Icons';

interface FooterProps {
  dataSource?: string;
}

export function Footer({ dataSource }: FooterProps = {}) {
  const activeSource = dataSource || 'Open-Meteo (CAMS model)';

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/80 py-8 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-white dark:bg-teal-700">
              <BrandIcon className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100">SaafHawa</span>
              <span className="ml-2 text-[11px] text-slate-500">Evidence-based clean air assistant</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <ShieldIcon className="h-4 w-4 text-teal-700 shrink-0 dark:text-teal-400" />
            <span>Health decisions remain yours. Always seek professional care for respiratory distress.</span>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800/80 dark:text-slate-500">
          <p>
            <strong>Data sources &amp; methodology:</strong> Real-time air quality data via <span className="font-semibold text-slate-700 dark:text-slate-300">{activeSource}</span>, benchmarked against India Central Pollution Control Board (CPCB) standards. Inhalation dose models adapted from US EPA Exposure Factors Handbook. Health protective guidance aligned with World Health Organization (WHO) 2021 Global Air Quality Guidelines.
          </p>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import { ChatIcon, CloseIcon } from './ui/Icons';
import { formatMeasurementTime } from '@/lib/air-quality/cpcb-aqi';

export interface ChatHeaderProps {
  isSampleData?: boolean;
  dataSource?: string;
  measuredTime?: string;
  timeZone?: string;
  onClose?: () => void;
}

export function ChatHeader({
  isSampleData = false,
  dataSource,
  measuredTime,
  timeZone = 'Asia/Kolkata',
  onClose,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-slate-200 bg-white p-4 sm:px-5 sm:py-3.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-800 text-white dark:bg-teal-700">
            <ChatIcon className="h-4 w-4" />
          </div>
          <div>
            <h2
              id="chat-heading"
              className="text-base font-bold text-slate-900 dark:text-slate-50"
            >
              Ask SaafHawa Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isSampleData
                ? 'Connected to reference AQI data, 24-hr forecast, and scientific calculator'
                : 'Connected to real-time air quality data, 24-hr forecast, and scientific calculator'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSampleData ? (
            <span
              role="status"
              aria-label="Sample data mode active"
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Sample Data Mode</span>
            </span>
          ) : (
            <div className="flex flex-col items-end text-right text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {dataSource || 'Open-Meteo (CAMS model)'}
              </span>
              {measuredTime && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Measured {formatMeasurementTime(measuredTime, timeZone)}
                </span>
              )}
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

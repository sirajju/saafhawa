import React from 'react';
import { getAqiCategoryDetails } from '@/lib/impact/comparisons';
import { formatHourInPlaceLocalTime } from '@/lib/chat/tools';

export interface ForecastPoint {
  dateTime: string;
  aqi: number | null;
  category: string | null;
  dominantPollutant: string | null;
  pm25?: { value: number; units: string } | null;
  pm10?: { value: number; units: string } | null;
}

interface ForecastTimelineProps {
  hourlyForecast: ForecastPoint[];
}

function formatHour(dateTimeIso: string): string {
  return formatHourInPlaceLocalTime(dateTimeIso);
}

export function ForecastTimeline({ hourlyForecast }: ForecastTimelineProps) {
  if (!hourlyForecast || hourlyForecast.length === 0) return null;

  return (
    <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          24-Hour Hourly Forecast
        </h3>
        <span className="text-[11px] text-slate-600 dark:text-slate-300">
          Scroll to view upcoming hours →
        </span>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin"
        tabIndex={0}
        role="region"
        aria-label="Hourly air quality forecast scroll list"
      >
        {hourlyForecast.map((point, index) => {
          const hourCat = getAqiCategoryDetails(point.category, point.aqi);
          return (
            <div
              key={index}
              className="flex min-w-[95px] flex-col items-center rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center dark:border-slate-800 dark:bg-slate-950/60"
            >
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {formatHour(point.dateTime)}
              </span>
              <span className="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-100">
                {point.aqi !== null ? point.aqi : '—'}
              </span>
              <span
                className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${hourCat.badgeClass}`}
              >
                {hourCat.categoryText}
              </span>
              {point.pm25 && (
                <span className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                  {Math.round(point.pm25.value)} µg/m³
                </span>
              )}
              <span className="sr-only">
                Forecast at {formatHour(point.dateTime)}: AQI {point.aqi}, category {hourCat.categoryText}, PM2.5 {point.pm25 ? `${point.pm25.value} µg/m³` : 'not available'}.
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

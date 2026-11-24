import React from 'react';
import { CleanLocation, CurrentAirQuality } from '@/lib/air-quality/types';
import { getAqiCategoryDetails } from '@/lib/impact/comparisons';

interface AirQualityCardProps {
  location: CleanLocation;
  current: CurrentAirQuality;
  isSampleData?: boolean;
  hourlyForecast?: Array<{
    dateTime: string;
    aqi: number | null;
    category: string | null;
    dominantPollutant: string | null;
    pm25?: { value: number; units: string } | null;
    pm10?: { value: number; units: string } | null;
  }>;
}

function formatHour(dateTimeIso: string): string {
  try {
    const d = new Date(dateTimeIso);
    return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
  } catch {
    return dateTimeIso;
  }
}

export function AirQualityCard({
  location,
  current,
  isSampleData,
  hourlyForecast = [],
}: AirQualityCardProps) {
  const categoryInfo = getAqiCategoryDetails(current.category, current.aqi);
  const isSample = Boolean(isSampleData || current.isSampleData);

  return (
    <section
      aria-labelledby="air-quality-heading"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="p-6 sm:p-8">
        {/* Top Header: Location & Index Source */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span aria-hidden="true">📍</span>
              <span>Live Air Quality Monitoring</span>
            </div>
            <h2
              id="air-quality-heading"
              className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl dark:text-slate-50"
            >
              {location.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reported Index: {current.indexDisplayName || current.indexCode || 'National Air Quality Standard'}
            </p>

            {/* Visible Sample Data Indicator */}
            {isSample && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2" role="status" aria-label="Sample data notice">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-0.5 text-xs font-bold text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200">
                  <span aria-hidden="true">⚠️</span>
                  <span>Sample Data</span>
                </span>
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Displaying built-in New Delhi reference data (API key not configured)
                </span>
              </div>
            )}
          </div>

          {/* Accessible Category Badge */}
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-bold shadow-sm ${categoryInfo.badgeClass}`}
            role="status"
            aria-label={`Air quality category: ${categoryInfo.categoryText}`}
          >
            <span className="text-xl" aria-hidden="true">
              {categoryInfo.icon}
            </span>
            <div className="text-left">
              <div className="text-[11px] uppercase tracking-wider opacity-80">Air Category</div>
              <div className="text-base font-extrabold sm:text-lg leading-tight">
                {categoryInfo.categoryText}
              </div>
            </div>
            <span className="sr-only">
              Current air quality category is {categoryInfo.categoryText}.
            </span>
          </div>
        </div>

        {/* Main Score & Pollutant Details */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* AQI Score */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Air Quality Index (AQI)
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
                {current.aqi !== null ? current.aqi : 'N/A'}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                / {current.indexCode === 'ind_cpcb' ? '500 scale' : '100 scale'}
              </span>
            </div>
            <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category: {categoryInfo.categoryText}
            </div>
            <span className="sr-only">
              Current Air Quality Index is {current.aqi !== null ? current.aqi : 'unavailable'} on {current.indexCode === 'ind_cpcb' ? '500 scale' : '100 scale'}, rated as {categoryInfo.categoryText}.
            </span>
          </div>

          {/* PM2.5 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Fine Particulate Matter (PM₂.₅)
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                {current.pm25 ? current.pm25.value : '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                µg/m³
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              {current.pm25 && current.pm25.value > 60
                ? `${Math.round(current.pm25.value / 15)}× WHO 24-hr guideline`
                : 'Primary respirable winter pollutant'}
            </p>
            <span className="sr-only">
              PM2.5 particulate level is {current.pm25 ? `${current.pm25.value} micrograms per cubic meter` : 'not available'}.
            </span>
          </div>

          {/* PM10 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Coarse Inhalable Dust (PM₁₀)
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-slate-50">
                {current.pm10 ? current.pm10.value : '—'}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                µg/m³
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Dominant Pollutant: <span className="font-semibold uppercase">{current.dominantPollutant || 'PM2.5'}</span>
            </p>
            <span className="sr-only">
              PM10 coarse dust level is {current.pm10 ? `${current.pm10.value} micrograms per cubic meter` : 'not available'}. Dominant pollutant is {current.dominantPollutant || 'PM2.5'}.
            </span>
          </div>
        </div>

        {/* Health Advisory Note */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <span className="font-bold text-slate-900 dark:text-slate-100">Health Advisory: </span>
          <span>{categoryInfo.healthSummary}</span>
        </div>

        {/* 24-Hour Forecast Timeline */}
        {hourlyForecast.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                24-Hour Hourly Forecast
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
        )}
      </div>
    </section>
  );
}

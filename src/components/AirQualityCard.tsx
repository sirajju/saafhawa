'use client';

import React from 'react';
import { CleanLocation, CurrentAirQuality } from '@/lib/air-quality/types';
import { getAqiCategoryDetails } from '@/lib/impact/comparisons';
import { getAqiTextColorClass } from '@/lib/design-system';
import { ForecastChart, ForecastPoint } from './ForecastChart';
import { buildForecastAdvice, ForecastAdviceHousehold } from '@/lib/air-quality/forecast-advice';
import { formatMeasurementTime } from '@/lib/air-quality/cpcb-aqi';
import { LocationIcon, LightbulbIcon, ShieldIcon } from './ui/Icons';

interface AirQualityCardProps {
  location: CleanLocation;
  current: CurrentAirQuality;
  isSampleData?: boolean;
  hourlyForecast?: ForecastPoint[];
  householdProfile?: ForecastAdviceHousehold | null;
}

export function AirQualityCard({
  location,
  current,
  hourlyForecast = [],
  householdProfile,
}: AirQualityCardProps) {
  const categoryInfo = getAqiCategoryDetails(current.category, current.aqi);
  const aqiTextColor = getAqiTextColorClass(current.category, current.aqi);

  const syncedForecast = React.useMemo(() => {
    if (!hourlyForecast || hourlyForecast.length === 0) return [];
    if (typeof current.aqi !== 'number') return hourlyForecast;
    return hourlyForecast.map((pt, idx) => (idx === 0 ? { ...pt, aqi: current.aqi } : pt));
  }, [hourlyForecast, current.aqi]);

  const advice = buildForecastAdvice(
    current.aqi ?? 300,
    syncedForecast,
    householdProfile,
    location.timeZone
  );

  return (
    <section
      aria-labelledby="air-quality-heading"
      className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Location Subtitle & Heading */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-2 sm:pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <LocationIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
            <span className="truncate max-w-[220px] sm:max-w-none">{location.name}</span>
          </div>
          <h2
            id="air-quality-heading"
            className="mt-0.5 text-sm font-bold text-slate-900 sm:text-xl dark:text-slate-50"
          >
            Today&apos;s Air Quality &amp; Family Guidance
          </h2>
        </div>

        {/* Category Pill with strictly AQI-governed styling */}
        <div
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 sm:px-3 sm:py-1 font-bold shadow-2xs ${categoryInfo.badgeClass}`}
          role="status"
          aria-label={`Air quality category: ${categoryInfo.categoryText}`}
        >
          <ShieldIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm font-extrabold">
            {categoryInfo.categoryText}
          </span>
        </div>
      </div>

      {/* Large AQI Number & Category Name (Only 1 large number per section) */}
      <div className="mt-2.5 sm:mt-6 flex flex-wrap items-baseline gap-2.5 sm:gap-4">
        <span
          className={`text-4xl font-black tracking-tight sm:text-7xl ${aqiTextColor}`}
        >
          {current.aqi !== null ? current.aqi : 'N/A'}
        </span>
        <div>
          <div className="text-base font-extrabold text-slate-900 sm:text-2xl dark:text-slate-50">
            AQI · {categoryInfo.categoryText}
          </div>
          <div className="text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">
            {current.indexDisplayName || current.indexCode || 'India National AQI'}
          </div>
        </div>
      </div>

      {/* Reassuring Plain Guidance Sentence (No nested bordered box) */}
      <div className="mt-2.5 sm:mt-5 rounded-xl bg-teal-50/60 p-2.5 sm:p-4 dark:bg-teal-950/30">
        <div className="flex items-start gap-2 sm:gap-3">
          <LightbulbIcon className="h-4 w-4 sm:h-5 sm:w-5 text-teal-700 mt-0.5 shrink-0 dark:text-teal-300" />
          <div>
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
              Today&apos;s Family Guidance:
            </span>
            <p className="mt-0.5 text-xs sm:text-base font-medium text-teal-950 dark:text-teal-100 leading-snug sm:leading-relaxed">
              {advice.plainAdvice}
            </p>
          </div>
        </div>
      </div>

      {/* Screen Reader Announcements */}
      <span className="sr-only">
        Current Air Quality Index is {current.aqi !== null ? current.aqi : 'unavailable'}, rated as {categoryInfo.categoryText}. Current air quality category is {categoryInfo.categoryText}.
      </span>
      <span className="sr-only">
        PM2.5 particulate level is {current.pm25 ? `${current.pm25.value} micrograms per cubic meter` : 'not available'}.
      </span>
      <span className="sr-only">
        PM10 coarse dust level is {current.pm10 ? `${current.pm10.value} micrograms per cubic meter` : 'not available'}. Dominant pollutant is {current.dominantPollutant || 'PM2.5'}.
      </span>

      {/* 24-Hour Forecast Chart with Cleanest Window & Current Hour Indicator */}
      <ForecastChart
        hourlyForecast={syncedForecast}
        currentAqi={current.aqi}
        timeZone={location.timeZone}
        cleanestWindowStart={advice.cleanestWindowStart}
        cleanestWindowEnd={advice.cleanestWindowEnd}
      />

      {/* Clean Particulate Details (No nested borders) */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Fine PM₂.₅ Level
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
              {current.pm25 ? current.pm25.value : '—'}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              µg/m³
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {current.pm25 && current.pm25.value > 60
              ? `${Math.round(current.pm25.value / 15)}× WHO 24-hr guideline`
              : 'Primary inhalable winter pollutant'}
          </p>
        </div>

        <div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Coarse PM₁₀ Level
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-50">
              {current.pm10 ? current.pm10.value : '—'}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              µg/m³
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Dominant: <span className="font-semibold uppercase">{current.dominantPollutant || 'PM2.5'}</span>
          </p>
        </div>
      </div>

      {/* Data Source & Measurement Timestamp */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div>
          <span>Data source: </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {current.dataSource || 'Open-Meteo (CAMS model)'}
          </span>
        </div>
        {current.dateTime && (
          <div>
            <span>Measured: </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatMeasurementTime(current.dateTime, location.timeZone)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

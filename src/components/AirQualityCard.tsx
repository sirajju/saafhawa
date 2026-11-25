'use client';

import React from 'react';
import { CleanLocation, CurrentAirQuality } from '@/lib/air-quality/types';
import { getAqiCategoryDetails } from '@/lib/impact/comparisons';
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

function getAqiTextColorClass(category: string | null | undefined, aqi: number | null | undefined): string {
  const normCategory = (category || '').toLowerCase();
  if (normCategory.includes('severe') || normCategory.includes('hazardous') || (typeof aqi === 'number' && aqi > 400)) {
    return 'text-rose-700 dark:text-rose-400';
  }
  if (normCategory.includes('very poor') || normCategory.includes('very unhealthy') || (typeof aqi === 'number' && aqi > 300)) {
    return 'text-purple-700 dark:text-purple-400';
  }
  if (normCategory.includes('poor') || normCategory.includes('unhealthy') || (typeof aqi === 'number' && aqi > 200)) {
    return 'text-orange-600 dark:text-orange-400';
  }
  if (normCategory.includes('moderate') || (typeof aqi === 'number' && aqi > 100)) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-emerald-600 dark:text-emerald-400';
}

export function AirQualityCard({
  location,
  current,
  hourlyForecast = [],
  householdProfile,
}: AirQualityCardProps) {
  const categoryInfo = getAqiCategoryDetails(current.category, current.aqi);
  const aqiTextColor = getAqiTextColorClass(current.category, current.aqi);
  const advice = buildForecastAdvice(
    current.aqi ?? 300,
    hourlyForecast,
    householdProfile,
    location.timeZone
  );

  return (
    <section
      aria-labelledby="air-quality-heading"
      className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      {/* Location Subtitle & Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <LocationIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
            <span>{location.name}</span>
          </div>
          <h2
            id="air-quality-heading"
            className="mt-1 text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-50"
          >
            Today&apos;s Air Quality &amp; Family Guidance
          </h2>
        </div>

        {/* Category Pill with strictly AQI-governed styling */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-bold shadow-2xs ${categoryInfo.badgeClass}`}
          role="status"
          aria-label={`Air quality category: ${categoryInfo.categoryText}`}
        >
          <ShieldIcon className="h-4 w-4" />
          <span className="text-sm font-extrabold">
            {categoryInfo.categoryText}
          </span>
        </div>
      </div>

      {/* Large AQI Number & Category Name (Only 1 large number per section) */}
      <div className="mt-6 flex flex-wrap items-baseline gap-4">
        <span
          className={`text-6xl font-black tracking-tight sm:text-7xl ${aqiTextColor}`}
        >
          {current.aqi !== null ? current.aqi : 'N/A'}
        </span>
        <div>
          <div className="text-xl font-extrabold text-slate-900 sm:text-2xl dark:text-slate-50">
            AQI · {categoryInfo.categoryText}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {current.indexDisplayName || current.indexCode || 'India National AQI'}
          </div>
        </div>
      </div>

      {/* Reassuring Plain Guidance Sentence (No nested bordered box) */}
      <div className="mt-5 rounded-xl bg-teal-50/60 p-4 dark:bg-teal-950/30">
        <div className="flex items-start gap-3">
          <LightbulbIcon className="h-5 w-5 text-teal-700 mt-0.5 shrink-0 dark:text-teal-300" />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200">
              Today&apos;s Family Guidance:
            </span>
            <p className="mt-0.5 text-base font-medium text-teal-950 dark:text-teal-100 leading-relaxed">
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
        hourlyForecast={hourlyForecast}
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

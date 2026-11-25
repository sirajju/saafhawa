'use client';

import React from 'react';
import { formatHourInPlaceLocalTime } from '@/lib/chat/tools';
import { ForecastChartSvg } from './forecast/ForecastChartSvg';

export interface ForecastPoint {
  dateTime: string;
  aqi: number | null;
  category: string | null;
  dominantPollutant?: string | null;
  pm25?: { value: number; units: string } | null;
  pm10?: { value: number; units: string } | null;
}

interface ForecastChartProps {
  hourlyForecast: ForecastPoint[];
  timeZone?: string;
  cleanestWindowStart?: string;
  cleanestWindowEnd?: string;
}

function getAqiBarColor(aqi: number | null): string {
  if (aqi === null) return '#94a3b8';
  if (aqi <= 50) return '#10b981';
  if (aqi <= 100) return '#22c55e';
  if (aqi <= 200) return '#eab308';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#ef4444';
  return '#7f1d1d';
}

export function ForecastChart({
  hourlyForecast,
  timeZone = 'Asia/Kolkata',
  cleanestWindowStart,
  cleanestWindowEnd,
}: ForecastChartProps) {
  if (!hourlyForecast || hourlyForecast.length === 0) return null;

  const points = hourlyForecast.slice(0, 24);
  const aqiValues = points.map((p) => (typeof p.aqi === 'number' ? p.aqi : 0));
  const maxAqi = Math.max(400, ...aqiValues);
  const minAqi = Math.min(...aqiValues.filter((v) => v > 0));

  let peakIndex = 0;
  let cleanestIndex = 0;
  let highestVal = -Infinity;
  let lowestVal = Infinity;

  points.forEach((p, idx) => {
    const val = p.aqi ?? 0;
    if (val > highestVal) {
      highestVal = val;
      peakIndex = idx;
    }
    if (val > 0 && val < lowestVal) {
      lowestVal = val;
      cleanestIndex = idx;
    }
  });

  const peakPoint = points[peakIndex];
  const peakTimeStr = peakPoint ? formatHourInPlaceLocalTime(peakPoint.dateTime, timeZone) : '';
  const cleanestPoint = points[cleanestIndex];
  const cleanestTimeStr = cleanestPoint ? formatHourInPlaceLocalTime(cleanestPoint.dateTime, timeZone) : '';

  const chartHeight = 130;
  const chartWidth = 720;
  const barSpacing = chartWidth / points.length;
  const barWidth = Math.max(6, barSpacing - 6);

  const srSummary = `24-hour forecast chart: Current hour is marked as Now with AQI ${
    points[0]?.aqi ?? 'unavailable'
  }. Cleanest air window is ${cleanestWindowStart || cleanestTimeStr} to ${
    cleanestWindowEnd || 'afternoon'
  } with AQI around ${minAqi}. Peak smog is at ${peakTimeStr} with AQI ${highestVal}.`;

  return (
    <div
      className="mt-6 w-full max-w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60"
      role="region"
      aria-label="24-hour air quality forecast chart"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            24-Hour Forecast Trend
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
            Cleanest Window: {cleanestWindowStart || '1 PM'} – {cleanestWindowEnd || '4 PM'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Cleanest</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-slate-900 ring-2 ring-emerald-400 dark:bg-white" aria-hidden="true" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Now</span>
          </span>
        </div>
      </div>

      <div className="sr-only" tabIndex={0}>
        {srSummary}
      </div>

      <ForecastChartSvg
        points={points}
        timeZone={timeZone}
        chartWidth={chartWidth}
        chartHeight={chartHeight}
        barSpacing={barSpacing}
        barWidth={barWidth}
        maxAqi={maxAqi}
        cleanestIndex={cleanestIndex}
        getAqiBarColor={getAqiBarColor}
      />

      <div className="mt-2 flex flex-wrap items-center justify-between border-t border-slate-200/80 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
        <div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Current: </span>
          <span>AQI {points[0]?.aqi ?? '—'}</span>
        </div>
        <div>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">Best Window: </span>
          <span>{cleanestWindowStart || '1 PM'} – {cleanestWindowEnd || '4 PM'} (AQI ~{minAqi})</span>
        </div>
        <div>
          <span className="font-semibold text-rose-700 dark:text-rose-400">Smog Peak: </span>
          <span>{peakTimeStr} (AQI {highestVal})</span>
        </div>
      </div>
    </div>
  );
}

'use client';

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
  cleanestWindowStartIndex?: number;
  cleanestWindowLength?: number;
  currentAqi?: number | null;
}

/**
 * 24-hour interactive forecast chart showing AQI diurnal curve and safest outdoor ventilation window.
 */
export function ForecastChart({
  hourlyForecast,
  timeZone = 'Asia/Kolkata',
  cleanestWindowStart,
  cleanestWindowEnd,
  cleanestWindowStartIndex,
  cleanestWindowLength,
  currentAqi,
}: ForecastChartProps) {
  if (!hourlyForecast || hourlyForecast.length === 0) return null;

  const rawPoints = hourlyForecast.slice(0, 24);
  const points = rawPoints.map((p, idx) => {
    if (idx === 0 && typeof currentAqi === 'number') {
      return { ...p, aqi: currentAqi };
    }
    return p;
  });

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

  // Synchronize cleanest window with the advice start/end
  let finalCleanestIndex = cleanestIndex;
  let finalCleanestLength = 3;

  if (
    typeof cleanestWindowStartIndex === 'number' &&
    cleanestWindowStartIndex >= 0 &&
    cleanestWindowStartIndex < points.length
  ) {
    finalCleanestIndex = cleanestWindowStartIndex;
    finalCleanestLength =
      typeof cleanestWindowLength === 'number' && cleanestWindowLength > 0
        ? cleanestWindowLength
        : 3;
  } else if (cleanestWindowStart) {
    const normStart = cleanestWindowStart
      .replace(/^tomorrow\s+/i, '')
      .replace(/\u00A0/g, ' ')
      .trim();
    const foundStart = points.findIndex((p) => {
      const ptStr = formatHourInPlaceLocalTime(p.dateTime, timeZone)
        .replace(/\u00A0/g, ' ')
        .trim();
      return ptStr === normStart;
    });
    if (foundStart !== -1) {
      finalCleanestIndex = foundStart;
      if (cleanestWindowEnd) {
        const normEnd = cleanestWindowEnd
          .replace(/^tomorrow\s+/i, '')
          .replace(/\u00A0/g, ' ')
          .trim();
        const foundEnd = points.findIndex((p) => {
          const ptStr = formatHourInPlaceLocalTime(p.dateTime, timeZone)
            .replace(/\u00A0/g, ' ')
            .trim();
          return ptStr === normEnd;
        });
        if (foundEnd > foundStart) {
          finalCleanestLength = foundEnd - foundStart;
        }
      }
    }
  }

  const peakPoint = points[peakIndex];
  const peakTimeStr = peakPoint ? formatHourInPlaceLocalTime(peakPoint.dateTime, timeZone) : '';
  const cleanestPoint = points[finalCleanestIndex];
  const cleanestTimeStr = cleanestPoint
    ? formatHourInPlaceLocalTime(cleanestPoint.dateTime, timeZone)
    : '';

  const srSummary = `24-hour forecast chart: Current hour is marked as Now with AQI ${
    points[0]?.aqi ?? 'unavailable'
  }. Cleanest air window is ${cleanestWindowStart || cleanestTimeStr} to ${
    cleanestWindowEnd || 'afternoon'
  } with AQI around ${minAqi}. Peak smog is at ${peakTimeStr} with AQI ${highestVal}.`;

  return (
    <div className="forecast" role="region" aria-label="24-hour air quality forecast chart">
      <div className="forecast-head">
        <h3>Next 24 hours</h3>
        <span className="caption">AQI (hourly estimate, CPCB breakpoints)</span>
      </div>

      <ForecastChartSvg
        points={points}
        timeZone={timeZone}
        maxAqi={maxAqi}
        cleanestIndex={finalCleanestIndex}
        cleanestWindowLength={finalCleanestLength}
        srSummary={srSummary}
      />

      <div className="sr-only" tabIndex={0}>
        <span>{srSummary}</span>
        <span>Current: AQI {points[0]?.aqi ?? '—'}. </span>
        <span>
          Cleanest air window is {cleanestWindowStart || cleanestTimeStr} to{' '}
          {cleanestWindowEnd || 'afternoon'} with AQI around {minAqi}.{' '}
        </span>
        <span>
          Smog Peak: {peakTimeStr} (AQI {highestVal}).{' '}
        </span>
      </div>
    </div>
  );
}

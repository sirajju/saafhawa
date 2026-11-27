'use client';

import React from 'react';
import { type CleanLocation, type CurrentAirQuality } from '@/lib/air-quality/types';
import { getAqiCategoryDetails } from '@/lib/impact/category-details';
import {
  getAqiCategoryCssVar,
  getAqiCategorySoftCssVar,
  getScaleMarkerPercentage,
} from '@/lib/design-system';
import { ForecastChart, type ForecastPoint } from './ForecastChart';
import {
  buildForecastAdvice,
  type ForecastAdviceHousehold,
} from '@/lib/air-quality/forecast-advice';
import { formatMeasurementTime } from '@/lib/air-quality/time-utils';
import { formatHourInPlaceLocalTime } from '@/lib/air-quality/time-utils';

interface AirQualityCardProps {
  location: CleanLocation;
  current: CurrentAirQuality;
  hourlyForecast?: ForecastPoint[];
  householdProfile?: ForecastAdviceHousehold | null;
}

/**
 * Visual card displaying live AQI metric, pollutant concentrations, and personalized timing advice.
 */
export function AirQualityCard({
  location,
  current,
  hourlyForecast = [],
  householdProfile,
}: AirQualityCardProps) {
  const categoryInfo = getAqiCategoryDetails(current.category, current.aqi);
  const catColor = getAqiCategoryCssVar(current.aqi, current.category);
  const catSoftBg = getAqiCategorySoftCssVar(current.aqi, current.category);
  const markerPos = getScaleMarkerPercentage(current.aqi);

  const syncedForecast = React.useMemo(() => {
    if (!hourlyForecast || hourlyForecast.length === 0) return [];
    if (typeof current.aqi !== 'number') return hourlyForecast;
    return hourlyForecast.map((pt, idx) => (idx === 0 ? { ...pt, aqi: current.aqi } : pt));
  }, [hourlyForecast, current.aqi]);

  const advice = buildForecastAdvice(
    current.aqi,
    syncedForecast,
    householdProfile,
    location.timeZone
  );

  const worstPoint = React.useMemo(() => {
    if (syncedForecast.length === 0) return null;
    let maxPt = syncedForecast[0];
    for (const p of syncedForecast) {
      if ((p.aqi ?? 0) > (maxPt.aqi ?? 0)) {
        maxPt = p;
      }
    }
    return maxPt;
  }, [syncedForecast]);

  const worstTimeStr = worstPoint
    ? formatHourInPlaceLocalTime(worstPoint.dateTime, location.timeZone)
    : '';

  return (
    <section className="card" aria-labelledby="air-quality-heading" role="region">
      <h2 id="air-quality-heading" className="sr-only">
        Today&apos;s Air Quality &amp; Family Guidance for {location.name}
      </h2>
      <span className="sr-only">{location.name}</span>

      <div className="hero">
        <div>
          <div className="eyebrow" id="air-now">
            Air quality now ·{' '}
            {current.indexDisplayName || 'AQI (hourly estimate, CPCB breakpoints)'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginTop: '10px' }}>
            <div className="aqi-num num" style={{ color: catColor }}>
              {current.aqi !== null ? current.aqi : '—'}
            </div>
            <span
              className="pill"
              style={{
                marginBottom: '10px',
                background: catSoftBg,
                color: catColor,
              }}
              role="status"
              aria-label={`Air quality category: ${categoryInfo.categoryText}`}
            >
              {categoryInfo.categoryText}
            </span>
          </div>

          <div className="scale" aria-hidden="true">
            <div className="scale-bar">
              <span style={{ background: 'var(--aqi-good)' }} />
              <span style={{ background: 'var(--aqi-sat)' }} />
              <span style={{ background: 'var(--aqi-mod)' }} />
              <span style={{ background: 'var(--aqi-poor)' }} />
              <span style={{ background: 'var(--aqi-vpoor)' }} />
              <span style={{ background: 'var(--aqi-severe)' }} />
              <i className="scale-marker" style={{ left: `${markerPos}%` }} />
            </div>
            <div className="scale-labels">
              <span>0</span>
              <span>51</span>
              <span>101</span>
              <span>201</span>
              <span>301</span>
              <span>401+</span>
            </div>
          </div>
        </div>

        <div className="advice">
          <div className="eyebrow">For your family today</div>
          <p className="advice-text">{advice.plainAdvice}</p>
          {(advice.cleanestWindowStart && advice.cleanestWindowEnd) || worstPoint ? (
            <div className="chips">
              {advice.cleanestWindowStart && advice.cleanestWindowEnd && (
                <span className="chip">
                  Best window · {advice.cleanestWindowStart} to {advice.cleanestWindowEnd}
                </span>
              )}
              {worstPoint && (
                <span className="chip neutral">
                  Worst · {worstTimeStr} (AQI {worstPoint.aqi})
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <ForecastChart
        hourlyForecast={syncedForecast}
        currentAqi={current.aqi}
        timeZone={location.timeZone}
        cleanestWindowStart={advice.cleanestWindowStart}
        cleanestWindowEnd={advice.cleanestWindowEnd}
        cleanestWindowStartIndex={advice.cleanestWindowStartIndex}
        cleanestWindowLength={advice.cleanestWindowLength}
      />

      <div className="meta">
        <span>
          Source <b>{current.dataSource || 'Open-Meteo · CAMS model'}</b>
        </span>
        {current.dateTime && (
          <span>
            Measured <b>{formatMeasurementTime(current.dateTime, location.timeZone)}</b>
          </span>
        )}
        {typeof current.pm25?.value === 'number' && (
          <span>
            PM2.5 <b className="num">{current.pm25.value} µg/m³</b>
          </span>
        )}
        {typeof current.pm10?.value === 'number' && (
          <span>
            PM10 <b className="num">{current.pm10.value} µg/m³</b>
          </span>
        )}
      </div>

      <span className="sr-only">Current air quality category is {categoryInfo.categoryText}.</span>
      <span className="sr-only">Current Air Quality Index is {current.aqi}.</span>
      {typeof current.pm25?.value === 'number' && (
        <span className="sr-only">
          PM2.5 particulate level is {current.pm25.value} micrograms per cubic meter.
        </span>
      )}
      {typeof current.pm10?.value === 'number' && (
        <span className="sr-only">
          PM10 particulate level is {current.pm10.value} micrograms per cubic meter.
        </span>
      )}
    </section>
  );
}

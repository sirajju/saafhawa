'use client';

import React from 'react';
import { ForecastChart, ForecastPoint } from './ForecastChart';

export type { ForecastPoint };

interface ForecastTimelineProps {
  hourlyForecast: ForecastPoint[];
  timeZone?: string;
}

export function ForecastTimeline({
  hourlyForecast,
  timeZone = 'Asia/Kolkata',
}: ForecastTimelineProps) {
  return (
    <ForecastChart
      hourlyForecast={hourlyForecast}
      timeZone={timeZone}
    />
  );
}

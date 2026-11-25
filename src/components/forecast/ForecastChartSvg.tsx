'use client';

import React from 'react';
import { formatHourInPlaceLocalTime } from '@/lib/chat/tools';

export interface ChartPoint {
  dateTime: string;
  aqi: number | null;
}

interface ForecastChartSvgProps {
  points: ChartPoint[];
  timeZone: string;
  chartWidth: number;
  chartHeight: number;
  barSpacing: number;
  barWidth: number;
  maxAqi: number;
  cleanestIndex: number;
  getAqiBarColor: (aqi: number | null) => string;
}

export function ForecastChartSvg({
  points,
  timeZone,
  chartWidth,
  chartHeight,
  barSpacing,
  barWidth,
  maxAqi,
  cleanestIndex,
  getAqiBarColor,
}: ForecastChartSvgProps) {
  return (
    <div className="relative w-full max-w-full overflow-hidden pt-2">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`}
        className="h-36 w-full max-w-full touch-pan-y overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {/* Subtle grid lines */}
        {[0.25, 0.5, 0.75].map((factor) => (
          <line
            key={factor}
            x1="0"
            y1={chartHeight * factor}
            x2={chartWidth}
            y2={chartHeight * factor}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-slate-200 dark:text-slate-800"
          />
        ))}

        {/* Bars */}
        {points.map((point, index) => {
          const aqi = point.aqi ?? 0;
          const barHeight = Math.max(12, Math.min(chartHeight, (aqi / maxAqi) * chartHeight));
          const x = index * barSpacing + (barSpacing - barWidth) / 2;
          const y = chartHeight - barHeight;
          const isNow = index === 0;
          const isCleanest = index === cleanestIndex;
          const barFill = getAqiBarColor(point.aqi);

          return (
            <g key={index}>
              {isCleanest && (
                <rect
                  x={x - 4}
                  y={0}
                  width={barWidth + 8}
                  height={chartHeight}
                  fill="rgba(16, 185, 129, 0.12)"
                  rx="4"
                />
              )}

              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={barFill}
                className="transition-all hover:opacity-80"
              />

              {isNow && (
                <g>
                  <circle cx={x + barWidth / 2} cy={y - 6} r="4" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                  <text
                    x={x + barWidth / 2}
                    y={y - 13}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#0f172a"
                    className="fill-slate-900 dark:fill-slate-100"
                  >
                    Now
                  </text>
                </g>
              )}

              {(index % 4 === 0 || index === points.length - 1) && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill="#64748b"
                  className="fill-slate-500 dark:fill-slate-400"
                >
                  {formatHourInPlaceLocalTime(point.dateTime, timeZone)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

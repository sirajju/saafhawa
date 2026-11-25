'use client';

import React from 'react';
import { formatHourInPlaceLocalTime } from '@/lib/chat/tools';
import { getAqiCategoryCssVar } from '@/lib/design-system';

export interface ChartPoint {
  dateTime: string;
  aqi: number | null;
}

interface ForecastChartSvgProps {
  points: ChartPoint[];
  timeZone: string;
  chartWidth?: number;
  maxAqi?: number;
  cleanestIndex?: number;
  cleanestWindowLength?: number;
  srSummary: string;
}

export function ForecastChartSvg({
  points,
  timeZone,
  chartWidth = 720,
  maxAqi = 400,
  cleanestIndex = 0,
  cleanestWindowLength = 3,
  srSummary,
}: ForecastChartSvgProps) {
  const top = 10;
  const base = 140;
  const totalHeight = 182;
  const count = Math.max(1, points.length);
  const bw = chartWidth / count;
  const barWidth = Math.max(6, bw - 6);

  // Best window rect coordinates
  const bestX = cleanestIndex * bw;
  const bestW = Math.min(chartWidth - bestX, cleanestWindowLength * bw);
  const bestMidX = bestX + bestW / 2;

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${chartWidth} ${totalHeight}`}
        className="w-full touch-pan-y overflow-visible"
        preserveAspectRatio="none"
        role="img"
        aria-label={srSummary}
      >
        {/* Subtle gridlines at 100, 200, 300 */}
        {[100, 200, 300].map((v) => {
          const y = base - (v / maxAqi) * (base - top);
          return (
            <g key={v}>
              <line
                x1="0"
                x2={chartWidth}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeDasharray="2 4"
              />
              <text
                x={chartWidth}
                y={y - 4}
                textAnchor="end"
                fontSize="13"
                fill="var(--ink-3)"
                className="num"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Best window highlight rect */}
        <rect
          x={bestX}
          y={top}
          width={bestW}
          height={base - top}
          rx="6"
          fill="var(--brand-soft)"
        />

        {/* Bars */}
        {points.map((p, i) => {
          const val = typeof p.aqi === 'number' ? Math.max(0, p.aqi) : 0;
          const h = Math.max(8, (val / maxAqi) * (base - top));
          const x = i * bw + (bw - barWidth) / 2;
          const y = base - h;
          const isNow = i === 0;
          const barColor = getAqiCategoryCssVar(p.aqi);
          const hourLabel = formatHourInPlaceLocalTime(p.dateTime, timeZone);

          return (
            <g key={p.dateTime || i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={h}
                rx="3"
                fill={barColor}
                opacity={isNow ? 1 : 0.78}
              />
              {/* Show time label every 3 hours */}
              {i % 3 === 0 && (
                <text
                  x={i * bw + bw / 2}
                  y={base + 18}
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--ink-3)"
                >
                  {hourLabel}
                </text>
              )}
            </g>
          );
        })}

        {/* "Now" marker label below hour 0 */}
        <text
          x={bw / 2}
          y={base + 34}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="var(--ink)"
        >
          Now
        </text>

        {/* "Best" marker label above cleanest window */}
        <text
          x={bestMidX}
          y={top + 14}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="var(--brand)"
        >
          Best
        </text>
      </svg>
    </div>
  );
}

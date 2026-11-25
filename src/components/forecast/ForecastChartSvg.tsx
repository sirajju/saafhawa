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
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [realWidth, setRealWidth] = React.useState<number>(chartWidth);

  React.useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;
    const updateWidth = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth;
        if (clientW > 0) setRealWidth(clientW);
      }
    };
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setRealWidth(Math.round(entry.contentRect.width));
          }
        }
      });
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
  }, []);

  const width = realWidth > 0 ? realWidth : chartWidth;
  const isSmallScreen = width < 520;
  const labelStep = isSmallScreen ? 6 : 3;

  const top = 10;
  const base = 140;
  const totalHeight = 182;
  const count = Math.max(1, points.length);
  const bw = width / count;
  const barWidth = Math.max(4, bw - (isSmallScreen ? 3 : 5));

  // Best window rect coordinates
  const bestX = cleanestIndex * bw;
  const bestW = Math.min(width - bestX, cleanestWindowLength * bw);
  const bestMidX = bestX + bestW / 2;

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${totalHeight}`}
        style={{ width: '100%', height: totalHeight }}
        className="w-full touch-pan-y overflow-visible"
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
                x2={width}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeDasharray="2 4"
              />
              <text
                x={width}
                y={y - 4}
                textAnchor="end"
                fontSize="12"
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
              {/* Show time label every 6 hours on small screens, every 3 hours otherwise */}
              {i % labelStep === 0 && (
                <text
                  x={i * bw + bw / 2}
                  y={base + 18}
                  textAnchor="middle"
                  fontSize="12"
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
          fontSize="12"
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
          fontSize="12"
          fontWeight="600"
          fill="var(--brand)"
        >
          Best
        </text>
      </svg>
    </div>
  );
}

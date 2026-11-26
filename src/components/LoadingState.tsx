'use client';

import React, { useEffect, useState } from 'react';
import { BrandIcon } from './ui/Icons';

const LOADING_MESSAGES = [
  'Connecting to air quality sensors...',
  'Analyzing PM2.5, PM10, and diurnal temperature inversion...',
  'Evaluating 21 mitigation strategies for your family...',
  'Consulting Gemini AI for customized routine optimizations...',
  'Computing exact microgram exposure reductions and carbon savings...',
  'Finalizing your customized clean air plan...',
];

export function LoadingState() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div aria-hidden="true" className="wrap" style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Reassuring Loading Status Card */}
      <div className="card" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)', padding: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                background: 'var(--brand)',
                color: 'var(--brand-ink)',
              }}
            >
              <BrandIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Crafting Your Winter Smog Action Plan
              </h2>
              <p className="caption" style={{ color: 'var(--ink-2)', margin: '4px 0 0' }}>
                {LOADING_MESSAGES[stepIndex]}
              </p>
            </div>
          </div>
        </div>

        {/* Pulse Bar */}
        <div style={{ marginTop: 16, height: 6, width: '100%', borderRadius: 999, background: 'var(--surface-2)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: 'var(--brand)',
              borderRadius: 999,
              transition: 'width 0.5s ease-out',
              width: `${Math.min(100, Math.round(((stepIndex + 1) / LOADING_MESSAGES.length) * 100))}%`,
            }}
          />
        </div>
      </div>

      {/* SKELETON: Matches Real Layout */}
      <div className="stack" style={{ opacity: 0.6 }}>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <div style={{ height: 28, width: 240, borderRadius: 6, background: 'var(--surface-2)' }} />
          <div style={{ height: 18, width: 360, borderRadius: 6, background: 'var(--surface-2)' }} />
        </div>

        {/* Top AQI Card Skeleton */}
        <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ height: 72, width: 140, borderRadius: 8, background: 'var(--surface-2)' }} />
            <div style={{ height: 32, width: 120, borderRadius: 999, background: 'var(--surface-2)' }} />
          </div>
          <div style={{ height: 24, width: '80%', borderRadius: 6, background: 'var(--surface-2)' }} />
          <div style={{ height: 140, width: '100%', borderRadius: 8, background: 'var(--surface-2)' }} />
        </div>

        {/* Impact Skeleton */}
        <div className="card" style={{ padding: 24, height: 120, background: 'var(--surface-2)' }} />
      </div>
    </div>
  );
}

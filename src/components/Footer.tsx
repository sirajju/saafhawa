import React from 'react';
import { ShieldIcon } from './ui/Icons';

interface FooterProps {
  dataSource?: string;
}

export function Footer({ dataSource }: FooterProps = {}) {
  const activeSource = dataSource || 'Open-Meteo (CAMS model)';

  return (
    <footer
      style={{
        marginTop: 64,
        borderTop: '1px solid var(--line)',
        padding: '32px 16px 48px',
        color: 'var(--ink-3)',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink)' }}>
            <strong>SaafHawa</strong>
            <span style={{ color: 'var(--ink-3)' }}>· साफ़ हवा</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldIcon className="h-4 w-4" style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <span>Health decisions remain yours. Always seek professional medical care for respiratory distress.</span>
          </div>
        </div>

        <p style={{ margin: 0, color: 'var(--ink-3)' }}>
          Real-time air quality data via <strong style={{ color: 'var(--ink)' }}>{activeSource}</strong>, benchmarked against Central Pollution Control Board (CPCB) standards. Inhalation dose models adapted from US EPA Exposure Factors Handbook. Health guidance aligned with WHO 2021 Global Air Quality Guidelines.
        </p>
      </div>
    </footer>
  );
}

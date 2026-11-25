import React from 'react';
import { AdvisoryResponse } from '@/lib/community/types';
import { RefreshIcon, AlertTriangleIcon } from './ui/Icons';

interface AdvisoryModalBodyProps {
  isLoading: boolean;
  errorMessage: string | null;
  advisory: AdvisoryResponse | null;
  language: 'en' | 'hi';
}

export function AdvisoryModalBody({
  isLoading,
  errorMessage,
  advisory,
  language,
}: AdvisoryModalBodyProps) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0', textAlign: 'center' }}>
          <RefreshIcon className="h-8 w-8 animate-spin" style={{ color: 'var(--brand)' }} />
          <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
            Generating customized {language === 'hi' ? 'Hindi' : 'English'} advisory...
          </p>
        </div>
      )}

      {errorMessage && !isLoading && (
        <div
          role="alert"
          style={{
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--aqi-severe)',
            background: 'var(--aqi-severe-soft)',
            padding: 16,
            fontSize: 15,
            color: 'var(--ink)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangleIcon className="h-4 w-4" style={{ color: 'var(--aqi-severe)' }} />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {advisory && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {advisory.isSampleData && (
            <div
              role="status"
              aria-label="Sample data advisory notice"
              style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--aqi-poor)',
                background: 'var(--aqi-poor-soft)',
                padding: 12,
                fontSize: 13,
                color: 'var(--ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangleIcon className="h-4 w-4" style={{ color: 'var(--aqi-poor)' }} />
                <span><strong>Sample Data Active:</strong> This advisory was generated using reference baseline data.</span>
              </div>
            </div>
          )}

          {/* WhatsApp Preview Share Card */}
          <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', background: 'var(--surface-2)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--line)', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>
              <span>WHATSAPP MESSAGE PREVIEW</span>
              <span className="pill" style={{ color: 'var(--brand)', background: 'var(--brand-soft)' }}>
                Ready to Broadcast
              </span>
            </div>

            {/* Simulated WhatsApp Chat Bubble */}
            <div
              style={{
                marginTop: 16,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
                padding: 16,
                color: 'var(--ink)',
              }}
            >
              <div
                lang={language === 'hi' ? 'hi' : 'en'}
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                {advisory.advisoryText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

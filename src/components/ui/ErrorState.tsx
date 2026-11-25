import React from 'react';
import { AlertTriangleIcon, RefreshIcon, EditIcon } from './Icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  onChangeLocation?: () => void;
}

export function ErrorState({
  message,
  onRetry,
  onChangeLocation,
}: ErrorStateProps) {
  return (
    <div className="wrap" style={{ maxWidth: 680, padding: '32px 16px' }}>
      <div
        role="alert"
        className="card"
        style={{
          border: '1px solid var(--aqi-severe)',
          background: 'var(--surface)',
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--aqi-severe-soft)',
              color: 'var(--aqi-severe)',
              flexShrink: 0,
            }}
          >
            <AlertTriangleIcon className="h-5 w-5" />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Unable to Load Air Quality or Plan
            </h2>
            <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5, color: 'var(--ink-2)' }}>
              {message || 'We could not reach the air quality sensors or generate your family’s plan right now.'}
            </p>
            <p className="caption" style={{ marginTop: 6, color: 'var(--ink-3)' }}>
              Your profile is safely stored. Please check your internet connection or try again.
            </p>

            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="btn btn-primary"
                >
                  <RefreshIcon className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              )}
              {onChangeLocation && (
                <button
                  type="button"
                  onClick={onChangeLocation}
                  className="btn"
                >
                  <EditIcon className="h-4 w-4" />
                  <span>Change Location</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { AdvisorySelectorBar } from './AdvisorySelectorBar';
import { ShareIcon, CloseIcon } from './ui/Icons';

interface AdvisoryModalHeaderProps {
  onClose: () => void;
  place: string;
  displayPlace?: string;
  audience: 'housing_society' | 'school_group';
  language: 'en' | 'hi';
  onAudienceChange: (a: 'housing_society' | 'school_group') => void;
  onLanguageChange: (l: 'en' | 'hi') => void;
}

export function AdvisoryModalHeader({
  onClose,
  place,
  displayPlace,
  audience,
  language,
  onAudienceChange,
  onLanguageChange,
}: AdvisoryModalHeaderProps) {
  return (
    <div style={{ padding: 24, borderBottom: '1px solid var(--line)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-soft)',
              color: 'var(--brand)',
            }}
          >
            <ShareIcon className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="advisory-modal-title"
              style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: 0 }}
            >
              Share Smog Advisory
            </h2>
            <p className="caption" style={{ margin: '4px 0 0' }}>
              Ready-to-copy WhatsApp advisory based on today&apos;s air quality in{' '}
              {displayPlace || place}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="btn btn-ghost"
          style={{ width: 36, height: 36, padding: 0 }}
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <AdvisorySelectorBar
        audience={audience}
        language={language}
        onAudienceChange={onAudienceChange}
        onLanguageChange={onLanguageChange}
      />
    </div>
  );
}

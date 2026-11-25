import React from 'react';
import { ShareIcon, CopyIcon, CheckIcon } from './ui/Icons';

interface AdvisoryModalFooterProps {
  copied: boolean;
  isLoading: boolean;
  hasAdvisory: boolean;
  whatsappUrl: string;
  onCopy: () => void;
}

export function AdvisoryModalFooter({
  copied,
  isLoading,
  hasAdvisory,
  whatsappUrl,
  onCopy,
}: AdvisoryModalFooterProps) {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {copied ? (
          <>
            <CheckIcon className="h-4 w-4" style={{ color: 'var(--brand)' }} />
            <span style={{ fontWeight: 600, color: 'var(--brand)' }}>Copied to clipboard!</span>
          </>
        ) : (
          'Preview message above, then copy or share directly'
        )}
      </span>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          disabled={isLoading || !hasAdvisory}
          onClick={onCopy}
          className="btn"
        >
          {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
          <span>{copied ? 'Copied!' : 'Copy WhatsApp Message'}</span>
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={isLoading || !hasAdvisory}
          className="btn btn-primary"
        >
          <ShareIcon className="h-4 w-4" />
          <span>Share on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { AdvisoryResponse } from '@/lib/community/types';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { AdvisorySelectorBar } from './AdvisorySelectorBar';
import { AdvisoryModalBody } from './AdvisoryModalBody';
import { AdvisoryModalFooter } from './AdvisoryModalFooter';
import { ShareIcon, CloseIcon } from './ui/Icons';

interface CommunityAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: string;
  displayPlace?: string;
}

export function CommunityAdvisoryModal({
  isOpen,
  onClose,
  place,
  displayPlace,
}: CommunityAdvisoryModalProps) {
  const [audience, setAudience] = useState<'housing_society' | 'school_group'>('housing_society');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    fetch('/api/community-advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, audience, language }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.message || `Failed to generate advisory (HTTP ${response.status})`);
        }
        return response.json();
      })
      .then((data: AdvisoryResponse) => {
        if (!ignore) {
          setAdvisory(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          setErrorMessage(err instanceof Error ? err.message : 'Unable to generate advisory.');
          setIsLoading(false);
        }
      });

    return () => { ignore = true; };
  }, [isOpen, place, audience, language]);

  const handleCopyText = async () => {
    if (!advisory?.advisoryText) return;
    try {
      await navigator.clipboard.writeText(advisory.advisoryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* Clipboard access denied */ }
  };

  if (!isOpen) return null;

  const whatsappUrl = advisory?.advisoryText
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(advisory.advisoryText)}`
    : '#';

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="advisory-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          width: '100%',
          maxWidth: 680,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: 24, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
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
                <h2 id="advisory-modal-title" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  Share Smog Advisory
                </h2>
                <p className="caption" style={{ margin: '4px 0 0' }}>
                  Ready-to-copy WhatsApp advisory based on today&apos;s air quality in {displayPlace || place}.
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
            onAudienceChange={(a) => {
              setAudience(a);
              setIsLoading(true);
              setErrorMessage(null);
              setCopied(false);
            }}
            onLanguageChange={(l) => {
              setLanguage(l);
              setIsLoading(true);
              setErrorMessage(null);
              setCopied(false);
            }}
          />
        </div>

        <AdvisoryModalBody
          isLoading={isLoading}
          errorMessage={errorMessage}
          advisory={advisory}
          language={language}
        />

        <AdvisoryModalFooter
          copied={copied}
          isLoading={isLoading}
          hasAdvisory={Boolean(advisory)}
          whatsappUrl={whatsappUrl}
          onCopy={handleCopyText}
        />
      </div>
    </div>
  );
}

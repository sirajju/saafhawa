'use client';

import { useState, useEffect } from 'react';
import {
  type AdvisoryResponse,
  type AdvisoryAudience,
  type AdvisoryLanguage,
} from '@/lib/community/types';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { AdvisoryModalHeader } from './AdvisoryModalHeader';
import { AdvisoryModalBody } from './AdvisoryModalBody';
import { AdvisoryModalFooter } from './AdvisoryModalFooter';

interface CommunityAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: string;
  displayPlace?: string;
}

/**
 * Accessible modal dialog generating and previewing WhatsApp/community air quality advisories.
 */
export function CommunityAdvisoryModal({
  isOpen,
  onClose,
  place,
  displayPlace,
}: CommunityAdvisoryModalProps) {
  const [audience, setAudience] = useState<AdvisoryAudience>('housing_society');
  const [language, setLanguage] = useState<AdvisoryLanguage>('en');
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
          throw new Error(
            errData?.message || `Failed to generate advisory (HTTP ${response.status})`
          );
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

    return () => {
      ignore = true;
    };
  }, [isOpen, place, audience, language]);

  const handleCopyText = async () => {
    if (!advisory?.advisoryText) return;
    try {
      await navigator.clipboard.writeText(advisory.advisoryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* Clipboard access denied */
    }
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
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
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
        <AdvisoryModalHeader
          onClose={onClose}
          place={place}
          displayPlace={displayPlace}
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

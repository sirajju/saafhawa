'use client';

import React, { useState, useEffect } from 'react';
import { AdvisoryResponse } from '@/lib/community/types';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { AdvisorySelectorBar } from './AdvisorySelectorBar';
import { AdvisoryModalBody } from './AdvisoryModalBody';

interface CommunityAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  place: string;
}

export function CommunityAdvisoryModal({
  isOpen,
  onClose,
  place,
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
          setErrorMessage(
            err instanceof Error ? err.message : 'Unable to generate advisory. Please try again.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, place, audience, language]);

  const handleAudienceChange = (newAudience: 'housing_society' | 'school_group') => {
    setAudience(newAudience);
    setIsLoading(true);
    setErrorMessage(null);
    setCopied(false);
  };

  const handleLanguageChange = (newLang: 'en' | 'hi') => {
    setLanguage(newLang);
    setIsLoading(true);
    setErrorMessage(null);
    setCopied(false);
  };

  const handleCopyText = async () => {
    if (!advisory?.advisoryText) return;
    try {
      await navigator.clipboard.writeText(advisory.advisoryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard access denied
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50/80 p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-2xl dark:bg-emerald-950 dark:text-emerald-300">
                📢
              </span>
              <div>
                <h2
                  id="advisory-modal-title"
                  className="text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-50"
                >
                  Share Smog Advisory with Your Community
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ready-to-copy WhatsApp advisory based on today&apos;s air quality in {place}.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <span aria-hidden="true" className="text-lg">
                ✕
              </span>
            </button>
          </div>

          <AdvisorySelectorBar
            audience={audience}
            language={language}
            onAudienceChange={handleAudienceChange}
            onLanguageChange={handleLanguageChange}
          />
        </div>

        <AdvisoryModalBody
          isLoading={isLoading}
          errorMessage={errorMessage}
          advisory={advisory}
          language={language}
        />

        <div className="border-t border-slate-200 bg-slate-50/80 p-4 sm:flex sm:items-center sm:justify-between sm:px-6 dark:border-slate-800 dark:bg-slate-950/70">
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {copied ? '✅ Copied to clipboard!' : 'One-click copy or share directly to WhatsApp'}
          </span>

          <div className="mt-3 flex gap-2 sm:mt-0">
            <button
              type="button"
              disabled={isLoading || !advisory}
              onClick={handleCopyText}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 ${
                copied
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span>{copied ? '✓ Copied!' : '📋 Copy Text'}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={isLoading || !advisory}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
            >
              <span>Share on WhatsApp ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

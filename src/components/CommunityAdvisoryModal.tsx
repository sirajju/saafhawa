'use client';

import React, { useState, useEffect } from 'react';
import { AdvisoryResponse } from '@/lib/community/types';

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

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;

    fetch('/api/community-advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place,
        audience,
        language,
      }),
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      // Fallback
    }
  };

  if (!isOpen) return null;

  const whatsappUrl = advisory?.advisoryText
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(advisory.advisoryText)}`
    : '#';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="advisory-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready-to-copy WhatsApp advisory based on today&apos;s live air quality in {place}.
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

          {/* Selectors */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Audience Segment Tabs */}
            <div
              role="radiogroup"
              aria-label="Target community audience"
              className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <button
                type="button"
                role="radio"
                aria-checked={audience === 'housing_society'}
                onClick={() => handleAudienceChange('housing_society')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  audience === 'housing_society'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <span>🏘️</span>
                <span>Housing Society (RWA)</span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={audience === 'school_group'}
                onClick={() => handleAudienceChange('school_group')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${
                  audience === 'school_group'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <span>🏫</span>
                <span>School / Parents</span>
              </button>
            </div>

            {/* Language Tabs */}
            <div
              role="radiogroup"
              aria-label="Select language"
              className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <button
                type="button"
                role="radio"
                aria-checked={language === 'en'}
                onClick={() => handleLanguageChange('en')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  language === 'en'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                English
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={language === 'hi'}
                onClick={() => handleLanguageChange('hi')}
                className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                  language === 'hi'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                हिंदी (Hindi)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body / Advisory Preview */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl animate-spin" aria-hidden="true">
                ⚙️
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Generating customized {language === 'hi' ? 'Hindi' : 'English'} advisory...
              </p>
            </div>
          )}

          {errorMessage && !isLoading && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"
            >
              <div className="flex items-center gap-2">
                <span aria-hidden="true">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {advisory && !isLoading && (
            <div className="space-y-4">
              {/* WhatsApp Message Preview Box */}
              <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 font-mono text-xs text-slate-800 shadow-inner sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-slate-200">
                <div className="absolute top-2.5 right-3 flex items-center gap-1 text-[11px] font-sans font-bold text-emerald-800 dark:text-emerald-400">
                  <span aria-hidden="true">📱</span>
                  <span>WhatsApp Ready</span>
                </div>

                <div className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed pr-16">
                  {advisory.advisoryText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="border-t border-slate-200 bg-slate-50/80 p-4 sm:flex sm:items-center sm:justify-between sm:px-6 dark:border-slate-800 dark:bg-slate-950/70">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {copied ? '✅ Copied to clipboard!' : 'One-click copy or share directly to WhatsApp'}
          </span>

          <div className="mt-3 flex gap-2 sm:mt-0">
            <button
              type="button"
              disabled={isLoading || !advisory}
              onClick={handleCopyText}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 ${
                copied
                  ? 'border-emerald-600 bg-emerald-600 text-white'
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 dark:hover:bg-emerald-500"
            >
              <span>Share on WhatsApp ↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';

interface AdvisorySelectorBarProps {
  audience: 'housing_society' | 'school_group';
  language: 'en' | 'hi';
  onAudienceChange: (audience: 'housing_society' | 'school_group') => void;
  onLanguageChange: (language: 'en' | 'hi') => void;
}

export function AdvisorySelectorBar({
  audience,
  language,
  onAudienceChange,
  onLanguageChange,
}: AdvisorySelectorBarProps) {
  return (
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
          onClick={() => onAudienceChange('housing_society')}
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
          onClick={() => onAudienceChange('school_group')}
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
          onClick={() => onLanguageChange('en')}
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
          onClick={() => onLanguageChange('hi')}
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
  );
}

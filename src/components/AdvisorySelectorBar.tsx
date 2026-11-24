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
      {/* Audience Segment Radios */}
      <fieldset className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <legend className="sr-only">Target community audience</legend>
        <label
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-500 ${
            audience === 'housing_society'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <input
            type="radio"
            name="audience"
            value="housing_society"
            checked={audience === 'housing_society'}
            onChange={() => onAudienceChange('housing_society')}
            className="sr-only"
          />
          <span aria-hidden="true">🏘️</span>
          <span>Housing Society (RWA)</span>
        </label>

        <label
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-500 ${
            audience === 'school_group'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <input
            type="radio"
            name="audience"
            value="school_group"
            checked={audience === 'school_group'}
            onChange={() => onAudienceChange('school_group')}
            className="sr-only"
          />
          <span aria-hidden="true">🏫</span>
          <span>School / Parents</span>
        </label>
      </fieldset>

      {/* Language Radios */}
      <fieldset className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-950">
        <legend className="sr-only">Select language</legend>
        <label
          className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-500 ${
            language === 'en'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <input
            type="radio"
            name="language"
            value="en"
            checked={language === 'en'}
            onChange={() => onLanguageChange('en')}
            className="sr-only"
          />
          <span>English</span>
        </label>

        <label
          lang="hi"
          className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-emerald-500 ${
            language === 'hi'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
          }`}
        >
          <input
            type="radio"
            name="language"
            value="hi"
            checked={language === 'hi'}
            onChange={() => onLanguageChange('hi')}
            className="sr-only"
          />
          <span>हिंदी (Hindi)</span>
        </label>
      </fieldset>
    </div>
  );
}

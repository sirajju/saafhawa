import React from 'react';
import { HomeIcon, ShieldIcon } from './ui/Icons';

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
      <fieldset className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <legend className="sr-only">Target community audience</legend>
        <label
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-teal-600 ${
            audience === 'housing_society'
              ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-700'
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
          <HomeIcon className="h-3.5 w-3.5" />
          <span>Housing Society (RWA)</span>
        </label>

        <label
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-teal-600 ${
            audience === 'school_group'
              ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-700'
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
          <ShieldIcon className="h-3.5 w-3.5" />
          <span>School / Parents</span>
        </label>
      </fieldset>

      {/* Language Radios */}
      <fieldset className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <legend className="sr-only">Select language</legend>
        <label
          className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-teal-600 ${
            language === 'en'
              ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-700'
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
          className={`rounded-lg px-3 py-1.5 font-semibold cursor-pointer transition focus-within:ring-2 focus-within:ring-teal-600 ${
            language === 'hi'
              ? 'bg-teal-800 text-white shadow-xs dark:bg-teal-700'
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

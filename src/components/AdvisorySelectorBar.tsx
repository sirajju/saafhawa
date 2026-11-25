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
    <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      {/* Audience Segment */}
      <fieldset className="seg" style={{ margin: 0 }}>
        <legend className="sr-only">Target community audience</legend>
        <label className={audience === 'housing_society' ? 'active' : ''}>
          <input
            type="radio"
            name="audience"
            value="housing_society"
            checked={audience === 'housing_society'}
            onChange={() => onAudienceChange('housing_society')}
            className="sr-only"
          />
          <HomeIcon className="icon" style={{ width: 15, height: 15 }} />
          <span>Housing Society</span>
        </label>

        <label className={audience === 'school_group' ? 'active' : ''}>
          <input
            type="radio"
            name="audience"
            value="school_group"
            checked={audience === 'school_group'}
            onChange={() => onAudienceChange('school_group')}
            className="sr-only"
          />
          <ShieldIcon className="icon" style={{ width: 15, height: 15 }} />
          <span>School / Parents</span>
        </label>
      </fieldset>

      {/* Language Segment */}
      <fieldset className="seg" style={{ margin: 0 }}>
        <legend className="sr-only">Select language</legend>
        <label className={language === 'en' ? 'active' : ''}>
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

        <label lang="hi" className={language === 'hi' ? 'active' : ''}>
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

'use client';

import React from 'react';

export interface ChoiceOption<T> {
  value: T;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
}

interface ChoiceChipGroupProps<T> {
  label: string;
  description?: string;
  options: ChoiceOption<T>[];
  value: T;
  onChange: (val: T) => void;
  id?: string;
  columns?: 'auto' | '2' | '3' | '4';
}

export function ChoiceChipGroup<T extends string | number | boolean>({
  label,
  description,
  options,
  value,
  onChange,
  id,
  columns = 'auto',
}: ChoiceChipGroupProps<T>) {
  const gridClasses = {
    auto: 'flex flex-wrap gap-2.5',
    '2': 'grid grid-cols-2 gap-2.5',
    '3': 'grid grid-cols-2 sm:grid-cols-3 gap-2.5',
    '4': 'grid grid-cols-2 sm:grid-cols-4 gap-2',
  }[columns];

  return (
    <fieldset className="space-y-2 border-none p-0" id={id}>
      <legend className="block text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        {label}
      </legend>
      {description && (
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
      )}

      <div
        role="radiogroup"
        aria-label={label}
        className={gridClasses}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.value)}
              className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm sm:text-base transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                isSelected
                  ? 'border-2 border-teal-700 bg-teal-50 font-bold text-teal-950 shadow-xs ring-2 ring-teal-500/20 dark:border-teal-500 dark:bg-teal-950/70 dark:text-teal-100'
                  : 'border border-slate-300 bg-white font-medium text-slate-700 shadow-2xs hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {opt.icon && <span aria-hidden="true" className="shrink-0">{opt.icon}</span>}
              <span>{opt.label}</span>
              {opt.subLabel && (
                <span className="text-xs opacity-75 font-normal">({opt.subLabel})</span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

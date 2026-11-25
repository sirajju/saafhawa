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
}: ChoiceChipGroupProps<T>) {
  return (
    <fieldset className="q" id={id} style={{ border: 'none', padding: 0, margin: 0 }}>
      <legend style={{ padding: 0, margin: 0 }}>
        <h3>{label}</h3>
      </legend>
      {description && <p className="caption">{description}</p>}

      <div role="radiogroup" aria-label={label} className="opts">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(opt.value)}
              className={`opt inline-flex items-center gap-1.5 ${isSelected ? 'active' : ''}`}
            >
              {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
              <span>{opt.label}</span>
              {opt.subLabel && <span className="caption">({opt.subLabel})</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

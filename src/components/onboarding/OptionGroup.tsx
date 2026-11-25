'use client';

import React, { useRef } from 'react';

export interface OptionItem<T> {
  value: T;
  label: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  cost?: string;
}

interface OptionGroupProps<T> {
  label: string;
  value: T | null;
  onChange: (val: T) => void;
  options: OptionItem<T>[];
  className?: string;
  isCard?: boolean;
}

export function OptionGroup<T extends string | number | boolean>({
  label,
  value,
  onChange,
  options,
  className = 'opts',
  isCard = false,
}: OptionGroupProps<T>) {
  const groupRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let targetIndex = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetIndex = (currentIndex + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      targetIndex = (currentIndex - 1 + options.length) % options.length;
    }

    if (targetIndex >= 0) {
      const nextOpt = options[targetIndex];
      onChange(nextOpt.value);
      const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('button[role="radio"]');
      buttons?.[targetIndex]?.focus();
    }
  };

  return (
    <div
      ref={groupRef}
      className={className}
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt, idx) => {
        const isSelected = value !== null && value === opt.value;
        const tabIndex = isSelected ? 0 : value === null && idx === 0 ? 0 : -1;

        if (isCard) {
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={tabIndex}
              className={`opt opt-card ${isSelected ? 'active' : ''}`}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {opt.icon}
              <span>
                {opt.label}
                {opt.hint && <small>{opt.hint}</small>}
              </span>
            </button>
          );
        }

        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={tabIndex}
            className={`opt ${isSelected ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
          >
            {opt.label}
            {opt.cost && <span className="cost">{opt.cost}</span>}
          </button>
        );
      })}
    </div>
  );
}

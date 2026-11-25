'use client';

import React from 'react';
import { SparklesIcon } from './ui/Icons';

interface ChatSuggestionsProps {
  prompts: string[];
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

export function ChatSuggestions({
  prompts,
  disabled = false,
  onSelect,
}: ChatSuggestionsProps) {
  return (
    <div className="p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        <SparklesIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
        <span>Suggested questions:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <button
            key={index}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-teal-300 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-teal-950/40 text-left"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

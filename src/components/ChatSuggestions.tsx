import React from 'react';

interface ChatSuggestionsProps {
  prompts: string[];
  disabled: boolean;
  onSelect: (prompt: string) => void;
}

export function ChatSuggestions({ prompts, disabled, onSelect }: ChatSuggestionsProps) {
  return (
    <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap dark:text-slate-400">
          Suggestions:
        </span>
        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-emerald-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

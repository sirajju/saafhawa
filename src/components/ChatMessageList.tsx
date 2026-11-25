'use client';

import React, { RefObject } from 'react';
import { SparklesIcon, RefreshIcon } from './ui/Icons';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsSummary?: string[];
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  isSampleData?: boolean;
  suggestedPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
}

export function ChatMessageList({
  messages,
  isLoading,
  messagesEndRef,
  isSampleData = false,
  suggestedPrompts = [],
  onSelectPrompt,
}: ChatMessageListProps) {
  const isInitialState = messages.length <= 1;

  return (
    <div
      className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 min-h-[280px]"
      role="log"
      aria-live="polite"
      aria-label="Conversation with clean air assistant"
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
        >
          <div
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-2xs sm:max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-teal-800 text-white dark:bg-teal-700'
                : 'border border-slate-200/90 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>

            {msg.toolsSummary && msg.toolsSummary.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-slate-200/60 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {msg.toolsSummary.map((summary, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <SparklesIcon className="h-3 w-3 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{summary}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="mt-1 text-[10px] text-slate-400">
            {msg.role === 'user' ? 'You' : 'SaafHawa Assistant'}
          </span>
        </div>
      ))}

      {/* Suggested Questions shown as chips inside empty/initial chat */}
      {isInitialState && suggestedPrompts.length > 0 && onSelectPrompt && (
        <div className="mt-4 pt-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
            <SparklesIcon className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
            <span>Common questions to ask:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                disabled={isLoading}
                onClick={() => onSelectPrompt(prompt)}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-teal-400 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-teal-950/40 text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-start gap-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <RefreshIcon className="h-4 w-4 animate-spin text-teal-700 dark:text-teal-400" />
              <span>
                {isSampleData
                  ? 'Checking forecast & calculating guidance...'
                  : 'Checking live forecast & calculating guidance...'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

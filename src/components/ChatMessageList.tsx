import React, { RefObject } from 'react';

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
}

export function ChatMessageList({
  messages,
  isLoading,
  messagesEndRef,
  isSampleData = false,
}: ChatMessageListProps) {
  return (
    <div
      className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 max-h-[420px] min-h-[260px]"
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
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white dark:bg-emerald-700'
                : 'border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
            }`}
          >
            <div className="whitespace-pre-wrap">{msg.content}</div>

            {msg.toolsSummary && msg.toolsSummary.length > 0 && (
              <div className="mt-2.5 space-y-1 border-t border-slate-200/60 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {msg.toolsSummary.map((summary, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span aria-hidden="true">⚡</span>
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

      {isLoading && (
        <div className="flex items-start gap-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="animate-spin text-base" aria-hidden="true">
                ⚙️
              </span>
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

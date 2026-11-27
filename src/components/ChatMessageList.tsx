'use client';

import React from 'react';
import { RefreshIcon } from './ui/Icons';
import { SafeMarkdown } from './chat/SafeMarkdown';
import { FallbackReason } from '@/lib/constants';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsSummary?: string[];
  fallbackReason?: FallbackReason;
  dailyQuotaResetTime?: string;
  isGreeting?: boolean;
  isError?: boolean;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  suggestedPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
  onRetryMessage?: (msgIndex: number) => void;
}

export function ChatMessageList({
  messages,
  isLoading,
  messagesEndRef,
  suggestedPrompts = [],
  onSelectPrompt,
  onRetryMessage,
}: ChatMessageListProps) {
  const isInitialState = messages.length <= 1;

  return (
    <div
      className="chat-body"
      role="log"
      aria-live="polite"
      aria-label="Conversation with clean air assistant"
    >
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`bubble ${msg.role === 'user' ? 'user-bubble' : ''}`}
        >
          {msg.role === 'assistant' ? (
            <SafeMarkdown content={msg.content} />
          ) : (
            <div className="whitespace-pre-wrap">{msg.content}</div>
          )}
          {msg.fallbackReason === 'gemini_busy' && (
            <div className="mt-2.5 pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2 flex-wrap text-xs text-[var(--ink-2)]">
              <span>Gemini is busy right now, so this answer was built by our rules. Try again in a minute.</span>
              {onRetryMessage && (
                <button
                  type="button"
                  onClick={() => onRetryMessage(index)}
                  className="btn btn-sm"
                  style={{ padding: '2px 8px', fontSize: '12px', height: '24px' }}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {msg.fallbackReason === 'daily_quota_exhausted' && (
            <div className="mt-2.5 pt-2 border-t border-[var(--line)] flex items-center justify-between gap-2 flex-wrap text-xs text-[var(--ink-2)]">
              <span>Today&apos;s free Gemini limit is used up, so answers are built by our rules until {msg.dailyQuotaResetTime || 'tomorrow'}.</span>
            </div>
          )}
          {msg.toolsSummary && msg.toolsSummary.length > 0 && (
            <div className="mt-2 space-y-0.5 border-t border-[var(--line)] pt-1.5 caption">
              {msg.toolsSummary.map((summary, idx) => (
                <div key={idx}>✓ {summary}</div>
              ))}
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="bubble flex items-center gap-2">
          <RefreshIcon className="icon animate-spin text-[var(--brand)]" />
          <span>Thinking &amp; checking forecast...</span>
        </div>
      )}

      {/* Suggestion questions shown inside empty/initial chat */}
      {isInitialState && suggestedPrompts.length > 0 && onSelectPrompt && (
        <div className="grid gap-2 pt-1">
          {suggestedPrompts.map((prompt, index) => (
            <button
              key={index}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectPrompt(prompt)}
              className="suggest"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

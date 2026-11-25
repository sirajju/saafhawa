'use client';

import React from 'react';
import { RefreshIcon } from './ui/Icons';
import { SafeMarkdown } from './chat/SafeMarkdown';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsSummary?: string[];
  fallbackReason?: 'gemini_busy' | 'no_key' | 'model_error';
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isSampleData?: boolean;
  suggestedPrompts?: string[];
  onSelectPrompt?: (prompt: string) => void;
  onRetryMessage?: (msgIndex: number) => void;
}

export function ChatMessageList({
  messages,
  isLoading,
  messagesEndRef,
  isSampleData = false,
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
              <span>Gemini was busy, so this answer was built by our rules. Try again in a minute.</span>
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
          <span>
            {isSampleData ? 'Checking forecast & calculating guidance...' : 'Thinking & checking forecast...'}
          </span>
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

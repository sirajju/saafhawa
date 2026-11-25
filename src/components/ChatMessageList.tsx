'use client';

import React from 'react';
import { RefreshIcon } from './ui/Icons';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolsSummary?: string[];
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
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
          <div className="whitespace-pre-wrap">{msg.content}</div>
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

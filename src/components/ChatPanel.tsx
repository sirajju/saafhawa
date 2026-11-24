'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlanRequest } from '@/lib/plan/types';
import { ChatMessage, ChatMessageList } from './ChatMessageList';
import { ChatSuggestions } from './ChatSuggestions';
import { ChatHeader } from './ChatHeader';

interface ChatPanelProps {
  place: string;
  householdProfile?: PlanRequest | null;
}

const SAMPLE_PROMPTS = [
  'Can my daughter play outside at 5pm?',
  'Is it safe to go for a morning walk today?',
  'Should I buy an air purifier or make a DIY box fan filter?',
  'How much emissions do I save if I take the metro instead of my car?',
];

export function ChatPanel({ place, householdProfile }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I am your clean air advisor for **${place}**. Ask me any questions about timing your daily activities, protecting family members, or evaluating low-emission choices today.`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    if (text.length > 500) {
      setErrorMessage('Please shorten your question to under 500 characters.');
      return;
    }

    setErrorMessage(null);
    setInputText('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          place,
          householdProfile: householdProfile || undefined,
          conversationHistory: newMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || `Chat request failed (HTTP ${response.status})`);
      }

      const data = await response.json();
      const toolSummaries = (data.toolsExecuted || []).map((t: { resultSummary?: string }) => t.resultSummary);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          toolsSummary: toolSummaries.length > 0 ? toolSummaries : undefined,
        },
      ]);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to send message. Please try again.'
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section
      aria-labelledby="chat-heading"
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <ChatHeader />

      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />

      <ChatSuggestions
        prompts={SAMPLE_PROMPTS}
        disabled={isLoading}
        onSelect={handleSendMessage}
      />

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        {errorMessage && (
          <div
            role="alert"
            className="mb-2 text-xs font-semibold text-rose-600 dark:text-rose-400"
          >
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <label htmlFor="chat-input" className="sr-only">
              Ask a question about air quality or smog precautions
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              rows={2}
              maxLength={500}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Can my daughter play outside at 5pm? (Shift+Enter for newline)"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <div className="absolute bottom-2 right-2.5 text-[10px] text-slate-400">
              {inputText.length}/500
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 dark:hover:bg-emerald-500"
            aria-label="Send message"
          >
            <span>Send</span>
            <span aria-hidden="true" className="ml-1">
              ↗
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlanRequest } from '@/lib/plan/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolsSummary?: string[];
}

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
  const [messages, setMessages] = useState<Message[]>([
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
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
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50/70 p-4 sm:px-6 sm:py-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-lg dark:bg-emerald-950 dark:text-emerald-300">
              💬
            </span>
            <div>
              <h2
                id="chat-heading"
                className="text-base font-bold text-slate-900 sm:text-lg dark:text-slate-50"
              >
                Ask SaafHawa Assistant
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connected to live AQI sensors, 24-hr forecast, and scientific calculator
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            Live Tools Active
          </span>
        </div>
      </div>

      {/* Medical Disclaimer Alert */}
      <div className="border-b border-amber-200/80 bg-amber-50/70 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="font-semibold">⚠️ Health Advisory: </span>
        For persistent cough, asthma attacks, or chest distress, always consult a qualified medical doctor.
      </div>

      {/* Messages Scroll Area */}
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

              {/* Tool Execution Tag */}
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
                <span>Checking live forecast & calculating guidance...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap dark:text-slate-400">
            Suggestions:
          </span>
          {SAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(prompt)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-emerald-700 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
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

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage, ChatMessageList } from './ChatMessageList';
import { HouseholdProfile } from '@/lib/impact/types';
import { SendIcon, InfoIcon } from './ui/Icons';

export interface ChatPanelProps {
  place: string;
  householdProfile?: HouseholdProfile;
  isSampleData?: boolean;
  dataSource?: string;
  measuredTime?: string;
  timeZone?: string;
  onClose?: () => void;
  className?: string;
}

const SAMPLE_PROMPTS = [
  'Can my child play outdoors at 5 PM today?',
  'How much cleaner is indoor air if I run a bedroom air purifier?',
  'What is the cleanest window for daily errands today?',
  'Does cooking without an exhaust fan create a smog spike?',
];

export function ChatPanel({
  place,
  householdProfile,
  isSampleData = false,
  dataSource,
  measuredTime,
  timeZone,
  onClose,
  className = '',
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I'm your SaafHawa clean air assistant for ${place}. I have access to your 24-hour forecast curve and scientific exposure calculations. What would you like to check?`,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    // Only scroll within chat when the user has actively sent a message, never on initial dashboard mount!
    if (hasUserInteractedRef.current && messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    hasUserInteractedRef.current = true;

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
      const errMsg = err instanceof Error ? err.message : 'Chat service encountered an unexpected error.';
      setErrorMessage(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm having trouble retrieving live forecast data: ${errMsg}. Please try asking again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
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
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <ChatHeader
        isSampleData={isSampleData}
        dataSource={dataSource}
        measuredTime={measuredTime}
        timeZone={timeZone}
        onClose={onClose}
      />

      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        isSampleData={isSampleData}
        suggestedPrompts={SAMPLE_PROMPTS}
        onSelectPrompt={handleSendMessage}
      />

      {/* Input Box */}
      <div className="border-t border-slate-200 p-3.5 sm:p-4 dark:border-slate-800">
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
              placeholder="e.g. Can my child play outside at 5 PM? (Enter to send)"
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs transition placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <div className="absolute bottom-2 right-2.5 text-[10px] text-slate-400">
              {inputText.length}/500
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="inline-flex h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl bg-teal-800 px-4 text-sm font-semibold text-white shadow-2xs transition hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:bg-teal-700 dark:hover:bg-teal-600"
            aria-label="Send message"
          >
            <SendIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* Reassuring, short 1-line medical note (Not a loud banner) */}
      <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400 flex items-center gap-1.5">
        <InfoIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span>For medical symptoms or respiratory distress, please consult a medical doctor.</span>
      </div>
    </section>
  );
}

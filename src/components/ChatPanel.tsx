'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatMessage, ChatMessageList } from './ChatMessageList';
import { ChatRequest } from '@/lib/chat/types';
import { HouseholdProfile } from '@/lib/impact/types';
import { SendIcon } from './ui/Icons';
import { getShortPlaceName } from '@/lib/design-system';

export interface ChatPanelProps {
  place: string;
  displayPlace?: string;
  householdProfile?: HouseholdProfile;
  dataSource?: string;
  measuredTime?: string;
  timeZone?: string;
  onClose?: () => void;
  className?: string;
}

const SAMPLE_PROMPTS = [
  'Can my daughter play outside at 5 PM?',
  'Is a DIY box-fan filter worth it?',
  'Metro or car for tomorrow’s commute?',
];

/**
 * Interactive conversational assistant for real-time air quality questions,
 * integrating local sensor readings and personalized household guidance.
 */
export function ChatPanel({
  place,
  displayPlace,
  householdProfile,
  dataSource,
  measuredTime,
  timeZone,
  onClose,
  className = '',
}: ChatPanelProps) {
  const shortPlace = getShortPlaceName(displayPlace || place);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Ask me about timing, masks, purifiers or your commute. I'll check the forecast first.",
    isGreeting: true,
  }]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    if (hasUserInteractedRef.current && messages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (textToSend?: string, baseMessages?: ChatMessage[]) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    hasUserInteractedRef.current = true;
    const currentList = baseMessages || messages;
    const newMessages: ChatMessage[] = [...currentList, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputText('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const conversationHistory = currentList
        .filter((m) => !m.isGreeting && !m.isError)
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

      const payload: ChatRequest = {
        message: text,
        conversationHistory,
        place: place.trim(),
        householdProfile: householdProfile as ChatRequest['householdProfile'],
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Unable to connect to the clean air assistant.');
      }

      const data = await response.json();
      const rawTools: string[] = (data.toolsExecuted || [])
        .map((t: { resultSummary?: string }) => t.resultSummary)
        .filter((s: unknown): s is string => typeof s === 'string' && s.length > 0);
      const toolsSummary: string[] = Array.from(new Set(rawTools));

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.reply,
          toolsSummary: toolsSummary.length > 0 ? toolsSummary : undefined,
          fallbackReason: data.fallbackReason,
          dailyQuotaResetTime: data.dailyQuotaResetTime,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to retrieve advice.';
      setErrorMessage(msg);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `${msg} Please try asking again.`, isError: true },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleRetryMessage = (msgIdx: number) => {
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const userText = messages[i].content;
        const baseList = messages.filter((_, idx) => idx !== msgIdx && idx !== i);
        handleSendMessage(userText, baseList);
        break;
      }
    }
  };

  return (
    <section aria-labelledby="chat-heading" className={`card ${className}`}>
      <ChatHeader
        place={shortPlace}
        dataSource={dataSource}
        measuredTime={measuredTime}
        timeZone={timeZone}
        onClose={onClose}
      />

      <ChatMessageList
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
        suggestedPrompts={SAMPLE_PROMPTS}
        onSelectPrompt={handleSendMessage}
        onRetryMessage={handleRetryMessage}
      />

      {errorMessage && (
        <div role="alert" className="px-4 py-1 text-[13px] text-rose-600 dark:text-rose-400">
          {errorMessage}
        </div>
      )}

      <div className="composer">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="composer-form"
          style={{ display: 'flex', width: '100%', gap: '8px', alignItems: 'center' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask about smog in ${shortPlace}...`}
            disabled={isLoading}
            aria-label="Ask clean air assistant"
            maxLength={300}
            style={{ flex: '1 1 auto', width: '100%', minWidth: 0 }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            aria-label="Send question"
            className="btn btn-primary"
            style={{ width: '44px', height: '44px', padding: 0, flex: 'none' }}
          >
            <SendIcon className="icon" />
          </button>
        </form>
      </div>

      <p className="caption text-center" style={{ padding: '8px 16px', margin: 0, color: 'var(--ink-3)' }}>
        For acute symptoms or breathing distress, always consult a doctor.
      </p>
    </section>
  );
}

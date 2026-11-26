import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ChatRequestSchema } from '@/lib/chat/types';
import { MOCK_PROFILE } from '@/test/plan-fixtures';
import { POST as postChat } from '@/app/api/chat/route';
import { chatRateLimiter } from '@/lib/rate-limit';

describe('Chat Multi-Turn Conversation History', () => {
  beforeEach(() => {
    chatRateLimiter.reset();
  });

  it('sends two chat questions in a row through real /api/chat with long reply in history', async () => {
    // Turn 1
    const req1 = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the air quality in Kozhikode today?',
        place: 'Kozhikode',
      }),
    });
    const res1 = await postChat(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.reply).toBeDefined();

    // Turn 2 with previous answer in history
    const req2 = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can the children play outside?',
        place: 'Kozhikode',
        conversationHistory: [
          { role: 'user', content: 'What is the air quality in Kozhikode today?' },
          { role: 'assistant', content: data1.reply },
        ],
      }),
    });
    const res2 = await postChat(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.reply).toBeDefined();
    expect(data2.error).toBeUndefined();
  });

  it('validates chat request when conversation history includes long assistant reply (>500 chars)', () => {
    const longAssistantReply = 'Here is a detailed explanation of clean air techniques for your family. '.repeat(10);
    expect(longAssistantReply.length).toBeGreaterThan(500);

    const parsed = ChatRequestSchema.parse({
      message: 'What about windows?',
      place: 'Kozhikode',
      householdProfile: MOCK_PROFILE,
      conversationHistory: [
        { role: 'user', content: 'Can we go outside?' },
        { role: 'assistant', content: longAssistantReply },
      ],
    });

    expect(parsed.message).toBe('What about windows?');
    expect(parsed.conversationHistory.length).toBe(2);
    expect(parsed.conversationHistory[1].content.length).toBeLessThanOrEqual(1000);
  });
});

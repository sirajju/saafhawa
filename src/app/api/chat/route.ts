import { type NextRequest, NextResponse } from 'next/server';
import { handleChatQuery } from '@/lib/chat/service';
import { ChatRequestSchema } from '@/lib/chat/types';
import { VALIDATION_MESSAGES } from '@/lib/constants';
import { chatRateLimiter } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/api/responses';
import { NO_STORE_HEADERS, parseJsonRequest } from '@/lib/api/request';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(request, {
      schema: ChatRequestSchema,
      limiter: chatRateLimiter,
      rateLimitMessage: (seconds) =>
        `Rate limit exceeded. Please wait ${seconds} seconds before sending another message.`,
      invalidTitle: 'Validation Error',
      invalidMessage: VALIDATION_MESSAGES.INVALID_CHAT_QUERY,
    });
    if (!parsed.ok) return parsed.response;

    const response = await handleChatQuery(parsed.data);
    return NextResponse.json(response, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    return toErrorResponse('API:chat', error, {
      serverErrorTitle: 'Chat Service Error',
      fallbackMessage:
        'Unable to process your clean air question right now. Please try again shortly.',
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'Please provide a message under 500 characters.',
    });
  }
}

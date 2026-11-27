import { type NextRequest, NextResponse } from 'next/server';
import { handleChatQuery } from '@/lib/chat/service';
import { ChatRequestSchema } from '@/lib/chat/types';
import { VALIDATION_MESSAGES } from '@/lib/constants';
import { chatRateLimiter, getClientIp } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/security';
import { rateLimited, jsonError, toErrorResponse } from '@/lib/api/responses';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = chatRateLimiter.check(clientIp);
    if (!rateCheck.success) {
      return rateLimited(
        rateCheck.resetSeconds,
        `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before sending another message.`
      );
    }

    const { data: rawBody, error: bodyError } = await readJsonBodyWithLimit(request);
    if (bodyError) {
      return bodyError;
    }

    const parseResult = ChatRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return jsonError(400, 'Validation Error', VALIDATION_MESSAGES.INVALID_CHAT_QUERY);
    }

    const response = await handleChatQuery(parseResult.data);
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
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

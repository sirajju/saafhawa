import { NextRequest, NextResponse } from 'next/server';
import { handleChatQuery } from '@/lib/chat/service';
import { ChatRequestSchema } from '@/lib/chat/types';
import { chatRateLimiter, getClientIp } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/security';
import { logServerError, isNextControlFlowError } from '@/lib/logger';
import { ZodError } from 'zod';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // 1. IP-based rate limiting
    const clientIp = getClientIp(request);
    const rateCheck = chatRateLimiter.check(clientIp);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before sending another message.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    // 2. Safe JSON body reading with size limit enforcement
    const { data: rawBody, error: bodyError } = await readJsonBodyWithLimit(request);
    if (bodyError) {
      return bodyError;
    }

    const parseResult = ChatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Please provide a valid question under 500 characters.',
        },
        { status: 400 }
      );
    }

    // 3. Process chat query with Gemini function-calling
    const response = await handleChatQuery(parseResult.data);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    if (isNextControlFlowError(error)) {
      throw error;
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Please provide a message under 500 characters.',
        },
        { status: 400 }
      );
    }

    logServerError('API:chat', error);
    return NextResponse.json(
      {
        error: 'Chat Service Error',
        message: 'Unable to process your clean air question right now. Please try again shortly.',
      },
      { status: 500 }
    );
  }
}

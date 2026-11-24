import { NextRequest, NextResponse } from 'next/server';
import { handleChatQuery } from '@/lib/chat/service';
import { ChatRequestSchema } from '@/lib/chat/types';
import { chatRateLimiter, getClientIp } from '@/lib/rate-limit';
import { ZodError } from 'zod';

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

    // 2. Parse and validate JSON payload
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON Body',
          message: 'The request body must be valid JSON.',
        },
        { status: 400 }
      );
    }

    const parseResult = ChatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors).flat()[0] || 'Invalid request message';

      return NextResponse.json(
        {
          error: 'Validation Error',
          message: firstError,
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
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Please provide a message under 500 characters.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Chat Service Error',
        message: 'Unable to process your clean air question right now. Please try again shortly.',
      },
      { status: 500 }
    );
  }
}

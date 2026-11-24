import { NextRequest, NextResponse } from 'next/server';
import { generateCommunityAdvisory } from '@/lib/community/advisory-generator';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { advisoryRateLimiter, getClientIp } from '@/lib/rate-limit';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // 1. IP-based rate limiting
    const clientIp = getClientIp(request);
    const rateCheck = advisoryRateLimiter.check(clientIp);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Advisory rate limit reached. Please wait ${rateCheck.resetSeconds} seconds before generating another advisory.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    // 2. Parse and validate JSON
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

    const parseResult = AdvisoryRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Please provide a valid location and audience selection.',
        },
        { status: 400 }
      );
    }

    // 3. Generate advisory
    const advisory = await generateCommunityAdvisory(parseResult.data);

    return NextResponse.json(advisory, {
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
          message: 'Invalid advisory parameters.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Advisory Generation Error',
        message: 'Unable to generate community advisory right now. Please try again.',
      },
      { status: 500 }
    );
  }
}

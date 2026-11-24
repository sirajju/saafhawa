import { NextRequest, NextResponse } from 'next/server';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { PlanRequestSchema } from '@/lib/plan/types';
import { AirQualityError } from '@/lib/air-quality/types';
import { getClientIp, planRateLimiter } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/security';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // 1. IP-based rate limiting
    const clientIp = getClientIp(request);
    const rateCheck = planRateLimiter.check(clientIp);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before generating another plan.`,
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

    const parseResult = PlanRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid Household Profile',
          message:
            'Please provide a valid household profile including a place (between 2 and 120 characters) and at least 1 adult.',
        },
        { status: 400 }
      );
    }

    const plan = await generateHouseholdPlan(parseResult.data);

    return NextResponse.json(plan, {
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
          message: 'The household profile contains invalid or out-of-range values.',
        },
        { status: 400 }
      );
    }

    if (error instanceof AirQualityError) {
      return NextResponse.json(
        {
          error:
            error.statusCode === 404
              ? 'Location Not Found'
              : error.statusCode === 429
              ? 'Too Many Requests'
              : 'Service Unavailable',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while generating your daily smog plan.',
      },
      { status: 500 }
    );
  }
}

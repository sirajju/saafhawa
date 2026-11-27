import { type NextRequest, NextResponse } from 'next/server';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { PlanRequestSchema } from '@/lib/plan/types';
import { VALIDATION_MESSAGES } from '@/lib/constants';
import { getClientIp, planRateLimiter } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/security';
import { rateLimited, jsonError, toErrorResponse } from '@/lib/api/responses';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = planRateLimiter.check(clientIp);
    if (!rateCheck.success) {
      return rateLimited(
        rateCheck.resetSeconds,
        `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before generating another plan.`
      );
    }

    const { data: rawBody, error: bodyError } = await readJsonBodyWithLimit(request);
    if (bodyError) {
      return bodyError;
    }

    const parseResult = PlanRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return jsonError(400, 'Invalid Household Profile', VALIDATION_MESSAGES.INVALID_PROFILE);
    }

    const plan = await generateHouseholdPlan(parseResult.data);
    return NextResponse.json(plan, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse('API:plan', error, {
      serverErrorTitle: 'Internal Server Error',
      fallbackMessage: 'An unexpected error occurred while generating your daily smog plan.',
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'The household profile contains invalid or out-of-range values.',
      airQualityTitles: {
        404: 'Location Not Found',
        429: 'Too Many Requests',
      },
      airQualityFallbackTitle: 'Service Unavailable',
    });
  }
}

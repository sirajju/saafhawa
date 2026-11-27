import { type NextRequest, NextResponse } from 'next/server';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { PlanRequestSchema } from '@/lib/plan/types';
import { VALIDATION_MESSAGES } from '@/lib/constants';
import { planRateLimiter } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/api/responses';
import { NO_STORE_HEADERS, parseJsonRequest } from '@/lib/api/request';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(request, {
      schema: PlanRequestSchema,
      limiter: planRateLimiter,
      rateLimitMessage: (seconds) =>
        `Rate limit exceeded. Please wait ${seconds} seconds before generating another plan.`,
      invalidTitle: 'Invalid Household Profile',
      invalidMessage: VALIDATION_MESSAGES.INVALID_PROFILE,
    });
    if (!parsed.ok) return parsed.response;

    const plan = await generateHouseholdPlan(parsed.data);
    return NextResponse.json(plan, { status: 200, headers: NO_STORE_HEADERS });
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

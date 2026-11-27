import { type NextRequest, NextResponse } from 'next/server';
import { generateCommunityAdvisory } from '@/lib/community/advisory-generator';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { advisoryRateLimiter } from '@/lib/rate-limit';
import { toErrorResponse } from '@/lib/api/responses';
import { NO_STORE_HEADERS, parseJsonRequest } from '@/lib/api/request';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseJsonRequest(request, {
      schema: AdvisoryRequestSchema,
      limiter: advisoryRateLimiter,
      rateLimitMessage: (seconds) =>
        `Advisory rate limit reached. Please wait ${seconds} seconds before generating another advisory.`,
      invalidTitle: 'Validation Error',
      invalidMessage: 'Please provide a valid location and audience selection.',
    });
    if (!parsed.ok) return parsed.response;

    const advisory = await generateCommunityAdvisory(parsed.data);
    return NextResponse.json(advisory, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    return toErrorResponse('API:community-advisory', error, {
      serverErrorTitle: 'Advisory Generation Error',
      fallbackMessage: 'Unable to generate community advisory right now. Please try again.',
      zodErrorTitle: 'Validation Error',
      zodErrorMessage: 'Invalid advisory parameters.',
      treatAirQualityAsServerError: true,
    });
  }
}

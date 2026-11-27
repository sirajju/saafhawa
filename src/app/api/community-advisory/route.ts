import { NextRequest, NextResponse } from 'next/server';
import { generateCommunityAdvisory } from '@/lib/community/advisory-generator';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { advisoryRateLimiter, getClientIp } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/security';
import { rateLimited, jsonError, toErrorResponse } from '@/lib/api/responses';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = advisoryRateLimiter.check(clientIp);
    if (!rateCheck.success) {
      return rateLimited(
        rateCheck.resetSeconds,
        `Advisory rate limit reached. Please wait ${rateCheck.resetSeconds} seconds before generating another advisory.`
      );
    }

    const { data: rawBody, error: bodyError } = await readJsonBodyWithLimit(request);
    if (bodyError) {
      return bodyError;
    }

    const parseResult = AdvisoryRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return jsonError(400, 'Validation Error', 'Please provide a valid location and audience selection.');
    }

    const advisory = await generateCommunityAdvisory(parseResult.data);
    return NextResponse.json(advisory, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse(
      'API:community-advisory',
      error,
      'Unable to generate community advisory right now. Please try again.'
    );
  }
}

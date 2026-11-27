import { type NextRequest, NextResponse } from 'next/server';
import { getAirQualityByLocation } from '@/lib/air-quality/service';
import { AirQualityQuerySchema } from '@/lib/air-quality/types';
import { airQualityRateLimiter, getClientIp } from '@/lib/rate-limit';
import { rateLimited, jsonError, toErrorResponse } from '@/lib/api/responses';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateCheck = airQualityRateLimiter.check(clientIp);
    if (!rateCheck.success) {
      return rateLimited(
        rateCheck.resetSeconds,
        `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before requesting air quality again.`
      );
    }

    const { searchParams } = new URL(request.url);
    const rawPlace = searchParams.get('place');
    if (!rawPlace) {
      return jsonError(
        400,
        'Invalid Request',
        'Query parameter "place" is required (between 2 and 120 characters).'
      );
    }

    const { place } = AirQualityQuerySchema.parse({ place: rawPlace });
    const report = await getAirQualityByLocation(place);

    return NextResponse.json(report, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    return toErrorResponse('API:air-quality', error);
  }
}

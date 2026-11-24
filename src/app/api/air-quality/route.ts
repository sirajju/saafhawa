import { NextRequest, NextResponse } from 'next/server';
import { getAirQualityByLocation } from '@/lib/air-quality/service';
import { AirQualityError, AirQualityQuerySchema } from '@/lib/air-quality/types';
import { airQualityRateLimiter, getClientIp } from '@/lib/rate-limit';
import { logServerError } from '@/lib/logger';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    // 1. IP-based rate limiting
    const clientIp = getClientIp(request);
    const rateCheck = airQualityRateLimiter.check(clientIp);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before requesting air quality again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);

    // Accept only the single designated query parameter: "place"
    const rawPlace = searchParams.get('place');

    if (!rawPlace) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Query parameter "place" is required (between 2 and 120 characters).',
        },
        { status: 400 }
      );
    }

    // Validate using Zod (min 2, max 120 chars)
    const { place } = AirQualityQuerySchema.parse({ place: rawPlace });

    const report = await getAirQualityByLocation(place);

    return NextResponse.json(report, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid Request',
          message: 'Query parameter "place" must be a valid location name or pincode between 2 and 120 characters.',
        },
        { status: 400 }
      );
    }

    if (error instanceof AirQualityError) {
      return NextResponse.json(
        {
          error:
            error.statusCode === 404
              ? 'Not Found'
              : error.statusCode === 429
              ? 'Too Many Requests'
              : error.statusCode === 503
              ? 'Service Unavailable'
              : error.statusCode === 400
              ? 'Invalid Request'
              : 'Service Error',
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    // Fallback for unexpected internal errors (prevent leaking raw Google text or stack traces)
    logServerError('API:air-quality', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while processing air quality data. Please try again later.',
      },
      { status: 500 }
    );
  }
}

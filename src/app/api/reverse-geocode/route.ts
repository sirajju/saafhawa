import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, reverseGeocodeRateLimiter } from '@/lib/rate-limit';
import { reverseGeocodeCoordinates } from '@/lib/air-quality/reverse-geocoder';
import { logServerError } from '@/lib/logger';
import { rateLimited, jsonError } from '@/lib/api/responses';

export const maxDuration = 10;

const CoordinateParamSchema = (name: string, min: number, max: number) =>
  z
    .string()
    .min(1, `${name} parameter is required.`)
    .max(40, `${name} parameter must be at most 40 characters.`)
    .refine((val) => /^[+-]?\d+(\.\d+)?$/.test(val.trim()), {
      message: `${name} must be a valid numeric string.`,
    })
    .transform((val) => Number(val))
    .refine((num) => Number.isFinite(num) && num >= min && num <= max, {
      message: `${name} must be a finite number between ${min} and ${max}.`,
    });

export const ReverseGeocodeQuerySchema = z.object({
  lat: CoordinateParamSchema('Latitude', -90, 90),
  lon: CoordinateParamSchema('Longitude', -180, 180),
});

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateCheck = reverseGeocodeRateLimiter.check(clientIp);
  if (!rateCheck.success) {
    return rateLimited(rateCheck.resetSeconds, 'Rate limit exceeded. Please wait shortly.');
  }

  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (!latStr || !lonStr) {
    return jsonError(400, 'Missing coordinates', 'Both lat and lon parameters are required.');
  }

  const parseResult = ReverseGeocodeQuerySchema.safeParse({ lat: latStr, lon: lonStr });
  if (!parseResult.success) {
    return jsonError(
      400,
      'Invalid coordinates',
      parseResult.error.issues[0]?.message || 'Invalid coordinates parameters.'
    );
  }

  const { lat, lon } = parseResult.data;

  try {
    const result = await reverseGeocodeCoordinates(lat, lon, { timeoutMs: 4000 });
    if (!result) {
      return NextResponse.json({ formattedAddress: null }, { status: 200 });
    }
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (error: unknown) {
    logServerError('API:reverse-geocode', error);
    return NextResponse.json({ formattedAddress: null }, { status: 200 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, reverseGeocodeRateLimiter } from '@/lib/rate-limit';
import { reverseGeocodeCoordinates } from '@/lib/air-quality/reverse-geocoder';

export const maxDuration = 10;

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateCheck = reverseGeocodeRateLimiter.check(clientIp);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please wait shortly.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.resetSeconds) },
      }
    );
  }

  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get('lat');
  const lonStr = searchParams.get('lon');

  if (!latStr || !lonStr) {
    return NextResponse.json(
      { error: 'Missing coordinates', message: 'Both lat and lon parameters are required.' },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json(
      {
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90, longitude between -180 and 180.',
      },
      { status: 400 }
    );
  }

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
  } catch {
    return NextResponse.json({ formattedAddress: null }, { status: 200 });
  }
}

import { safeFetch, type ClientRequestOptions } from './safe-fetch';

const TIMEZONE_BASE_URL = 'https://maps.googleapis.com/maps/api/timezone/json';

/**
 * Resolves the IANA time zone identifier for given coordinates via Google Time Zone API.
 * Uses the same Google Maps API key.
 * Returns the IANA timeZoneId (e.g. 'Asia/Kolkata', 'America/New_York') or null if lookup fails.
 */
export async function fetchTimeZone(
  latitude: number,
  longitude: number,
  apiKey: string,
  options: ClientRequestOptions = {}
): Promise<string | null> {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const url = new URL(TIMEZONE_BASE_URL);
    url.searchParams.set('location', `${latitude},${longitude}`);
    url.searchParams.set('timestamp', String(timestamp));
    url.searchParams.set('key', apiKey);

    const response = await safeFetch(
      url.toString(),
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      options
    );

    if (!response.ok) {
      return null;
    }

    const rawData = await response.json();
    if (
      rawData &&
      typeof rawData === 'object' &&
      'status' in rawData &&
      rawData.status === 'OK' &&
      'timeZoneId' in rawData &&
      typeof rawData.timeZoneId === 'string'
    ) {
      return rawData.timeZoneId;
    }

    return null;
  } catch {
    return null;
  }
}

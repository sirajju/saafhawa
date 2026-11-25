/**
 * Free reverse geocoding using BigDataCloud Client API with Nominatim fallback.
 * Resolves GPS coordinates into readable locality and city (e.g. "Kozhikode, Kerala").
 */

export interface ReverseGeocodeResult {
  formattedAddress: string;
  city?: string;
  locality?: string;
  state?: string;
  country?: string;
}

const reverseGeocodeCache = new Map<string, ReverseGeocodeResult>();

export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number,
  options: { timeoutMs?: number } = {}
): Promise<ReverseGeocodeResult | null> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey)!;
  }

  const timeoutMs = options.timeoutMs ?? 4000;

  // 1. Primary: BigDataCloud Free Client Reverse Geocoding API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const city = (data.city || data.locality || '').trim();
      const state = (data.principalSubdivision || '').trim();
      const country = (data.countryName || '').trim();

      if (city) {
        const formattedAddress = state ? `${city}, ${state}` : city;
        const result: ReverseGeocodeResult = {
          formattedAddress,
          city,
          locality: data.locality,
          state,
          country,
        };
        reverseGeocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Fall through to Nominatim fallback
  }

  // 2. Secondary Fallback: OpenStreetMap Nominatim
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'SaafHawa-CleanAirApp/1.0 (https://github.com/sirajju/saafhawa)',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city = (addr.city || addr.town || addr.municipality || addr.county || addr.suburb || '').trim();
      const state = (addr.state || '').trim();
      const country = (addr.country || '').trim();

      if (city) {
        const formattedAddress = state ? `${city}, ${state}` : city;
        const result: ReverseGeocodeResult = {
          formattedAddress,
          city,
          locality: addr.suburb || addr.neighbourhood,
          state,
          country,
        };
        reverseGeocodeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Both providers failed
  }

  return null;
}

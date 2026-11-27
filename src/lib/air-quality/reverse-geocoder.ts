/**
 * Free server-side reverse geocoding using OpenStreetMap Nominatim.
 * Resolves GPS coordinates into readable locality and city (e.g. "Kozhikode, Kerala").
 * Strictly enforces 1 request per second and sets a distinct User-Agent header.
 */
import { TIMERS } from '../constants';

export interface ReverseGeocodeResult {
  formattedAddress: string;
  city?: string;
  locality?: string;
  state?: string;
  country?: string;
}

const MAX_CACHE_ENTRIES = 50;
const reverseGeocodeCache = new Map<string, ReverseGeocodeResult>();
let lastNominatimRequestTime = 0;

function setCachedResult(key: string, result: ReverseGeocodeResult): void {
  if (reverseGeocodeCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = reverseGeocodeCache.keys().next().value;
    if (oldestKey) reverseGeocodeCache.delete(oldestKey);
  }
  reverseGeocodeCache.set(key, result);
}

async function waitForNominatimRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastNominatimRequestTime;
  if (elapsed < 1000) {
    await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
  }
  lastNominatimRequestTime = Date.now();
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number,
  options: { timeoutMs?: number } = {}
): Promise<ReverseGeocodeResult | null> {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached) return cached;

  const timeoutMs = options.timeoutMs ?? TIMERS.REVERSE_GEOCODE_TIMEOUT_MS;

  try {
    await waitForNominatimRateLimit();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SaafHawa-CleanAirApp/1.0 (https://github.com/sirajju/saafhawa)',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = (
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.county ||
          addr.suburb ||
          ''
        ).trim();
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
          setCachedResult(cacheKey, result);
          return result;
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Reverse geocoding failed
  }

  return null;
}

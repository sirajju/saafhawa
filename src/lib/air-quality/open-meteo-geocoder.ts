import { AirQualityError, LocationNotFoundError } from './types';
import { type OpenMeteoGeocodingResponse, type OpenMeteoLocationResult } from './open-meteo-types';
import {
  type ClientRequestOptions,
  normalizeIndianCity,
  resolveIndianPincodeCandidates,
} from './pincode-resolver';
import { safeFetch } from './safe-fetch';
import { reverseGeocodeCoordinates } from './reverse-geocoder';
import { logServerWarning } from '../logger';

const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Free geocoding using Open-Meteo Geocoding API with Indian pincode and coordinate fallback.
 */
export async function geocodeOpenMeteoPlace(
  rawQuery: string,
  options: ClientRequestOptions = {}
): Promise<OpenMeteoLocationResult> {
  const query = rawQuery.trim();

  // 1. Coordinates check (e.g. "28.6139, 77.2090" or "Coordinates (11.2551°, 75.8287°)")
  const coordMatch = query.match(
    /^(?:Coordinates\s*\()?\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*,\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*\)?$/i
  );
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      const rev = await reverseGeocodeCoordinates(lat, lon, options);
      return {
        formattedAddress:
          rev?.formattedAddress || `Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
        latitude: lat,
        longitude: lon,
        timeZone: 'auto',
      };
    }
  }

  // 2. Candidate search strings
  const isPincode = /^\d{6}$/.test(query);
  let searchCandidates: string[] = [];
  if (isPincode) {
    searchCandidates = await resolveIndianPincodeCandidates(query, options);
  } else {
    const normalized = normalizeIndianCity(query) || query;
    searchCandidates = [normalized];
    if (normalized !== query) searchCandidates.push(query);
  }

  // 3. Search via Open-Meteo Geocoding API
  for (const candidate of searchCandidates) {
    const url = new URL(OPEN_METEO_GEOCODING_URL);
    url.searchParams.set('name', candidate);
    url.searchParams.set('count', '10');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');

    const response = await safeFetch(
      url.toString(),
      { method: 'GET', headers: { Accept: 'application/json' } },
      options
    );
    if (response.status === 429) {
      logServerWarning('OpenMeteoClient', 'Geocoding rate limit reached (HTTP 429)');
      throw new AirQualityError(
        'Geocoding service rate limit reached. Please wait a moment and try again.',
        429
      );
    }
    if (!response.ok) continue;

    let data: OpenMeteoGeocodingResponse;
    try {
      data = (await response.json()) as OpenMeteoGeocodingResponse;
    } catch {
      continue;
    }

    const results = data.results || [];
    if (results.length === 0) continue;

    const matched =
      results.find((r) => r.country_code?.toUpperCase() === 'IN') ||
      (isPincode ? null : results[0]);
    if (!matched) continue;

    const addressParts = [matched.name, matched.admin1, matched.country].filter(Boolean);
    const formattedAddress = addressParts.join(', ');

    return {
      formattedAddress: isPincode ? `${formattedAddress} (${query})` : formattedAddress,
      latitude: matched.latitude,
      longitude: matched.longitude,
      timeZone: matched.timezone || 'Asia/Kolkata',
    };
  }

  if (isPincode) {
    throw new LocationNotFoundError(
      `Could not resolve Indian pincode "${query}". Please enter a city or area name instead.`
    );
  }

  throw new LocationNotFoundError(query);
}

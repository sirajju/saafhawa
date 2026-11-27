import {
  GoogleCurrentConditionsResponse,
  GoogleCurrentConditionsResponseSchema,
  GoogleForecastResponse,
  GoogleForecastResponseSchema,
  GoogleGeocodingResponse,
  GoogleGeocodingResponseSchema,
  LocationNotFoundError,
  QuotaExceededError,
  AirQualityError,
} from './types';
import { safeFetch, ClientRequestOptions, DEFAULT_REQUEST_TIMEOUT_MS } from './safe-fetch';
import { computeForecastPeriod } from './forecast-period';

export { DEFAULT_REQUEST_TIMEOUT_MS, computeForecastPeriod };
export type { ClientRequestOptions };

const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const AIR_QUALITY_BASE_URL = 'https://airquality.googleapis.com/v1';

export interface GeocodeLocationResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

/**
 * Geocodes an address or pincode into coordinates using Google Geocoding API.
 */
export async function geocodePlace(
  query: string,
  apiKey: string,
  options: ClientRequestOptions = {}
): Promise<GeocodeLocationResult> {
  const url = new URL(GEOCODING_BASE_URL);
  url.searchParams.set('address', query);
  url.searchParams.set('key', apiKey);

  const response = await safeFetch(
    url.toString(),
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
    options
  );

  if (response.status === 429) throw new QuotaExceededError();
  if (!response.ok) throw new AirQualityError('Failed to communicate with geocoding service.', 502);

  let rawData: unknown;
  try {
    rawData = await response.json();
  } catch {
    throw new AirQualityError('Invalid response received from geocoding service.', 502);
  }

  const parsed: GoogleGeocodingResponse = GoogleGeocodingResponseSchema.parse(rawData);

  if (parsed.status === 'OVER_QUERY_LIMIT' || parsed.status === 'OVER_DAILY_LIMIT') {
    throw new QuotaExceededError();
  }

  if (parsed.status === 'ZERO_RESULTS' || !parsed.results.length) {
    throw new LocationNotFoundError(query);
  }

  if (parsed.status !== 'OK') {
    throw new AirQualityError('Unable to resolve location coordinates.', 502);
  }

  const firstResult = parsed.results[0];
  return {
    formattedAddress: firstResult.formatted_address,
    latitude: firstResult.geometry.location.lat,
    longitude: firstResult.geometry.location.lng,
  };
}

/**
 * Fetches real-time current conditions using Google Air Quality API.
 */
export async function fetchCurrentConditions(
  latitude: number,
  longitude: number,
  apiKey: string,
  options: ClientRequestOptions = {}
): Promise<GoogleCurrentConditionsResponse> {
  const url = `${AIR_QUALITY_BASE_URL}/currentConditions:lookup?key=${apiKey}`;

  const requestBody = {
    location: { latitude, longitude },
    extraComputations: ['POLLUTANT_CONCENTRATION', 'LOCAL_AQI'],
    universalAqi: true,
  };

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    },
    options
  );

  if (response.status === 429) throw new QuotaExceededError();

  if (!response.ok) {
    try {
      const errText = await response.text();
      if (errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota exceeded')) {
        throw new QuotaExceededError();
      }
    } catch (e) {
      if (e instanceof QuotaExceededError) throw e;
    }
    throw new AirQualityError('Failed to fetch current air quality conditions.', 502);
  }

  const rawData: unknown = await response.json();
  return GoogleCurrentConditionsResponseSchema.parse(rawData);
}

/**
 * Fetches hourly forecast for the next 24 hours using Google Air Quality API.
 */
export async function fetchHourlyForecast(
  latitude: number,
  longitude: number,
  apiKey: string,
  hours = 24,
  options: ClientRequestOptions = {}
): Promise<GoogleForecastResponse> {
  const url = `${AIR_QUALITY_BASE_URL}/forecast:lookup?key=${apiKey}`;
  const period = computeForecastPeriod(hours);

  const requestBody = {
    location: { latitude, longitude },
    period,
    pageSize: hours,
    extraComputations: ['POLLUTANT_CONCENTRATION', 'LOCAL_AQI'],
    universalAqi: true,
  };

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(requestBody),
    },
    options
  );

  if (response.status === 429) throw new QuotaExceededError();

  if (!response.ok) {
    try {
      const errText = await response.text();
      if (errText.includes('RESOURCE_EXHAUSTED') || errText.includes('Quota exceeded')) {
        throw new QuotaExceededError();
      }
    } catch (e) {
      if (e instanceof QuotaExceededError) throw e;
    }
    throw new AirQualityError('Failed to fetch hourly air quality forecast.', 502);
  }

  const rawData: unknown = await response.json();
  return GoogleForecastResponseSchema.parse(rawData);
}

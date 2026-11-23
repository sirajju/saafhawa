import {
  GoogleCurrentConditionsResponse,
  GoogleCurrentConditionsResponseSchema,
  GoogleForecastResponse,
  GoogleForecastResponseSchema,
  GoogleGeocodingResponse,
  GoogleGeocodingResponseSchema,
  LocationNotFoundError,
  ProviderUnavailableError,
  QuotaExceededError,
  AirQualityError,
} from './types';

const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const AIR_QUALITY_BASE_URL = 'https://airquality.googleapis.com/v1';
export const DEFAULT_REQUEST_TIMEOUT_MS = 7000;

export interface GeocodeLocationResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

export interface ClientRequestOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Executes a fetch request with timeout and translates network/quota errors into domain errors.
 */
async function safeFetch(
  url: string,
  init: RequestInit,
  options: ClientRequestOptions = {}
): Promise<Response> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request timed out'));
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('timed out'))) {
      throw new ProviderUnavailableError('Air quality service request timed out. Please try again shortly.');
    }
    throw new ProviderUnavailableError('Unable to connect to air quality provider. Please check your connection.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Geocodes an address or pincode/postal code into coordinates using Google Geocoding API.
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
      headers: {
        Accept: 'application/json',
      },
    },
    options
  );

  if (response.status === 429) {
    throw new QuotaExceededError();
  }

  if (!response.ok) {
    throw new AirQualityError('Failed to communicate with geocoding service.', 502);
  }

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
 * Uses official parameters including universalAqi and POLLUTANT_CONCENTRATION.
 */
export async function fetchCurrentConditions(
  latitude: number,
  longitude: number,
  apiKey: string,
  options: ClientRequestOptions = {}
): Promise<GoogleCurrentConditionsResponse> {
  const url = `${AIR_QUALITY_BASE_URL}/currentConditions:lookup?key=${apiKey}`;

  const requestBody = {
    location: {
      latitude,
      longitude,
    },
    extraComputations: ['POLLUTANT_CONCENTRATION', 'LOCAL_AQI'],
    universalAqi: true,
  };

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
    options
  );

  if (response.status === 429) {
    throw new QuotaExceededError();
  }

  if (!response.ok) {
    // Check if body hints at resource exhaustion / quota
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
 * Computes an explicit 24-hour time period starting from the current UTC hour.
 */
export function computeForecastPeriod(hours = 24, fromDate = new Date()): {
  startTime: string;
  endTime: string;
} {
  const start = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
      fromDate.getUTCHours(),
      0,
      0,
      0
    )
  );
  // endTime is inclusive in Google Air Quality API
  const end = new Date(start.getTime() + (hours - 1) * 3600 * 1000);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

/**
 * Fetches hourly forecast for the next 24 hours using Google Air Quality API.
 * Uses explicit period, pageSize: 24, universalAqi, and POLLUTANT_CONCENTRATION.
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
    location: {
      latitude,
      longitude,
    },
    period,
    pageSize: hours,
    extraComputations: ['POLLUTANT_CONCENTRATION', 'LOCAL_AQI'],
    universalAqi: true,
  };

  const response = await safeFetch(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    },
    options
  );

  if (response.status === 429) {
    throw new QuotaExceededError();
  }

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

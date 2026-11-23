import { airQualityCache, normalizeLocationKey } from './cache';
import {
  fetchCurrentConditions,
  fetchHourlyForecast,
  geocodePlace,
  GeocodeLocationResult,
  ClientRequestOptions,
} from './google-client';
import {
  AirQualityError,
  AirQualityIndexSchema,
  AirQualityQuerySchema,
  AirQualityReport,
  AirQualityReportSchema,
  HourlyForecastPoint,
  PollutantItemSchema,
  PollutantMeasurement,
} from './types';
import { z } from 'zod';

type AirQualityIndex = z.infer<typeof AirQualityIndexSchema>;
type PollutantItem = z.infer<typeof PollutantItemSchema>;

export interface GetAirQualityOptions extends ClientRequestOptions {
  apiKey?: string;
  bypassCache?: boolean;
  forecastHours?: number;
}

function resolveApiKey(providedKey?: string): string {
  const key = providedKey || process.env.GOOGLE_MAPS_API_KEY;

  if (!key) {
    throw new AirQualityError(
      'Server configuration error: GOOGLE_MAPS_API_KEY is not set.',
      500
    );
  }

  return key;
}

interface ExtractedIndex {
  aqi: number | null;
  category: string | null;
  dominantPollutant: string | null;
  indexCode: string | null;
  indexDisplayName: string | null;
}

/**
 * Extracts index according to priority:
 * 1. India's local AQI (`ind_cpcb`)
 * 2. Universal AQI (`uaqi`)
 * 3. Any available index
 * If no index is available or AQI is absent, aqi is null (not 0).
 */
export function extractPrimaryIndex(indexes: AirQualityIndex[]): ExtractedIndex {
  if (!indexes || indexes.length === 0) {
    return {
      aqi: null,
      category: null,
      dominantPollutant: null,
      indexCode: null,
      indexDisplayName: null,
    };
  }

  // 1. Check for India's National AQI (CPCB)
  const indCpcb = indexes.find((idx) => idx.code.toLowerCase() === 'ind_cpcb');
  if (indCpcb) {
    return {
      aqi: typeof indCpcb.aqi === 'number' ? indCpcb.aqi : null,
      category: indCpcb.category ?? null,
      dominantPollutant: indCpcb.dominantPollutant ?? null,
      indexCode: indCpcb.code,
      indexDisplayName: indCpcb.displayName ?? 'India National AQI (CPCB)',
    };
  }

  // 2. Fall back to Universal AQI (UAQI)
  const uaqi = indexes.find((idx) => idx.code.toLowerCase() === 'uaqi');
  if (uaqi) {
    return {
      aqi: typeof uaqi.aqi === 'number' ? uaqi.aqi : null,
      category: uaqi.category ?? null,
      dominantPollutant: uaqi.dominantPollutant ?? null,
      indexCode: uaqi.code,
      indexDisplayName: uaqi.displayName ?? 'Universal AQI',
    };
  }

  // 3. Fall back to first available index
  const first = indexes[0];
  return {
    aqi: typeof first.aqi === 'number' ? first.aqi : null,
    category: first.category ?? null,
    dominantPollutant: first.dominantPollutant ?? null,
    indexCode: first.code,
    indexDisplayName: first.displayName ?? first.code,
  };
}

function extractPollutant(
  pollutants: PollutantItem[],
  targetCode: 'pm25' | 'pm10'
): PollutantMeasurement | null {
  if (!pollutants || !Array.isArray(pollutants)) {
    return null;
  }

  const match = pollutants.find((p) => p.code.toLowerCase() === targetCode.toLowerCase());
  if (!match || !match.concentration || typeof match.concentration.value !== 'number') {
    return null;
  }

  return {
    value: Number(match.concentration.value.toFixed(1)),
    units: match.concentration.units || 'MICROGRAMS_PER_CUBIC_METER',
  };
}

/**
 * Main service to fetch complete Air Quality data (Current + 24-hr Forecast) for a place name or pincode.
 * - Prioritizes India's local AQI (ind_cpcb) with fallback to Universal AQI (uaqi)
 * - Returns AQI as null when no index is returned
 * - Recovers gracefully from forecast failures by returning current conditions with an empty forecast
 * - Caches validated reports for 15 minutes with a capacity cap
 */
export async function getAirQualityByLocation(
  rawPlace: string,
  options: GetAirQualityOptions = {}
): Promise<AirQualityReport> {
  const { place } = AirQualityQuerySchema.parse({ place: rawPlace });
  const apiKey = resolveApiKey(options.apiKey);
  const cacheKey = normalizeLocationKey(place);
  const forecastHours = options.forecastHours ?? 24;
  const clientOptions: ClientRequestOptions = {
    fetchFn: options.fetchFn,
    timeoutMs: options.timeoutMs,
  };

  // Check 15-minute in-memory cache
  if (!options.bypassCache) {
    const cached = airQualityCache.get(cacheKey);
    if (cached) {
      return cached.value;
    }
  }

  // Step 1: Geocode place name or pincode
  const geocoded: GeocodeLocationResult = await geocodePlace(place, apiKey, clientOptions);

  // Step 2: Fetch current conditions and hourly forecast
  // If the forecast request fails, still return current conditions with an empty forecast
  const [currentConditions, forecastData] = await Promise.all([
    fetchCurrentConditions(geocoded.latitude, geocoded.longitude, apiKey, clientOptions),
    fetchHourlyForecast(geocoded.latitude, geocoded.longitude, apiKey, forecastHours, clientOptions).catch(
      () => null
    ),
  ]);

  // Step 3: Parse and map current conditions
  const primaryCurrentIndex = extractPrimaryIndex(currentConditions.indexes);
  const currentPm25 = extractPollutant(currentConditions.pollutants, 'pm25');
  const currentPm10 = extractPollutant(currentConditions.pollutants, 'pm10');

  // Step 4: Map hourly forecast points (up to 24 hours) or empty array if forecast failed
  let hourlyForecast: HourlyForecastPoint[] = [];

  if (forecastData && Array.isArray(forecastData.hourlyForecasts)) {
    hourlyForecast = forecastData.hourlyForecasts.slice(0, forecastHours).map((point) => {
      const primaryIndex = extractPrimaryIndex(point.indexes);
      return {
        dateTime: point.dateTime,
        aqi: primaryIndex.aqi,
        category: primaryIndex.category,
        dominantPollutant: primaryIndex.dominantPollutant,
        indexCode: primaryIndex.indexCode,
        indexDisplayName: primaryIndex.indexDisplayName,
        pm25: extractPollutant(point.pollutants, 'pm25'),
        pm10: extractPollutant(point.pollutants, 'pm10'),
      };
    });
  }

  const now = Date.now();
  const ttlMs = 15 * 60 * 1000; // 15 minutes

  const reportPayload: AirQualityReport = {
    location: {
      name: geocoded.formattedAddress,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
    },
    current: {
      dateTime: currentConditions.dateTime,
      aqi: primaryCurrentIndex.aqi,
      category: primaryCurrentIndex.category,
      dominantPollutant: primaryCurrentIndex.dominantPollutant,
      indexCode: primaryCurrentIndex.indexCode,
      indexDisplayName: primaryCurrentIndex.indexDisplayName,
      pm25: currentPm25,
      pm10: currentPm10,
    },
    hourlyForecast,
    cachedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };

  // Step 5: Validate clean unified format through Zod
  const validatedReport = AirQualityReportSchema.parse(reportPayload);

  // Step 6: Store in cache with 15-minute TTL
  airQualityCache.set(cacheKey, validatedReport, ttlMs);

  return validatedReport;
}

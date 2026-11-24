import { airQualityCache, normalizeLocationKey } from './cache';
import { getSampleDelhiAirQualityReport } from './sample-data';
import {
  fetchCurrentConditions,
  fetchHourlyForecast,
  geocodePlace,
  GeocodeLocationResult,
  ClientRequestOptions,
} from './google-client';
import {
  AirQualityQuerySchema,
  AirQualityReport,
  AirQualityReportSchema,
  HourlyForecastPoint,
} from './types';
import {
  extractPrimaryIndex,
  extractPollutant,
  ExtractedIndex,
} from './index-extractor';

export { extractPrimaryIndex, extractPollutant };
export type { ExtractedIndex };

export interface GetAirQualityOptions extends ClientRequestOptions {
  apiKey?: string;
  bypassCache?: boolean;
  forecastHours?: number;
}

function resolveApiKey(providedKey?: string): string | null {
  const key = providedKey || process.env.GOOGLE_MAPS_API_KEY;

  if (!key || key.trim() === '' || key === 'undefined') {
    return null;
  }

  return key;
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

  if (!apiKey) {
    return getSampleDelhiAirQualityReport(place);
  }

  const cacheKey = normalizeLocationKey(place);
  const forecastHours = options.forecastHours ?? 24;

  const cached = airQualityCache.get(cacheKey);
  if (cached) {
    return cached.value;
  }

  const location: GeocodeLocationResult = await geocodePlace(place, apiKey, options);

  const currentConditionsPromise = fetchCurrentConditions(
    location.latitude,
    location.longitude,
    apiKey,
    options
  );

  const forecastPromise = fetchHourlyForecast(
    location.latitude,
    location.longitude,
    apiKey,
    forecastHours,
    options
  ).catch(() => null);

  const [currentConditions, rawForecast] = await Promise.all([
    currentConditionsPromise,
    forecastPromise,
  ]);

  const primaryIndex = extractPrimaryIndex(currentConditions.indexes || []);
  const pm25 = extractPollutant(currentConditions.pollutants || [], 'pm25');
  const pm10 = extractPollutant(currentConditions.pollutants || [], 'pm10');

  const hourlyForecast: HourlyForecastPoint[] = [];

  if (rawForecast && Array.isArray(rawForecast.hourlyForecasts)) {
    for (const item of rawForecast.hourlyForecasts) {
      if (!item || !item.dateTime) continue;

      const itemIndex = extractPrimaryIndex(item.indexes || []);
      const itemPm25 = extractPollutant(item.pollutants || [], 'pm25');
      const itemPm10 = extractPollutant(item.pollutants || [], 'pm10');

      hourlyForecast.push({
        dateTime: item.dateTime,
        aqi: itemIndex.aqi,
        category: itemIndex.category,
        dominantPollutant: itemIndex.dominantPollutant,
        indexCode: itemIndex.indexCode,
        indexDisplayName: itemIndex.indexDisplayName,
        pm25: itemPm25,
        pm10: itemPm10,
      });
    }
  }

  const report: AirQualityReport = {
    location: {
      name: location.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
    },
    current: {
      dateTime: currentConditions.dateTime,
      aqi: primaryIndex.aqi,
      category: primaryIndex.category,
      dominantPollutant: primaryIndex.dominantPollutant,
      indexCode: primaryIndex.indexCode,
      indexDisplayName: primaryIndex.indexDisplayName,
      pm25,
      pm10,
    },
    hourlyForecast,
    cachedAt: new Date().toISOString(),
    isSampleData: false,
  };

  const validatedReport = AirQualityReportSchema.parse(report);
  airQualityCache.set(cacheKey, validatedReport);

  return validatedReport;
}

import { airQualityCache, normalizeLocationKey } from './cache';
import { ClientRequestOptions } from './google-client';
import { fetchViaGoogle } from './google-service';
import { geocodeOpenMeteoPlace, fetchOpenMeteoAirQuality, OpenMeteoLocationResult } from './open-meteo-client';
import { fetchWaqiNearestStation } from './waqi-client';
import { AirQualityQuerySchema, AirQualityReport, AirQualityReportSchema } from './types';
import { extractPrimaryIndex, extractPollutant, ExtractedIndex } from './index-extractor';
import { logServerWarning } from '../logger';

export { extractPrimaryIndex, extractPollutant };
export type { ExtractedIndex };

export interface GetAirQualityOptions extends ClientRequestOptions {
  apiKey?: string;
  waqiToken?: string;
  bypassCache?: boolean;
  forecastHours?: number;
}

function resolveGoogleApiKey(providedKey?: string): string | null {
  const key = providedKey || process.env.GOOGLE_MAPS_API_KEY;
  if (!key || key.trim() === '' || key === 'undefined') return null;
  return key;
}

function resolveWaqiToken(providedToken?: string): string | null {
  const token = providedToken || process.env.WAQI_TOKEN;
  if (!token || token.trim() === '' || token === 'undefined') return null;
  return token.trim();
}

function syncFirstForecastHour(report: AirQualityReport): AirQualityReport {
  if (
    report.current &&
    typeof report.current.aqi === 'number' &&
    report.hourlyForecast &&
    report.hourlyForecast.length > 0
  ) {
    const updatedForecast = report.hourlyForecast.map((pt, idx) =>
      idx === 0 ? { ...pt, aqi: report.current.aqi, category: report.current.category } : pt
    );
    return { ...report, hourlyForecast: updatedForecast };
  }
  return report;
}

/**
 * Fetches real-time air quality report using free Open-Meteo APIs (keyless default).
 */
async function fetchViaOpenMeteo(
  place: string,
  options: GetAirQualityOptions,
  preResolvedLocation?: OpenMeteoLocationResult
): Promise<AirQualityReport> {
  const location = preResolvedLocation || (await geocodeOpenMeteoPlace(place, options));
  const aqData = await fetchOpenMeteoAirQuality(location.latitude, location.longitude, location.timeZone, options);

  const rawReport: AirQualityReport = {
    location: {
      name: location.formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      timeZone: location.timeZone,
    },
    current: {
      ...aqData.current,
      dataSource: 'Open-Meteo (CAMS model)',
      attribution: 'Air quality data provided by Open-Meteo under CC BY 4.0 (Copernicus CAMS model)',
    },
    hourlyForecast: aqData.hourlyForecast,
    cachedAt: new Date().toISOString(),
    dataSource: 'Open-Meteo (CAMS model)',
    attribution: 'Air quality data provided by Open-Meteo under CC BY 4.0 (Copernicus CAMS model)',
  };

  const report = syncFirstForecastHour(rawReport);
  return AirQualityReportSchema.parse(report);
}

/**
 * Main service to fetch real-time Air Quality data (Current + 24-hr Forecast) for a place name, pincode, or coordinates.
 *
 * Priority:
 * 1. Nearest CPCB ground station via WAQI API (if WAQI_TOKEN is set).
 * 2. Google Air Quality API (if GOOGLE_MAPS_API_KEY is set).
 * 3. Free real-time Open-Meteo Copernicus CAMS model (default and universal fallback).
 */
export async function getAirQualityByLocation(
  rawPlace: string,
  options: GetAirQualityOptions = {}
): Promise<AirQualityReport> {
  const { place } = AirQualityQuerySchema.parse({ place: rawPlace });
  const cacheKey = normalizeLocationKey(place);

  if (!options.bypassCache) {
    const cached = airQualityCache.get(cacheKey);
    if (cached) return cached.value;
  }

  const waqiToken = resolveWaqiToken(options.waqiToken);
  const googleApiKey = resolveGoogleApiKey(options.apiKey);

  // 1. If WAQI_TOKEN is set, use nearest CPCB ground station as the main source
  if (waqiToken) {
    try {
      const location = await geocodeOpenMeteoPlace(place, options);
      const waqiStation = await fetchWaqiNearestStation(location.latitude, location.longitude, waqiToken, options.fetchFn);

      if (waqiStation) {
        // Merge with 24-hr rolling forecast from Open-Meteo
        const openMeteoData = await fetchOpenMeteoAirQuality(
          location.latitude,
          location.longitude,
          location.timeZone,
          options
        ).catch(() => null);

        const report: AirQualityReport = {
          location: {
            name: `${location.formattedAddress} · Station: ${waqiStation.stationName}`,
            latitude: waqiStation.latitude,
            longitude: waqiStation.longitude,
            timeZone: location.timeZone,
          },
          current: waqiStation.current,
          hourlyForecast: openMeteoData?.hourlyForecast || [],
          cachedAt: new Date().toISOString(),
          dataSource: waqiStation.current.dataSource,
          attribution: waqiStation.current.attribution,
        };

        const parsedReport = AirQualityReportSchema.parse(syncFirstForecastHour(report));
        airQualityCache.set(cacheKey, parsedReport);
        return parsedReport;
      }
    } catch (waqiError) {
      logServerWarning(
        'AirQualityService',
        `WAQI lookup failed (${waqiError instanceof Error ? waqiError.message : 'Unknown error'}), falling back.`
      );
    }
  }

  // 2. If Google API key is configured, try Google as an optional upgrade
  if (googleApiKey) {
    try {
      const googleReport = syncFirstForecastHour(await fetchViaGoogle(place, googleApiKey, options));
      airQualityCache.set(cacheKey, googleReport);
      return googleReport;
    } catch (googleError) {
      logServerWarning(
        'AirQualityService',
        `Google API lookup failed (${googleError instanceof Error ? googleError.message : 'Unknown error'}), falling back to free Open-Meteo source.`
      );
    }
  }

  // 3. Free real-time Open-Meteo (default or fallback)
  const openMeteoReport = await fetchViaOpenMeteo(place, options);
  airQualityCache.set(cacheKey, openMeteoReport);
  return openMeteoReport;
}

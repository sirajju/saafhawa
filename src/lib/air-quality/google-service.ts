import {
  fetchCurrentConditions,
  fetchHourlyForecast,
  fetchTimeZone,
  geocodePlace,
  GeocodeLocationResult,
  ClientRequestOptions,
} from './google-client';
import { AirQualityReport, AirQualityReportSchema, HourlyForecastPoint } from './types';
import { extractPollutant, extractPrimaryIndex } from './index-extractor';

export interface GoogleServiceOptions extends ClientRequestOptions {
  forecastHours?: number;
}

/**
 * Fetches air quality report using Google Air Quality & Geocoding APIs (optional upgrade).
 */
export async function fetchViaGoogle(
  place: string,
  apiKey: string,
  options: GoogleServiceOptions = {}
): Promise<AirQualityReport> {
  const forecastHours = options.forecastHours ?? 24;
  const location: GeocodeLocationResult = await geocodePlace(place, apiKey, options);

  const currentConditionsPromise = fetchCurrentConditions(location.latitude, location.longitude, apiKey, options);
  const forecastPromise = fetchHourlyForecast(location.latitude, location.longitude, apiKey, forecastHours, options).catch(
    () => null
  );
  const timeZonePromise = fetchTimeZone(location.latitude, location.longitude, apiKey, options).catch(() => null);

  const [currentConditions, rawForecast, resolvedTimeZone] = await Promise.all([
    currentConditionsPromise,
    forecastPromise,
    timeZonePromise,
  ]);

  const timeZone = resolvedTimeZone || 'Asia/Kolkata';
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
      timeZone,
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
      dataSource: 'Google Air Quality',
      attribution: 'Air quality data provided by Google Air Quality API',
    },
    hourlyForecast,
    cachedAt: new Date().toISOString(),
    dataSource: 'Google Air Quality',
    attribution: 'Air quality data provided by Google Air Quality API',
  };

  return AirQualityReportSchema.parse(report);
}

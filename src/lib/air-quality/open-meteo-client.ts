import { calculateCpcbAqi } from './cpcb-aqi';
import { AirQualityError, CurrentAirQuality, HourlyForecastPoint, LocationNotFoundError } from './types';
import {
  OpenMeteoAirQualityResponse,
  OpenMeteoAirQualityResult,
  OpenMeteoGeocodingResponse,
  OpenMeteoLocationResult,
} from './open-meteo-types';
import { ClientRequestOptions, normalizeIndianCity, resolveIndianPincodeCandidates } from './pincode-resolver';
import { safeFetch } from './safe-fetch';
import { reverseGeocodeCoordinates } from './reverse-geocoder';

export * from './open-meteo-types';

const OPEN_METEO_GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * Free geocoding using Open-Meteo Geocoding API with Indian pincode and coordinate fallback.
 */
export async function geocodeOpenMeteoPlace(
  rawQuery: string,
  options: ClientRequestOptions = {}
): Promise<OpenMeteoLocationResult> {
  const query = rawQuery.trim();

  // 1. Coordinates check (e.g. "28.6139, 77.2090" or "Coordinates (11.2551°, 75.8287°)")
  const coordMatch = query.match(/^(?:Coordinates\s*\()?\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*,\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*\)?$/i);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lon = parseFloat(coordMatch[2]);
    if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      const rev = await reverseGeocodeCoordinates(lat, lon, options);
      return {
        formattedAddress: rev?.formattedAddress || `Coordinates (${lat.toFixed(4)}°, ${lon.toFixed(4)}°)`,
        latitude: lat,
        longitude: lon,
        timeZone: 'Asia/Kolkata',
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

    const response = await safeFetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } }, options);
    if (response.status === 429) {
      throw new AirQualityError('Free geocoding service rate limit reached. Please wait a moment and try again.', 429);
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

    const matched = results.find((r) => r.country_code?.toUpperCase() === 'IN') || (isPincode ? null : results[0]);
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
      `Could not resolve Indian pincode "${query}". Please enter a city or area name instead (e.g. "Connaught Place, New Delhi" or "Bandra, Mumbai").`
    );
  }

  throw new LocationNotFoundError(query);
}

/**
 * Fetches real-time air quality and 24-hr rolling forecast from Open-Meteo Air Quality API (Copernicus CAMS model).
 * The forecast starts at the current hour and runs 24 hours forward.
 */
export async function fetchOpenMeteoAirQuality(
  latitude: number,
  longitude: number,
  timeZone: string,
  options: ClientRequestOptions = {}
): Promise<OpenMeteoAirQualityResult> {
  const url = new URL(OPEN_METEO_AIR_QUALITY_URL);
  url.searchParams.set('latitude', latitude.toString());
  url.searchParams.set('longitude', longitude.toString());
  url.searchParams.set('current', 'pm2_5,pm10');
  url.searchParams.set('hourly', 'pm2_5,pm10');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', timeZone || 'Asia/Kolkata');

  const response = await safeFetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } }, options);
  if (response.status === 429) {
    throw new AirQualityError('Open-Meteo API rate limit reached. Please wait a moment and retry.', 429);
  }
  if (!response.ok) {
    throw new AirQualityError(`Open-Meteo Air Quality API returned HTTP status ${response.status}.`, 502);
  }

  let data: OpenMeteoAirQualityResponse;
  try {
    data = (await response.json()) as OpenMeteoAirQualityResponse;
  } catch {
    throw new AirQualityError('Invalid response received from Open-Meteo Air Quality service.', 502);
  }

  const currentData = data.current || {};
  const currentPm25 = typeof currentData.pm2_5 === 'number' ? currentData.pm2_5 : null;
  const currentPm10 = typeof currentData.pm10 === 'number' ? currentData.pm10 : null;
  const currentCpcb = calculateCpcbAqi(currentPm25, currentPm10);

  let currentDateTimeIso = new Date().toISOString();
  if (currentData.time) {
    const parsedTime = new Date(currentData.time);
    if (!isNaN(parsedTime.getTime())) currentDateTimeIso = parsedTime.toISOString();
  }

  const current: CurrentAirQuality = {
    dateTime: currentDateTimeIso,
    aqi: currentCpcb.aqi,
    category: currentCpcb.category,
    dominantPollutant: currentCpcb.dominantPollutant,
    indexCode: 'ind_cpcb',
    indexDisplayName: 'India National AQI (CPCB)',
    pm25: currentPm25 !== null ? { value: currentPm25, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    pm10: currentPm10 !== null ? { value: currentPm10, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    isSampleData: false,
    dataSource: 'Open-Meteo (CAMS model)',
    attribution: 'Air quality data provided by Open-Meteo under CC BY 4.0 (Copernicus CAMS model)',
  };

  const hourlyTimes = data.hourly?.time || [];
  const hourlyPm25List = data.hourly?.pm2_5 || [];
  const hourlyPm10List = data.hourly?.pm10 || [];

  // Start forecast at current hour and run 24 hours forward
  const nowMs = Date.now();
  let startIndex = 0;
  for (let i = 0; i < hourlyTimes.length; i++) {
    const ptMs = new Date(hourlyTimes[i]).getTime();
    if (!isNaN(ptMs) && ptMs >= nowMs - 30 * 60 * 1000) {
      startIndex = i;
      break;
    }
  }

  const hourlyForecast: HourlyForecastPoint[] = [];
  const endIndex = Math.min(startIndex + 24, hourlyTimes.length);

  for (let i = startIndex; i < endIndex; i++) {
    const rawTime = hourlyTimes[i];
    const pm25Val = typeof hourlyPm25List[i] === 'number' ? (hourlyPm25List[i] as number) : null;
    const pm10Val = typeof hourlyPm10List[i] === 'number' ? (hourlyPm10List[i] as number) : null;
    const pointCpcb = calculateCpcbAqi(pm25Val, pm10Val);

    const parsedPoint = new Date(rawTime);
    const pointIso = !isNaN(parsedPoint.getTime()) ? parsedPoint.toISOString() : rawTime;
    hourlyForecast.push({
      dateTime: pointIso,
      aqi: pointCpcb.aqi,
      category: pointCpcb.category,
      dominantPollutant: pointCpcb.dominantPollutant,
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: pm25Val !== null ? { value: pm25Val, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
      pm10: pm10Val !== null ? { value: pm10Val, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    });
  }

  return { current, hourlyForecast };
}

/* eslint-disable complexity, max-lines-per-function */
import { calculateCpcbAqi } from './cpcb-aqi';
import { parseDateTimeToIso, getTimeZoneOffsetSeconds } from './time-utils';
import { AirQualityError, type CurrentAirQuality, type HourlyForecastPoint } from './types';
import {
  type OpenMeteoAirQualityResponse,
  type OpenMeteoAirQualityResult,
} from './open-meteo-types';
import { type ClientRequestOptions } from './pincode-resolver';
import { safeFetch } from './safe-fetch';
import { logServerWarning } from '../logger';

export * from './open-meteo-types';
export { geocodeOpenMeteoPlace } from './open-meteo-geocoder';

const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

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
  const url = `${OPEN_METEO_AIR_QUALITY_URL}?latitude=${latitude}&longitude=${longitude}&current=pm2_5,pm10&hourly=pm2_5,pm10&forecast_days=3&timezone=${encodeURIComponent(timeZone || 'auto')}`;
  const response = await safeFetch(
    url,
    { method: 'GET', headers: { Accept: 'application/json' } },
    options
  );
  if (response.status === 429) {
    logServerWarning('OpenMeteoClient', 'Air quality provider rate limit reached (HTTP 429)');
    throw new AirQualityError(
      'Air quality service rate limit reached. Please wait a moment and retry.',
      429
    );
  }
  if (!response.ok) {
    logServerWarning(
      'OpenMeteoClient',
      `Air quality provider returned HTTP status ${response.status}`
    );
    throw new AirQualityError(
      'Air quality service temporarily unavailable. Please try again later.',
      502
    );
  }

  let data: OpenMeteoAirQualityResponse;
  try {
    data = (await response.json()) as OpenMeteoAirQualityResponse;
  } catch {
    logServerWarning('OpenMeteoClient', 'Failed to parse JSON response from air quality provider');
    throw new AirQualityError('Invalid response received from air quality service.', 502);
  }

  const effectiveOffsetSec =
    typeof data.utc_offset_seconds === 'number'
      ? data.utc_offset_seconds
      : getTimeZoneOffsetSeconds(timeZone);

  const currentData = data.current || {};
  const currentPm25 = typeof currentData.pm2_5 === 'number' ? currentData.pm2_5 : null;
  const currentPm10 = typeof currentData.pm10 === 'number' ? currentData.pm10 : null;
  const currentCpcb = calculateCpcbAqi(currentPm25, currentPm10);
  const currentDateTimeIso = currentData.time
    ? parseDateTimeToIso(currentData.time, effectiveOffsetSec)
    : new Date().toISOString();

  const current: CurrentAirQuality = {
    dateTime: currentDateTimeIso,
    aqi: currentCpcb.aqi,
    category: currentCpcb.category,
    dominantPollutant: currentCpcb.dominantPollutant,
    indexCode: 'ind_cpcb',
    indexDisplayName: 'AQI (hourly estimate, CPCB breakpoints)',
    pm25: currentPm25 !== null ? { value: currentPm25, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    pm10: currentPm10 !== null ? { value: currentPm10, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
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
    const ptIso = parseDateTimeToIso(hourlyTimes[i], effectiveOffsetSec);
    const ptMs = new Date(ptIso).getTime();
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
    const pointIso = parseDateTimeToIso(rawTime, effectiveOffsetSec);
    hourlyForecast.push({
      dateTime: pointIso,
      aqi: pointCpcb.aqi,
      category: pointCpcb.category,
      dominantPollutant: pointCpcb.dominantPollutant,
      indexCode: 'ind_cpcb',
      indexDisplayName: 'AQI (hourly estimate, CPCB breakpoints)',
      pm25: pm25Val !== null ? { value: pm25Val, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
      pm10: pm10Val !== null ? { value: pm10Val, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    });
  }

  return {
    current,
    hourlyForecast,
    timeZone: data.timezone || (timeZone && timeZone !== 'auto' ? timeZone : 'Asia/Kolkata'),
  };
}

import { calculateCpcbAqi } from './cpcb-aqi';
import { CurrentAirQuality, AirQualityError } from './types';
import { safeFetch } from './safe-fetch';

const WAQI_FEED_BASE_URL = 'https://api.waqi.info/feed';

export interface WaqiStationResult {
  current: CurrentAirQuality;
  stationName: string;
  latitude: number;
  longitude: number;
}

interface WaqiResponse {
  status: string;
  data?: {
    aqi?: number;
    idx?: number;
    city?: {
      name?: string;
      geo?: [number, number];
      url?: string;
    };
    dominentpol?: string;
    iaqi?: {
      pm25?: { v?: number };
      pm10?: { v?: number };
      no2?: { v?: number };
      so2?: { v?: number };
      o3?: { v?: number };
    };
    time?: {
      s?: string;
      tz?: string;
      v?: number;
      iso?: string;
    };
    attributions?: Array<{
      url?: string;
      name?: string;
    }>;
  };
}

/**
 * Fetches real-time telemetry from the nearest CPCB ground monitoring station via the WAQI API.
 * WAQI Terms: Non-commercial acceptable use; mandatory attribution to WAQI and CPCB monitoring agency.
 */
export async function fetchWaqiNearestStation(
  latitude: number,
  longitude: number,
  token = process.env.WAQI_TOKEN,
  fetchFn: typeof fetch = fetch,
  timeoutMs?: number
): Promise<WaqiStationResult | null> {
  if (!token || token.trim().length === 0) {
    return null;
  }

  const url = `${WAQI_FEED_BASE_URL}/geo:${latitude};${longitude}/?token=${encodeURIComponent(token.trim())}`;

  let response: Response;
  try {
    response = await safeFetch(
      url,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      { fetchFn, timeoutMs }
    );
  } catch (err: unknown) {
    if (err instanceof AirQualityError) throw err;
    throw new AirQualityError(
      `Unable to connect to WAQI ground station service: ${err instanceof Error ? err.message : 'Network error'}`,
      503
    );
  }

  if (response.status === 429) {
    throw new AirQualityError('WAQI API rate limit reached. Please wait a moment.', 429);
  }

  if (!response.ok) {
    throw new AirQualityError(`WAQI API returned HTTP status ${response.status}.`, 502);
  }

  let data: WaqiResponse;
  try {
    data = (await response.json()) as WaqiResponse;
  } catch {
    throw new AirQualityError('Invalid JSON from WAQI ground station service.', 502);
  }

  if (data.status !== 'ok' || !data.data) {
    return null;
  }

  const d = data.data;
  const pm25Val = typeof d.iaqi?.pm25?.v === 'number' ? d.iaqi.pm25.v : null;
  const pm10Val = typeof d.iaqi?.pm10?.v === 'number' ? d.iaqi.pm10.v : null;
  const stationName = d.city?.name || 'Nearest CPCB Station';

  const cpcb = calculateCpcbAqi(pm25Val, pm10Val);
  const aqiScore = typeof d.aqi === 'number' ? d.aqi : cpcb.aqi;

  const current: CurrentAirQuality = {
    dateTime: d.time?.iso || new Date().toISOString(),
    aqi: aqiScore,
    category: cpcb.category,
    dominantPollutant: d.dominentpol === 'pm25' || d.dominentpol === 'pm10' ? d.dominentpol : cpcb.dominantPollutant,
    indexCode: 'ind_cpcb',
    indexDisplayName: 'India National AQI (CPCB)',
    pm25: pm25Val !== null ? { value: pm25Val, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    pm10: pm10Val !== null ? { value: pm10Val, units: 'MICROGRAMS_PER_CUBIC_METER' } : null,
    isSampleData: false,
    dataSource: `CPCB Ground Station (${stationName})`,
    attribution: `Ground sensor data from ${stationName} via World Air Quality Index Project (waqi.info) under acceptable use terms`,
  };

  const stationGeo = d.city?.geo;
  const stationLat = Array.isArray(stationGeo) && stationGeo.length >= 2 ? stationGeo[0] : latitude;
  const stationLon = Array.isArray(stationGeo) && stationGeo.length >= 2 ? stationGeo[1] : longitude;

  return {
    current,
    stationName,
    latitude: stationLat,
    longitude: stationLon,
  };
}

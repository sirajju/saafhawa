import { CurrentAirQuality, HourlyForecastPoint } from './types';

export interface OpenMeteoLocationResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface OpenMeteoAirQualityResult {
  current: CurrentAirQuality;
  hourlyForecast: HourlyForecastPoint[];
}

export interface OpenMeteoGeocodingItem {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  feature_code?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  country?: string;
  timezone?: string;
}

export interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingItem[];
  generationtime_ms?: number;
}

export interface OpenMeteoAirQualityResponse {
  current?: {
    time?: string;
    pm2_5?: number | null;
    pm10?: number | null;
  };
  hourly?: {
    time?: string[];
    pm2_5?: (number | null)[];
    pm10?: (number | null)[];
  };
}

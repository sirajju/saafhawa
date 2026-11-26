import { AirQualityIndexSchema, PollutantItemSchema, PollutantMeasurement } from './types';
import { z } from 'zod';

export type AirQualityIndex = z.infer<typeof AirQualityIndexSchema>;
export type PollutantItem = z.infer<typeof PollutantItemSchema>;

export interface ExtractedIndex {
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

  const indCpcb = indexes.find((idx) => idx.code.toLowerCase() === 'ind_cpcb');
  if (indCpcb) {
    return {
      aqi: typeof indCpcb.aqi === 'number' ? indCpcb.aqi : null,
      category: indCpcb.category ?? null,
      dominantPollutant: indCpcb.dominantPollutant ?? null,
      indexCode: indCpcb.code,
      indexDisplayName: indCpcb.displayName ?? 'AQI (hourly estimate, CPCB breakpoints)',
    };
  }

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

  const first = indexes[0];
  return {
    aqi: typeof first.aqi === 'number' ? first.aqi : null,
    category: first.category ?? null,
    dominantPollutant: first.dominantPollutant ?? null,
    indexCode: first.code,
    indexDisplayName: first.displayName ?? first.code,
  };
}

export function extractPollutant(
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

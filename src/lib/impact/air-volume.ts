import { INHALATION_RATES_M3_PER_HOUR } from './exposure-factors';
import { AirQualityContext, HouseholdProfile } from './types';

/**
 * Calculates total volume of air inhaled by household occupants for a given activity and duration.
 */
export function calculateInhaledAirVolumeM3(
  profile: HouseholdProfile,
  activity: 'resting' | 'light' | 'exercise',
  durationHours: number
): number {
  if (durationHours <= 0) return 0;

  const adultRate =
    activity === 'exercise'
      ? INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE
      : activity === 'resting'
      ? INHALATION_RATES_M3_PER_HOUR.ADULT_RESTING
      : INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY;

  const childRate = INHALATION_RATES_M3_PER_HOUR.CHILD_DAILY_AVERAGE;
  const elderlyRate = INHALATION_RATES_M3_PER_HOUR.ELDERLY_DAILY_AVERAGE;

  const totalRatePerHr =
    profile.adultsCount * adultRate +
    profile.childrenCount * childRate +
    profile.elderlyCount * elderlyRate;

  return Number((totalRatePerHr * durationHours).toFixed(3));
}

/**
 * Extracts ambient diurnal parameters (current, peak, cleanest) from air quality context.
 * Returns null values when ambient PM2.5 is missing.
 */
export function extractAirQualityParameters(airQuality: AirQualityContext): {
  currentPm25: number | null;
  peakPm25: number | null;
  cleanestPm25: number | null;
} {
  if (airQuality.currentPm25 === null || airQuality.currentPm25 === undefined || isNaN(airQuality.currentPm25)) {
    return {
      currentPm25: null,
      peakPm25: null,
      cleanestPm25: null,
    };
  }

  const current = Math.max(0, airQuality.currentPm25);

  if (airQuality.hourlyForecast && airQuality.hourlyForecast.length > 0) {
    const validForecastValues = airQuality.hourlyForecast
      .map((p) => p.pm25?.value)
      .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v >= 0);

    if (validForecastValues.length > 0) {
      const min = Math.min(...validForecastValues);
      const max = Math.max(...validForecastValues);
      return {
        currentPm25: current,
        peakPm25: Math.max(current, max),
        cleanestPm25: Math.min(current, min),
      };
    }
  }

  // Fallback estimates based on typical diurnal boundary layer inversion
  return {
    currentPm25: current,
    peakPm25: Number((current * 1.3).toFixed(1)),
    cleanestPm25: Number((current * 0.7).toFixed(1)),
  };
}

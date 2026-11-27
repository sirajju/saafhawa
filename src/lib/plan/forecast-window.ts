import { type AirQualityReport } from '../air-quality/types';
import { type PlanRequest } from './types';
import { buildForecastAdvice } from '../air-quality/forecast-advice';

export function resolveForecastWindow(airQuality: AirQualityReport, profile: PlanRequest) {
  const forecastAdvice = buildForecastAdvice(
    airQuality.current.aqi,
    airQuality.hourlyForecast,
    profile,
    airQuality.location.timeZone
  );
  const cleanestWindowSpan =
    forecastAdvice.cleanestWindowStart && forecastAdvice.cleanestWindowEnd
      ? `${forecastAdvice.cleanestWindowStart} – ${forecastAdvice.cleanestWindowEnd}`
      : 'midday';

  const airQualityContext = {
    currentPm25: airQuality.current.pm25?.value ?? null,
    hourlyForecast: airQuality.hourlyForecast,
  };

  const aqiNum = airQuality.current.aqi;
  const maxForecast = airQuality.hourlyForecast?.length
    ? Math.max(
        ...airQuality.hourlyForecast.filter((p) => typeof p.aqi === 'number').map((p) => p.aqi!)
      )
    : aqiNum ?? 100;
  const isCleanAir = aqiNum !== null && aqiNum !== undefined && aqiNum <= 100 && maxForecast <= 100;

  return { cleanestWindowSpan, isCleanAir, airQualityContext };
}

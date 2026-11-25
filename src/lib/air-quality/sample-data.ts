import { AirQualityReport, HourlyForecastPoint } from './types';

/**
 * Realistic built-in sample air quality report for Delhi.
 * Used when no GOOGLE_MAPS_API_KEY is configured or when offline/demo mode is requested.
 */
export function getSampleDelhiAirQualityReport(placeQuery?: string): AirQualityReport {
  const now = new Date();
  const currentHour = now.getHours();

  // Generate 24 hours of realistic hourly forecast curve for Delhi winter
  // Pollution peaks in early morning (inversion) and dips around 2-3 PM
  const hourlyForecast: HourlyForecastPoint[] = Array.from({ length: 24 }, (_, i) => {
    const forecastTime = new Date(now.getTime() + (i + 1) * 3600 * 1000);
    const hour = (currentHour + i + 1) % 24;

    // Diurnal winter smog curve in Delhi
    let hourAqi = 340;
    if (hour >= 5 && hour <= 9) {
      hourAqi = 395; // Morning smog peak
    } else if (hour >= 13 && hour <= 16) {
      hourAqi = 265; // Afternoon solar dispersion window
    } else if (hour >= 20 || hour <= 2) {
      hourAqi = 370; // Night inversion accumulation
    } else {
      hourAqi = 320;
    }

    const pm25Value = Math.round((hourAqi * 0.55) * 10) / 10;
    const pm10Value = Math.round((pm25Value * 1.7) * 10) / 10;

    let category = 'Very Poor';
    if (hourAqi > 400) category = 'Severe';
    else if (hourAqi > 300) category = 'Very Poor';
    else if (hourAqi > 200) category = 'Poor';
    else if (hourAqi > 100) category = 'Moderate';
    else category = 'Satisfactory';

    return {
      dateTime: forecastTime.toISOString(),
      aqi: hourAqi,
      category,
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: {
        value: pm25Value,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
      pm10: {
        value: pm10Value,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
    };
  });

  const locationName = placeQuery && placeQuery.trim().length >= 2
    ? `${placeQuery.trim()} (Sample Data - New Delhi Reference)`
    : 'Connaught Place, New Delhi, Delhi 110001, India (Sample Data)';

  return {
    location: {
      name: locationName,
      latitude: 28.6315,
      longitude: 77.2167,
      timeZone: 'Asia/Kolkata',
    },
    current: {
      dateTime: now.toISOString(),
      aqi: 342,
      category: 'Very Poor',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: {
        value: 185.5,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
      pm10: {
        value: 320.0,
        units: 'MICROGRAMS_PER_CUBIC_METER',
      },
      isSampleData: true,
    },
    hourlyForecast,
    isSampleData: true,
  };
}

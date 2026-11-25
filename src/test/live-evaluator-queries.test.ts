import { describe, it, expect } from 'vitest';
import { getAirQualityByLocation } from '@/lib/air-quality/service';

describe('Real Live Requests for 5 Evaluator Cities (Without Google Key)', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  it('fetches real live air quality for all 5 evaluator cities via Open-Meteo default', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const places = [
      { city: 'Delhi', query: '110001' },
      { city: 'Mumbai', query: 'Mumbai' },
      { city: 'Kolkata', query: 'Kolkata' },
      { city: 'Lucknow', query: 'Lucknow' },
      { city: 'Bengaluru', query: 'Bengaluru' },
    ];

    const results = [];

    for (const p of places) {
      const report = await getAirQualityByLocation(p.query);

      expect(report.location.name).toBeTruthy();
      expect(report.current.dataSource).toBe('Open-Meteo (CAMS model)');
      expect(report.current.aqi).toBeGreaterThanOrEqual(0);
      expect(report.current.category).toBeTruthy();
      expect(report.current.pm25?.value).toBeGreaterThanOrEqual(0);
      expect(report.current.pm10?.value).toBeGreaterThanOrEqual(0);
      expect(report.hourlyForecast.length).toBeGreaterThan(0);
      expect(report.isSampleData).toBeFalsy();

      results.push({
        city: p.city,
        query: p.query,
        resolvedLocation: report.location.name,
        aqi: report.current.aqi,
        category: report.current.category,
        pm25: report.current.pm25?.value,
        pm10: report.current.pm10?.value,
        dominantPollutant: report.current.dominantPollutant,
        dataSource: report.current.dataSource,
        timeZone: report.location.timeZone,
        measuredTime: report.current.dateTime,
        forecastHoursCount: report.hourlyForecast.length,
      });
    }

    console.log('REAL LIVE QUERY RESULTS FOR 5 EVALUATOR CITIES:\n', JSON.stringify(results, null, 2));

    process.env.GOOGLE_MAPS_API_KEY = originalKey;
  }, 30000);
});

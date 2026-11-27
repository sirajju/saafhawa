import { describe, it, expect } from 'vitest';
import { getAirQualityByLocation } from '@/lib/air-quality/service';
import type { AirQualityReport } from '@/lib/air-quality/types';

describe('Live air quality for five Indian cities via Open-Meteo (no Google key)', () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  it('fetches real-time air quality for all five cities through the default Open-Meteo source', async () => {
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
      let report: AirQualityReport | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          report = await getAirQualityByLocation(p.query);
          break;
        } catch (err) {
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      if (!report) throw new Error(`Failed to fetch report for ${p.city}`);
      expect(report.location.name).toBeTruthy();
      expect(report.current.dataSource).toBe('Open-Meteo (CAMS model)');
      expect(report.current.aqi).toBeGreaterThanOrEqual(0);
      expect(report.current.category).toBeTruthy();
      expect(report.current.pm25?.value).toBeGreaterThanOrEqual(0);
      expect(report.current.pm10?.value).toBeGreaterThanOrEqual(0);
      expect(report.hourlyForecast.length).toBeGreaterThan(0);

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

    expect(results).toHaveLength(places.length);
    expect(new Set(results.map((r) => r.resolvedLocation)).size).toBe(places.length);

    process.env.GOOGLE_MAPS_API_KEY = originalKey;
  }, 30000);
});

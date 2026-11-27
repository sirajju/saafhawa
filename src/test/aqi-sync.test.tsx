import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForecastChart, type ForecastPoint } from '@/components/ForecastChart';
import { AirQualityCard } from '@/components/AirQualityCard';
import { type CurrentAirQuality, type CleanLocation } from '@/lib/air-quality/types';

describe('AQI Agreement between Big Number Headline and Forecast Chart', () => {
  const mockHourlyForecast: ForecastPoint[] = [
    { dateTime: '2026-11-25T10:00:00Z', aqi: 142, category: 'Moderate' },
    { dateTime: '2026-11-25T11:00:00Z', aqi: 148, category: 'Moderate' },
    { dateTime: '2026-11-25T12:00:00Z', aqi: 135, category: 'Moderate' },
    { dateTime: '2026-11-25T13:00:00Z', aqi: 120, category: 'Moderate' },
  ];

  it('synchronizes ForecastChart first bar, Current label, and Smog Peak with currentAqi (161)', () => {
    const { container } = render(
      <ForecastChart
        hourlyForecast={mockHourlyForecast}
        currentAqi={161}
        timeZone="Asia/Kolkata"
        cleanestWindowStart="1 PM"
        cleanestWindowEnd="4 PM"
      />
    );

    // Footer "Current:" label must show 161, not the raw forecast point 142
    expect(screen.getByText(/Current:/i)).toBeTruthy();
    expect(screen.getAllByText(/AQI 161/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/AQI 142/i)).toBeNull();

    // Since 161 is higher than 148, 135, 120, Smog Peak must report 161
    expect(screen.getByText(/Smog Peak:/i)).toBeTruthy();
    expect(screen.getByText(/\(AQI 161\)/i)).toBeTruthy();

    // Screen reader summary must report 161 for current hour
    const srElement = container.querySelector('.sr-only');
    expect(srElement?.textContent).toContain('Current hour is marked as Now with AQI 161');
    expect(srElement?.textContent).toContain('Peak smog is at');
    expect(srElement?.textContent).toContain('AQI 161');
  });

  it('ensures AirQualityCard headline and ForecastChart agree on 161', () => {
    const location: CleanLocation = {
      name: 'South Delhi',
      latitude: 28.5,
      longitude: 77.2,
      timeZone: 'Asia/Kolkata',
    };

    const current: CurrentAirQuality = {
      aqi: 161,
      category: 'Moderate',
      dominantPollutant: 'PM2.5',
      indexCode: 'cpcb_aqi',
      indexDisplayName: 'CPCB AQI',
      pm25: { value: 75, units: 'ug/m3' },
      pm10: { value: 120, units: 'ug/m3' },
      dataSource: 'World Air Quality Index (CPCB Station)',
      dateTime: '2026-11-25T10:00:00Z',
    };

    render(
      <AirQualityCard location={location} current={current} hourlyForecast={mockHourlyForecast} />
    );

    // Big headline shows 161
    expect(screen.getByText('161')).toBeTruthy();

    // Chart footer shows Current: AQI 161
    expect(screen.getByText(/Current:/i)).toBeTruthy();
    expect(screen.getAllByText(/AQI 161/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/AQI 142/i)).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { calculateCpcbAqi, getCpcbCategory } from '@/lib/air-quality/cpcb-aqi';

describe('Official CPCB Indian National AQI Calculator', () => {
  it('calculates Good AQI (0–50) correctly', () => {
    // PM2.5 = 15 (halfway in 0-30): Sub-index = 25
    // PM10 = 25 (halfway in 0-50): Sub-index = 25
    const result = calculateCpcbAqi(15, 25);
    expect(result.aqi).toBe(25);
    expect(result.category).toBe('Good');
    expect(result.dominantPollutant).toBe('pm25');
    expect(result.pm25SubIndex).toBe(25);
    expect(result.pm10SubIndex).toBe(25);
  });

  it('calculates Satisfactory AQI (51–100) correctly', () => {
    // PM2.5 = 45 µg/m³ in bracket (30, 60] -> AQI 76
    // PM10 = 75 µg/m³ in bracket (50, 100] -> AQI 76
    const result = calculateCpcbAqi(45, 75);
    expect(result.aqi).toBeGreaterThanOrEqual(75);
    expect(result.aqi).toBeLessThanOrEqual(76);
    expect(result.category).toBe('Satisfactory');
  });

  it('calculates Moderate AQI (101–200) with PM2.5 dominance', () => {
    // PM2.5 = 75 µg/m³ in (60, 90] -> AQI ~151
    // PM10 = 120 µg/m³ in (100, 250] -> AQI ~114
    const result = calculateCpcbAqi(75, 120);
    expect(result.aqi).toBe(151);
    expect(result.category).toBe('Moderate');
    expect(result.dominantPollutant).toBe('pm25');
  });

  it('calculates Poor AQI (201–300)', () => {
    // PM2.5 = 105 µg/m³ in (90, 120] -> AQI ~251
    const result = calculateCpcbAqi(105, 100);
    expect(result.aqi).toBe(251);
    expect(result.category).toBe('Poor');
    expect(result.dominantPollutant).toBe('pm25');
  });

  it('calculates Very Poor AQI (301–400)', () => {
    // PM2.5 = 185 µg/m³ in (120, 250] -> AQI ~351
    const result = calculateCpcbAqi(185, 200);
    expect(result.aqi).toBe(351);
    expect(result.category).toBe('Very Poor');
    expect(result.dominantPollutant).toBe('pm25');
  });

  it('calculates Severe AQI (401–500)', () => {
    // PM2.5 = 315 µg/m³ in (250, 380] -> AQI ~451
    const result = calculateCpcbAqi(315, 300);
    expect(result.aqi).toBe(451);
    expect(result.category).toBe('Severe');
    expect(result.dominantPollutant).toBe('pm25');
  });

  it('caps extreme concentrations (> 380 for PM2.5, > 510 for PM10) at 500', () => {
    const result = calculateCpcbAqi(600, 800);
    expect(result.aqi).toBe(500);
    expect(result.category).toBe('Severe');
    expect(result.pm25SubIndex).toBe(500);
    expect(result.pm10SubIndex).toBe(500);
  });

  it('handles PM10 dominant pollution when coarse dust exceeds fine particulates', () => {
    // PM2.5 = 20 µg/m³ -> AQI ~33 (Good)
    // PM10 = 280 µg/m³ in (250, 350] -> AQI ~231 (Poor)
    const result = calculateCpcbAqi(20, 280);
    expect(result.aqi).toBe(231);
    expect(result.category).toBe('Poor');
    expect(result.dominantPollutant).toBe('pm10');
  });

  it('computes AQI when only PM2.5 is available', () => {
    const result = calculateCpcbAqi(45, null);
    expect(result.aqi).toBe(76);
    expect(result.category).toBe('Satisfactory');
    expect(result.dominantPollutant).toBe('pm25');
    expect(result.pm10SubIndex).toBeNull();
  });

  it('computes AQI when only PM10 is available', () => {
    const result = calculateCpcbAqi(undefined, 80);
    expect(result.aqi).toBe(80);
    expect(result.category).toBe('Satisfactory');
    expect(result.dominantPollutant).toBe('pm10');
    expect(result.pm25SubIndex).toBeNull();
  });

  it('returns clean null result when no valid pollutant concentration is provided', () => {
    const result = calculateCpcbAqi(null, null);
    expect(result.aqi).toBeNull();
    expect(result.category).toBeNull();
    expect(result.dominantPollutant).toBeNull();
    expect(result.pm25SubIndex).toBeNull();
    expect(result.pm10SubIndex).toBeNull();
  });

  it('correctly maps all CPCB numeric thresholds to categories', () => {
    expect(getCpcbCategory(0)).toBe('Good');
    expect(getCpcbCategory(50)).toBe('Good');
    expect(getCpcbCategory(51)).toBe('Satisfactory');
    expect(getCpcbCategory(100)).toBe('Satisfactory');
    expect(getCpcbCategory(101)).toBe('Moderate');
    expect(getCpcbCategory(200)).toBe('Moderate');
    expect(getCpcbCategory(201)).toBe('Poor');
    expect(getCpcbCategory(300)).toBe('Poor');
    expect(getCpcbCategory(301)).toBe('Very Poor');
    expect(getCpcbCategory(400)).toBe('Very Poor');
    expect(getCpcbCategory(401)).toBe('Severe');
    expect(getCpcbCategory(500)).toBe('Severe');
    expect(getCpcbCategory(null)).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { buildForecastAdvice, ForecastAdvicePoint } from '@/lib/air-quality/forecast-advice';

// Generate 48 hours of synthetic points starting from 2026-11-25T00:00:00Z
function generateSynthetic48HourForecast(): ForecastAdvicePoint[] {
  const points: ForecastAdvicePoint[] = [];
  const baseTime = new Date('2026-11-25T00:00:00+05:30').getTime();

  for (let i = 0; i < 48; i++) {
    const ptDate = new Date(baseTime + i * 3600 * 1000);
    const hour = ptDate.getHours();
    // Diurnal cycle: morning peak (8-10 AM) is 350 AQI, afternoon (1-4 PM) is 120 AQI, night is 280 AQI
    let aqi = 250;
    if (hour >= 7 && hour <= 10) aqi = 360;
    else if (hour >= 13 && hour <= 16) aqi = 110;
    else if (hour >= 20 || hour <= 5) aqi = 290;

    points.push({
      dateTime: ptDate.toISOString(),
      aqi,
      category: aqi > 300 ? 'Very Poor' : aqi > 200 ? 'Poor' : 'Moderate',
    });
  }

  return points;
}

describe('Forecast Advice - Future Waking Hours & Fixed Clock Tests', () => {
  const points = generateSynthetic48HourForecast();
  const timeZone = 'Asia/Kolkata';

  it('picks afternoon cleanest window today when clock is at 8:00 AM (Morning)', () => {
    // 8 AM IST on Nov 25, 2026
    const fixedClock = new Date('2026-11-25T08:00:00+05:30');
    const result = buildForecastAdvice(
      340,
      points,
      { childrenCount: 2, hasAsthmaOrRespiratoryCondition: true },
      timeZone,
      fixedClock
    );

    expect(result.isTomorrow).toBe(false);
    expect(result.cleanestWindowText).toContain('1 PM to 4 PM');
    expect(result.plainAdvice).toContain('Keep members with respiratory sensitivity indoors until 1 PM.');
    expect(result.plainAdvice).toContain('Cleanest window today: 1 PM to 4 PM.');
  });

  it('starts at current hour and does NOT refer to past morning hours when clock is at 1:00 PM (Afternoon)', () => {
    // 1 PM IST on Nov 25, 2026
    const fixedClock = new Date('2026-11-25T13:00:00+05:30');
    const result = buildForecastAdvice(
      150,
      points,
      { childrenCount: 1 },
      timeZone,
      fixedClock
    );

    expect(result.isTomorrow).toBe(false);
    // Must NOT say 4 AM or past morning hours!
    expect(result.plainAdvice).not.toContain('4 AM');
    expect(result.cleanestWindowText).toContain('1 PM to 4 PM');
    expect(result.plainAdvice).toContain('Cleanest window today:');
  });

  it('selects tomorrow cleanest waking window when clock is at 8:30 PM (Evening)', () => {
    // 8:30 PM IST on Nov 25, 2026
    const fixedClock = new Date('2026-11-25T20:30:00+05:30');
    const result = buildForecastAdvice(
      280,
      points,
      { childrenCount: 1, elderlyCount: 1 },
      timeZone,
      fixedClock
    );

    expect(result.isTomorrow).toBe(true);
    expect(result.cleanestWindowText).toContain('tomorrow');
    expect(result.plainAdvice).toContain('indoors tonight.');
    expect(result.plainAdvice).toContain('Cleanest window: tomorrow');
  });

  it('selects tomorrow cleanest waking window when clock is at 11:00 PM (Late Night)', () => {
    // 11 PM IST on Nov 25, 2026
    const fixedClock = new Date('2026-11-25T23:00:00+05:30');
    const result = buildForecastAdvice(
      310,
      points,
      { doesOutdoorExercise: true },
      timeZone,
      fixedClock
    );

    expect(result.isTomorrow).toBe(true);
    expect(result.cleanestWindowStart).toContain('tomorrow');
    expect(result.plainAdvice).toContain('Cleanest window: tomorrow');
    expect(result.plainAdvice).not.toContain('Cleanest window today');
  });
});

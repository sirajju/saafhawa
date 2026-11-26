import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { parseDateTimeToIso, formatMeasurementTime } from '@/lib/air-quality/time-utils';
import { fetchOpenMeteoAirQuality } from '@/lib/air-quality/open-meteo-client';
import { formatHourInPlaceLocalTime, executeGetAirQualityTool } from '@/lib/chat/tools';
import { generateTemplateAdvisory } from '@/lib/community/advisory-templates';
import { generateFallbackChatResponse } from '@/lib/chat/fallback';
import { ChatHeader } from '@/components/ChatHeader';
import { AirQualityReport } from '@/lib/air-quality/types';

describe('Measurement Time Parsing & Formatting in UTC Runtime Environment', () => {
  const origTz = process.env.TZ;

  beforeEach(() => {
    // Set process timezone to UTC to mirror Vercel production server environment
    process.env.TZ = 'UTC';
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T17:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    if (origTz !== undefined) {
      process.env.TZ = origTz;
    } else {
      delete process.env.TZ;
    }
  });

  it('anchors Open-Meteo local time to true UTC ISO instead of treating local time as UTC', () => {
    // Open-Meteo returns local time 23:00 (11:00 PM IST) with utc_offset_seconds = 19800 (+5:30)
    const rawLocalTime = '2026-11-25T23:00';
    const offsetSec = 19800;

    const iso = parseDateTimeToIso(rawLocalTime, offsetSec);
    // 23:00 IST is 17:30 UTC
    expect(iso).toBe('2026-11-25T17:30:00.000Z');

    // Formatting in Asia/Kolkata must show 11:00 pm, NEVER 4:30 am
    const formatted = formatMeasurementTime(iso, 'Asia/Kolkata');
    expect(formatted.toLowerCase()).toMatch(/11:00\s*pm/);
    expect(formatted.toLowerCase()).not.toContain('4:30');
    expect(formatted.toLowerCase()).not.toContain('4:00');
  });

  it('correctly handles raw local time string without offset by applying target timezone', () => {
    const rawLocalTime = '2026-11-25T22:30';
    const formatted = formatMeasurementTime(rawLocalTime, 'Asia/Kolkata');
    expect(formatted.toLowerCase()).toMatch(/10:30\s*pm/);
    expect(formatted.toLowerCase()).not.toContain('4:00');
  });

  it('fetchOpenMeteoAirQuality converts local time and hourly forecast to proper UTC ISO on UTC server', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        utc_offset_seconds: 19800,
        timezone: 'Asia/Kolkata',
        current: { time: '2026-11-25T23:00', pm2_5: 180, pm10: 250 },
        hourly: {
          time: ['2026-11-25T23:00', '2026-11-26T00:00'],
          pm2_5: [180, 170],
          pm10: [250, 240],
        },
      }),
    });

    const result = await fetchOpenMeteoAirQuality(28.6139, 77.209, 'Asia/Kolkata', {
      fetchFn: mockFetch as unknown as typeof fetch,
    });

    // 23:00 IST = 17:30 UTC
    expect(result.current.dateTime).toBe('2026-11-25T17:30:00.000Z');
    expect(formatMeasurementTime(result.current.dateTime, 'Asia/Kolkata')).toMatch(/11:00\s*pm/i);

    // Hourly point 0: 23:00 IST = 17:30 UTC -> 11 PM
    expect(result.hourlyForecast[0].dateTime).toBe('2026-11-25T17:30:00.000Z');
    expect(formatHourInPlaceLocalTime(result.hourlyForecast[0].dateTime, 'Asia/Kolkata')).toMatch(/11\s*PM/);

    // Hourly point 1: 00:00 IST = 18:30 UTC -> 12 AM
    expect(result.hourlyForecast[1].dateTime).toBe('2026-11-25T18:30:00.000Z');
    expect(formatHourInPlaceLocalTime(result.hourlyForecast[1].dateTime, 'Asia/Kolkata')).toMatch(/12\s*AM/);
  });

  it('displays real 11 PM local measurement time in ChatHeader and AirQualityCard', () => {
    const dateTimeIso = '2026-11-25T17:30:00.000Z'; // 11:00 PM IST

    render(
      <ChatHeader
        place="New Delhi"
        measuredTime={dateTimeIso}
        timeZone="Asia/Kolkata"
        dataSource="Open-Meteo (CAMS model)"
      />
    );

    const chatTimeEl = screen.getByText(/Measured at:/i);
    expect(chatTimeEl.textContent?.toLowerCase()).toMatch(/11:00\s*pm/);
    expect(chatTimeEl.textContent?.toLowerCase()).not.toContain('4:00');
    expect(chatTimeEl.textContent?.toLowerCase()).not.toContain('4:30');
  });

  it('formats real 11 PM local measurement time in WhatsApp advisory and Chat answers', async () => {
    const mockReport: AirQualityReport = {
      location: {
        name: 'Connaught Place, New Delhi',
        latitude: 28.6139,
        longitude: 77.209,
        timeZone: 'Asia/Kolkata',
      },
      current: {
        dateTime: '2026-11-25T17:30:00.000Z', // 11:00 PM IST
        aqi: 320,
        category: 'Very Poor',
        dominantPollutant: 'pm25',
        indexCode: 'ind_cpcb',
        indexDisplayName: 'India National AQI (CPCB)',
        pm25: { value: 165, units: 'ug/m3' },
        pm10: { value: 280, units: 'ug/m3' },
        dataSource: 'Open-Meteo (CAMS model)',
      },
      hourlyForecast: [],
    };

    // 1. WhatsApp English advisory
    const enAdv = generateTemplateAdvisory(mockReport, 'housing_society', 'en');
    expect(enAdv.advisoryText.toLowerCase()).toMatch(/measured:\s*11:00\s*pm/);
    expect(enAdv.advisoryText.toLowerCase()).not.toContain('4:00 am');

    // 2. WhatsApp Hindi advisory
    const hiAdv = generateTemplateAdvisory(mockReport, 'housing_society', 'hi');
    expect(hiAdv.advisoryText.toLowerCase()).toMatch(/मापा गया समय:\s*11:00\s*pm/);
    expect(hiAdv.advisoryText.toLowerCase()).not.toContain('4:00 am');

    // 3. Fallback Chat answer
    const chatFallback = await generateFallbackChatResponse(
      { message: 'What is the air quality right now?', place: 'New Delhi', conversationHistory: [] },
      async () => mockReport
    );
    expect(chatFallback.reply.toLowerCase()).toMatch(/measured at:\s*11:00\s*pm/);
    expect(chatFallback.reply.toLowerCase()).not.toContain('4:00 am');

    // 4. Chat tool execution
    const toolResult = await executeGetAirQualityTool({}, 'New Delhi', async () => mockReport);
    expect(toolResult.measuredAtLocalTime?.toLowerCase()).toMatch(/11:00\s*pm/);
  });
});

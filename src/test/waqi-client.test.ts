import { describe, it, expect, vi } from 'vitest';
import { fetchWaqiNearestStation } from '@/lib/air-quality/waqi-client';

describe('WAQI Client - CPCB Ground Station & Fallback', () => {
  it('returns null if WAQI_TOKEN is not provided', async () => {
    const result = await fetchWaqiNearestStation(28.6139, 77.209, undefined);
    expect(result).toBeNull();
  });

  it('parses valid CPCB station data and computes CPCB index with station name', async () => {
    const mockResponse = {
      status: 'ok',
      data: {
        aqi: 245,
        idx: 8452,
        city: {
          name: 'Anand Vihar, Delhi, India',
          geo: [28.6502, 77.3027],
        },
        dominentpol: 'pm25',
        iaqi: {
          pm25: { v: 125.4 },
          pm10: { v: 240.2 },
        },
        time: {
          iso: '2026-11-25T13:00:00+05:30',
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await fetchWaqiNearestStation(
      28.6139,
      77.209,
      'valid-token',
      mockFetch as unknown as typeof fetch
    );

    expect(result).not.toBeNull();
    expect(result?.stationName).toBe('Anand Vihar, Delhi, India');
    expect(result?.current.dataSource).toContain('Anand Vihar, Delhi, India');
    expect(result?.current.pm25?.value).toBe(125.4);
    expect(result?.current.pm10?.value).toBe(240.2);
    expect(result?.current.aqi).toBe(245);
    expect(result?.current.category).toBe('Very Poor');
  });

  it('returns null when WAQI status is error (e.g. invalid token)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'error', data: 'Unknown station' }),
    });

    const result = await fetchWaqiNearestStation(
      28.6139,
      77.209,
      'bad-token',
      mockFetch as unknown as typeof fetch
    );
    expect(result).toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/reverse-geocode/route';
import * as reverseGeocoder from '@/lib/air-quality/reverse-geocoder';
import * as logger from '@/lib/logger';

describe('GET /api/reverse-geocode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when lat or lon parameter is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=12.9716');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing coordinates');
  });

  it('returns 400 when coordinates are out of bounds', async () => {
    const req = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=95&lon=77.5946');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid coordinates');
  });

  it('returns 400 when coordinates contain alphanumeric characters like "12abc"', async () => {
    const req = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=12abc&lon=77.5946');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid coordinates');
  });

  it('returns 400 when coordinates exceed 40 characters in length', async () => {
    const longParam = '12.' + '9'.repeat(45);
    const req = new NextRequest(
      `http://localhost:3000/api/reverse-geocode?lat=${longParam}&lon=77.5946`
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid coordinates');
  });

  it('returns 200 with formatted address when coordinates are valid', async () => {
    vi.spyOn(reverseGeocoder, 'reverseGeocodeCoordinates').mockResolvedValueOnce({
      formattedAddress: 'Kozhikode, Kerala',
      city: 'Kozhikode',
      state: 'Kerala',
      country: 'India',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/reverse-geocode?lat=11.2551&lon=75.8287'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.formattedAddress).toBe('Kozhikode, Kerala');
  });

  it('returns 200 with formattedAddress: null and logs error when lookup throws', async () => {
    const logSpy = vi.spyOn(logger, 'logServerError').mockImplementation(() => {});
    vi.spyOn(reverseGeocoder, 'reverseGeocodeCoordinates').mockRejectedValueOnce(
      new Error('Network failure')
    );

    const req = new NextRequest('http://localhost:3000/api/reverse-geocode?lat=11.25&lon=75.82');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.formattedAddress).toBeNull();
    expect(logSpy).toHaveBeenCalledWith('API:reverse-geocode', expect.any(Error));
  });
});

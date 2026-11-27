import { describe, it, expect, vi, afterEach } from 'vitest';
import { reverseGeocodeCoordinates } from '@/lib/air-quality/reverse-geocoder';
import { geocodeOpenMeteoPlace } from '@/lib/air-quality/open-meteo-client';

const nominatimKozhikode = {
  address: { city: 'Kozhikode', state: 'Kerala', country: 'India', suburb: 'Mananchira' },
};

describe('Reverse Geocoder Resolution', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reverse-geocodes coordinates (11.2551, 75.8287) to Kozhikode, Kerala', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(nominatimKozhikode), { status: 200 }));

    const rev = await reverseGeocodeCoordinates(11.2551, 75.8287);
    expect(rev?.formattedAddress).toBe('Kozhikode, Kerala');
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('nominatim.openstreetmap.org/reverse');

    const geo = await geocodeOpenMeteoPlace('11.2551, 75.8287');
    expect(geo.formattedAddress).toBe('Kozhikode, Kerala');
  });
});

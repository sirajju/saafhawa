import { describe, it, expect } from 'vitest';
import { reverseGeocodeCoordinates } from '@/lib/air-quality/reverse-geocoder';
import { geocodeOpenMeteoPlace } from '@/lib/air-quality/open-meteo-client';

describe('Reverse Geocoder Resolution', () => {
  it('reverse-geocodes coordinates (11.2551, 75.8287) to Kozhikode, Kerala', async () => {
    const rev = await reverseGeocodeCoordinates(11.2551, 75.8287);
    expect(rev?.formattedAddress).toBe('Kozhikode, Kerala');

    const geo = await geocodeOpenMeteoPlace('11.2551, 75.8287');
    expect(geo.formattedAddress).toBe('Kozhikode, Kerala');
  });
});

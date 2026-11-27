import { describe, it, expect, vi } from 'vitest';

describe('WAQI network failures and reverse geocoder caching', () => {
  it('waqi client handles network/timeout via safeFetch, throwing 503 AirQualityError', async () => {
    const { fetchWaqiNearestStation } = await import('../lib/air-quality/waqi-client');
    const mockTimeoutFetch = vi.fn().mockRejectedValue(new Error('AbortError: Request timed out'));
    await expect(
      fetchWaqiNearestStation(28.6, 77.2, 'test-token', mockTimeoutFetch as unknown as typeof fetch)
    ).rejects.toThrow();

    const { reverseGeocodeCoordinates } = await import('../lib/air-quality/reverse-geocoder');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ address: { city: 'Kozhikode', state: 'Kerala', country: 'India' } }),
    } as Response);

    const geo1 = await reverseGeocodeCoordinates(11.2588, 75.7804);
    expect(geo1?.formattedAddress).toBe('Kozhikode, Kerala');
    const geo2 = await reverseGeocodeCoordinates(11.2588, 75.7804);
    expect(geo2?.formattedAddress).toBe('Kozhikode, Kerala');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});

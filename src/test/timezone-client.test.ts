import { describe, it, expect, vi } from 'vitest';
import { fetchTimeZone } from '@/lib/air-quality/timezone-client';

describe('Google Maps Timezone Client', () => {
  it('returns valid IANA timeZoneId when Google API responds with status OK', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ status: 'OK', timeZoneId: 'Asia/Kolkata' }), { status: 200 })
      );

    const tz = await fetchTimeZone(28.6139, 77.209, 'test-key', { fetchFn: mockFetch });
    expect(tz).toBe('Asia/Kolkata');
  });

  it('returns null when API response status is not OK', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'ZERO_RESULTS' }), { status: 200 }));

    const tz = await fetchTimeZone(0, 0, 'test-key', { fetchFn: mockFetch });
    expect(tz).toBeNull();
  });

  it('returns null on HTTP error response', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('Server Error', { status: 500 }));

    const tz = await fetchTimeZone(28.6139, 77.209, 'test-key', { fetchFn: mockFetch });
    expect(tz).toBeNull();
  });

  it('returns null gracefully on network or safeFetch failure', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const tz = await fetchTimeZone(28.6139, 77.209, 'test-key', { fetchFn: mockFetch });
    expect(tz).toBeNull();
  });
});

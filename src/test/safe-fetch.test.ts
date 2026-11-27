import { describe, it, expect, vi } from 'vitest';
import { safeFetch } from '@/lib/air-quality/safe-fetch';
import { ProviderUnavailableError } from '@/lib/air-quality/types';

describe('safeFetch Utility', () => {
  it('returns response successfully on normal HTTP fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }));
    const res = await safeFetch(
      'https://example.com/api',
      { method: 'GET' },
      { fetchFn: mockFetch }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('throws ProviderUnavailableError with timeout message when fetch aborts or times out', async () => {
    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'AbortError';
    const mockFetch = vi.fn().mockRejectedValue(timeoutError);

    await expect(
      safeFetch(
        'https://example.com/api',
        { method: 'GET' },
        { fetchFn: mockFetch, timeoutMs: 100 }
      )
    ).rejects.toThrow(ProviderUnavailableError);
  });

  it('translates generic network failures into ProviderUnavailableError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      safeFetch('https://example.com/api', { method: 'GET' }, { fetchFn: mockFetch })
    ).rejects.toThrow('Unable to connect to air quality provider. Please check your connection.');
  });
});

import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config';
import { SECURITY_HEADERS_LIST, SECURITY_HEADERS } from '@/lib/security';
import { getClientIp, RateLimiter } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';

describe('Security - Configuration & Header Realization', () => {
  it('disables X-Powered-By in Next.js config', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it('configures security headers matching SECURITY_HEADERS_LIST on all routes', async () => {
    expect(typeof nextConfig.headers).toBe('function');
    if (nextConfig.headers) {
      const headerRules = await nextConfig.headers();
      expect(headerRules.length).toBeGreaterThan(0);
      expect(headerRules[0].source).toBe('/(.*)');
      expect(headerRules[0].headers).toEqual(SECURITY_HEADERS_LIST);
    }
  });

  it('strictly excludes unsafe-eval from Content-Security-Policy', () => {
    const csp = SECURITY_HEADERS['Content-Security-Policy'];
    expect(csp).toBeDefined();
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('maps.googleapis.com');
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('defines cross-origin policies and strict referrer without COEP', () => {
    expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Resource-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['X-Permitted-Cross-Domain-Policies']).toBe('none');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(SECURITY_HEADERS['X-DNS-Prefetch-Control']).toBe('off');
    expect(SECURITY_HEADERS['Cross-Origin-Embedder-Policy']).toBeUndefined();
  });
});

describe('Security - Rate Limiter Cloud Run IP & Map Capping', () => {
  it('trusts the rightmost IP in x-forwarded-for as appended by Cloud Run GFE', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.55',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.55');
  });

  it('handles single IP in x-forwarded-for', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': '203.0.113.77',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('203.0.113.77');
  });

  it('strips port suffix from IPv4 address in header', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': '198.51.100.99:443',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('198.51.100.99');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-real-ip': '192.0.2.1',
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe('192.0.2.1');
  });

  it('caps internal rate limit map to maxKeys to prevent memory exhaustion', () => {
    const limiter = new RateLimiter(5, 60, 10);

    // Insert 15 unique IPs
    for (let i = 0; i < 15; i++) {
      limiter.check(`10.0.0.${i}`);
    }

    // Size should not exceed maxKeys
    expect(limiter.size).toBeLessThanOrEqual(10);
  });

  it('prunes expired entries during rate limit checks', () => {
    const limiter = new RateLimiter(5, 0.02, 100); // 20ms short window

    limiter.check('10.1.1.1');
    expect(limiter.size).toBe(1);

    // Wait for window to expire
    const start = Date.now();
    while (Date.now() - start < 30) {
      // spin wait 30ms
    }

    // Checking another key should prune the expired one
    limiter.check('10.2.2.2');
    expect(limiter.size).toBe(1);
  });
});

import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getClientIp,
  getTrustedProxyHops,
  DEFAULT_TRUSTED_PROXY_HOPS,
  SHARED_UNTRUSTED_KEY,
  SlidingWindowRateLimiter,
} from '@/lib/rate-limit';

describe('Rate Limiting - Trusted Proxy Hops & Safe Untrusted Fallback', () => {
  const originalEnv = process.env.TRUSTED_PROXY_HOPS;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TRUSTED_PROXY_HOPS = originalEnv;
    } else {
      delete process.env.TRUSTED_PROXY_HOPS;
    }
  });

  it('defaults to 1 trusted proxy hop for direct Cloud Run ingress', () => {
    delete process.env.TRUSTED_PROXY_HOPS;
    expect(getTrustedProxyHops()).toBe(DEFAULT_TRUSTED_PROXY_HOPS);
    expect(getTrustedProxyHops()).toBe(1);
  });

  it('correctly parses TRUSTED_PROXY_HOPS environment variable', () => {
    process.env.TRUSTED_PROXY_HOPS = '2';
    expect(getTrustedProxyHops()).toBe(2);

    process.env.TRUSTED_PROXY_HOPS = 'unknown';
    expect(getTrustedProxyHops()).toBe(0);

    process.env.TRUSTED_PROXY_HOPS = '0';
    expect(getTrustedProxyHops()).toBe(0);
  });

  it('extracts verified client IP as the last entry for Cloud Run direct ingress (hops = 1)', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': '192.0.2.1, 198.51.100.25, 203.0.113.195',
      },
    });

    const ip = getClientIp(req, 1);
    expect(ip).toBe('203.0.113.195');
  });

  it('extracts client IP 2nd from the right when behind GCP Load Balancer (hops = 2)', () => {
    // GCP ALB appends CLIENT_IP, LOAD_BALANCER_IP
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': 'client-spoofed.1.2.3, 203.0.113.195, 130.211.0.1',
      },
    });

    const ip = getClientIp(req, 2);
    expect(ip).toBe('203.0.113.195');
  });

  it('falls back to SHARED_UNTRUSTED_KEY when setup is unknown or TRUSTED_PROXY_HOPS is 0', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': '203.0.113.195',
      },
    });

    // When hops is 0 / unknown, headers cannot be trusted
    const ip = getClientIp(req, 0);
    expect(ip).toBe(SHARED_UNTRUSTED_KEY);
  });

  it('falls back to SHARED_UNTRUSTED_KEY when app runs without a proxy in front of it', () => {
    // Request has no proxy headers
    const req = new NextRequest('http://localhost:3000/api/plan');
    const ip = getClientIp(req);
    expect(ip).toBe(SHARED_UNTRUSTED_KEY);
  });

  it('falls back to SHARED_UNTRUSTED_KEY if X-Forwarded-For has fewer entries than trusted hops', () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      headers: {
        'x-forwarded-for': '198.51.100.25',
      },
    });

    // Configured for 2 hops (e.g. Load Balancer) but only 1 hop is present in chain
    const ip = getClientIp(req, 2);
    expect(ip).toBe(SHARED_UNTRUSTED_KEY);
  });

  it('enforces shared rate limit against SHARED_UNTRUSTED_KEY to prevent header spoofing DoS', () => {
    const limiter = new SlidingWindowRateLimiter(5, 60);

    // Multiple unproxied or unknown clients share the single limit
    for (let i = 0; i < 5; i++) {
      const check = limiter.check(SHARED_UNTRUSTED_KEY);
      expect(check.success).toBe(true);
    }

    const exhausted = limiter.check(SHARED_UNTRUSTED_KEY);
    expect(exhausted.success).toBe(false);
    expect(exhausted.remaining).toBe(0);
  });
});

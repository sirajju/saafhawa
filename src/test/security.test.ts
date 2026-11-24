import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  MAX_REQUEST_BODY_BYTES,
  SECURITY_HEADERS,
  readJsonBodyWithLimit,
} from '@/lib/security';
import {
  airQualityRateLimiter,
  planRateLimiter,
  chatRateLimiter,
  advisoryRateLimiter,
} from '@/lib/rate-limit';
import { GET as airQualityHandler } from '@/app/api/air-quality/route';
import { POST as planHandler } from '@/app/api/plan/route';
import { POST as chatHandler } from '@/app/api/chat/route';
import { POST as advisoryHandler } from '@/app/api/community-advisory/route';

describe('Security - Request Body Size Limiting', () => {
  it('accepts valid JSON payload within size limit', async () => {
    const payload = { place: '110001', test: 'safe' };
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await readJsonBodyWithLimit(req);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(payload);
  });

  it('rejects oversized requests based on Content-Length header with 413', async () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'content-length': String(MAX_REQUEST_BODY_BYTES + 1000),
      },
      body: JSON.stringify({ place: '110001' }),
    });

    const result = await readJsonBodyWithLimit(req);
    expect(result.error).toBeDefined();
    expect(result.error?.status).toBe(413);

    const json = await result.error?.json();
    expect(json.error).toBe('Payload Too Large');
  });

  it('rejects actual payload exceeding 64KB with 413', async () => {
    const hugeString = 'x'.repeat(MAX_REQUEST_BODY_BYTES + 500);
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place: hugeString }),
    });

    const result = await readJsonBodyWithLimit(req);
    expect(result.error).toBeDefined();
    expect(result.error?.status).toBe(413);

    const json = await result.error?.json();
    expect(json.error).toBe('Payload Too Large');
  });

  it('rejects malformed JSON with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json-{broken',
    });

    const result = await readJsonBodyWithLimit(req);
    expect(result.error).toBeDefined();
    expect(result.error?.status).toBe(400);

    const json = await result.error?.json();
    expect(json.error).toBe('Invalid JSON Body');
  });

  it('rejects empty payload with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '',
    });

    const result = await readJsonBodyWithLimit(req);
    expect(result.error).toBeDefined();
    expect(result.error?.status).toBe(400);
  });
});

describe('Security - Mandatory Security Headers', () => {
  it('defines comprehensive security headers including CSP, HSTS, X-Frame and nosniff', () => {
    expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'");
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=');
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('origin-when-cross-origin');
    expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
  });
});

describe('Security - Route Level Rate Limiting Enforcement', () => {
  beforeEach(() => {
    airQualityRateLimiter.reset();
    planRateLimiter.reset();
    chatRateLimiter.reset();
    advisoryRateLimiter.reset();
  });

  it('enforces 429 rate limit on GET /api/air-quality', async () => {
    const testIp = '198.51.100.50';
    // Exhaust quota (limit is 60)
    for (let i = 0; i < 60; i++) {
      airQualityRateLimiter.check(testIp);
    }

    const req = new NextRequest('http://localhost:3000/api/air-quality?place=110001', {
      headers: { 'x-real-ip': testIp },
    });

    const res = await airQualityHandler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();

    const data = await res.json();
    expect(data.error).toBe('Too Many Requests');
  });

  it('enforces 429 rate limit on POST /api/plan', async () => {
    const testIp = '198.51.100.51';
    for (let i = 0; i < 30; i++) {
      planRateLimiter.check(testIp);
    }

    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: {
        'x-real-ip': testIp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ place: '110001' }),
    });

    const res = await planHandler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('enforces 429 rate limit on POST /api/chat', async () => {
    const testIp = '198.51.100.52';
    for (let i = 0; i < 15; i++) {
      chatRateLimiter.check(testIp);
    }

    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'x-real-ip': testIp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'Hello' }),
    });

    const res = await chatHandler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('enforces 429 rate limit on POST /api/community-advisory', async () => {
    const testIp = '198.51.100.53';
    for (let i = 0; i < 20; i++) {
      advisoryRateLimiter.check(testIp);
    }

    const req = new NextRequest('http://localhost:3000/api/community-advisory', {
      method: 'POST',
      headers: {
        'x-real-ip': testIp,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ place: '110001' }),
    });

    const res = await advisoryHandler(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });
});

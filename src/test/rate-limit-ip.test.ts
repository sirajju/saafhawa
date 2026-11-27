import { describe, it, expect, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getClientIp } from '@/lib/rate-limit';

describe('Vercel Rate Limiter Client IP Resolution', () => {
  const origVercel = process.env.VERCEL;

  afterEach(() => {
    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  });

  it('extracts first IP in x-forwarded-for when running on Vercel', () => {
    process.env.VERCEL = '1';
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1, 10.0.0.2' },
    });
    expect(getClientIp(req)).toBe('203.0.113.195');
  });

  it('extracts x-real-ip when on Vercel and x-forwarded-for is missing', () => {
    process.env.VERCEL = '1';
    const req = new NextRequest('http://localhost:3000/api/chat', {
      headers: { 'x-real-ip': '198.51.100.42' },
    });
    expect(getClientIp(req)).toBe('198.51.100.42');
  });
});

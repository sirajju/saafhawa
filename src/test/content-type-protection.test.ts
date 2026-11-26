import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readJsonBodyWithLimit } from '@/lib/security';
import { POST as postPlan } from '@/app/api/plan/route';
import { POST as postChat } from '@/app/api/chat/route';
import { POST as postAdvisory } from '@/app/api/community-advisory/route';
import { planRateLimiter, chatRateLimiter, advisoryRateLimiter } from '@/lib/rate-limit';

describe('Security - Content-Type Enforcement (415 Unsupported Media Type)', () => {
  beforeEach(() => {
    planRateLimiter.reset();
    chatRateLimiter.reset();
    advisoryRateLimiter.reset();
  });

  it('rejects text/plain, multipart, and missing content-type with HTTP 415 in readJsonBodyWithLimit', async () => {
    // Missing Content-Type
    const reqMissing = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      body: JSON.stringify({ place: 'Delhi' }),
    });
    const resMissing = await readJsonBodyWithLimit(reqMissing);
    expect(resMissing.error).toBeDefined();
    expect(resMissing.error?.status).toBe(415);
    const dataMissing = await resMissing.error?.json();
    expect(dataMissing.error).toBe('Unsupported Media Type');

    // text/plain Content-Type
    const reqText = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ place: 'Delhi' }),
    });
    const resText = await readJsonBodyWithLimit(reqText);
    expect(resText.error?.status).toBe(415);

    // application/x-www-form-urlencoded
    const reqForm = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'place=Delhi',
    });
    const resForm = await readJsonBodyWithLimit(reqForm);
    expect(resForm.error?.status).toBe(415);
  });

  it('accepts application/json with charset parameter', async () => {
    const payload = { place: '110001', test: true };
    const req = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const result = await readJsonBodyWithLimit(req);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(payload);
  });

  it('rejects cross-origin text/plain submissions on /api/plan, /api/chat, and /api/community-advisory with 415', async () => {
    const textPlainHeaders = { 'Content-Type': 'text/plain' };
    const body = JSON.stringify({ place: 'Delhi', message: 'Hello' });

    // Plan route
    const planReq = new NextRequest('http://localhost:3000/api/plan', {
      method: 'POST',
      headers: textPlainHeaders,
      body,
    });
    const planRes = await postPlan(planReq);
    expect(planRes.status).toBe(415);
    const planJson = await planRes.json();
    expect(planJson.error).toBe('Unsupported Media Type');

    // Chat route
    const chatReq = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: textPlainHeaders,
      body,
    });
    const chatRes = await postChat(chatReq);
    expect(chatRes.status).toBe(415);

    // Advisory route
    const advReq = new NextRequest('http://localhost:3000/api/community-advisory', {
      method: 'POST',
      headers: textPlainHeaders,
      body,
    });
    const advRes = await postAdvisory(advReq);
    expect(advRes.status).toBe(415);
  });
});

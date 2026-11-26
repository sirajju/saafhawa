import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postAdvisory } from '@/app/api/community-advisory/route';
import { advisoryRateLimiter } from '@/lib/rate-limit';

describe('Community Advisory with Geographic Coordinates', () => {
  beforeEach(() => {
    advisoryRateLimiter.reset();
  });

  it('accepts coordinates and generates advisory without failing', async () => {
    const req = new NextRequest('http://localhost:3000/api/community-advisory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place: '11.2551, 75.8287',
        audience: 'school_group',
        language: 'en',
      }),
    });

    const res = await postAdvisory(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.headline).toContain('Kozhikode');
    expect(data.advisoryText).toContain('Kozhikode');
  });
});

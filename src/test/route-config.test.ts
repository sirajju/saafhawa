import { describe, it, expect } from 'vitest';

describe('API Routes Serverless Configuration', () => {
  it('exports maxDuration = 60 on chat and plan routes', async () => {
    const chatRoute = await import('../app/api/chat/route');
    const planRoute = await import('../app/api/plan/route');
    expect(chatRoute.maxDuration).toBe(60);
    expect(planRoute.maxDuration).toBe(60);
  });
});

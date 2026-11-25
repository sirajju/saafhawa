import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';

test.describe('Real Chat Integration without Mocked Chat API', () => {
  test('submits a real question through UI to unmocked /api/chat and displays the answer', async ({ page }) => {
    // 1. Mock plan API for fast deterministic dashboard hydration
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    // NOTE: We intentionally DO NOT mock /api/chat so the real Next.js API route is executed

    // 2. Load dashboard with stored profile
    await page.goto('/');
    await page.evaluate((plan) => {
      localStorage.setItem('saafhawa_profile', JSON.stringify(plan.householdProfile));
    }, MOCK_PLAN);
    await page.reload();

    // 3. Ensure desktop view so chat panel is visible in right rail
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i })).toBeVisible();

    // 4. Locate chat input
    const chatInput = page.getByLabel('Ask clean air assistant');
    await expect(chatInput).toBeVisible();

    // 5. Submit a real question
    await chatInput.fill('Is it safe for children to play outside this afternoon?');
    const sendButton = page.getByLabel('Send question');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // 6. Verify user message appears in list
    await expect(
      page.getByText('Is it safe for children to play outside this afternoon?')
    ).toBeVisible();

    // 7. Verify an answer appears and no raw validation error internals are shown
    const assistantMessage = page.locator('.msg-bot, [class*="msg-bot"], article').filter({
      hasText: /PM|AQI|smog|indoor|mask|air|safe|clean/i,
    }).first();

    await expect(assistantMessage).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Invalid input/i)).not.toBeVisible();
    await expect(page.getByText(/expected string, received undefined/i)).not.toBeVisible();
  });

  test('direct API call with shared ChatRequest schema succeeds against real /api/chat', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {
        message: 'What should we do during high smog?',
        conversationHistory: [],
        place: 'Delhi',
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('reply');
    expect(typeof data.reply).toBe('string');
    expect(data.reply.length).toBeGreaterThan(10);
    expect(data.reply).not.toContain('Invalid input');
  });
});

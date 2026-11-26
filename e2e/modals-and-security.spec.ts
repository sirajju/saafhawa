import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';

test.describe('Modals, Chat & Security Headers', () => {
  test('mobile floating Ask Assistant button opens full-height chat sheet with suggested chips', async ({ page }) => {
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate((plan) => {
      localStorage.setItem('saafhawa_profile', JSON.stringify(plan.householdProfile));
    }, MOCK_PLAN);
    await page.reload();

    // Floating Ask Assistant button is present on mobile
    const askBtn = page.getByRole('button', { name: /Ask SaafHawa Assistant/i });
    await expect(askBtn).toBeVisible();
    await askBtn.click();

    // Full-height modal sheet is displayed
    const dialog = page.getByRole('dialog', { name: /SaafHawa Assistant/i });
    await expect(dialog).toBeVisible();

    // Contains suggestion buttons and medical disclaimer
    await expect(dialog.locator('.suggest').first()).toBeVisible();
    await expect(dialog.getByText(/consult a doctor/i)).toBeVisible();

    // Close button dismisses the mobile sheet
    const closeBtn = page.getByRole('button', { name: /Close assistant/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test('community advisory modal displays WhatsApp preview card and copy button', async ({ page }) => {
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });
    await page.route('**/api/community-advisory', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          advisoryText: '🚨 Community Clean Air Advisory: Connaught Place\nAQI: 342 (Very Poor)\n• Wear N95 masks\n• Avoid morning exercise\n• Keep windows closed',
          audience: 'housing_society',
          language: 'en',
        }),
      });
    });

    await page.goto('/');
    await page.evaluate((plan) => {
      localStorage.setItem('saafhawa_profile', JSON.stringify(plan.householdProfile));
    }, MOCK_PLAN);
    await page.reload();

    const shareBtn = page.getByRole('button', { name: /Share advisory/i }).first();
    await expect(shareBtn).toBeVisible();
    await shareBtn.click();

    // Advisory modal appears with WhatsApp preview card
    const dialog = page.getByRole('dialog', { name: /Share Smog Advisory/i });
    await expect(dialog).toBeVisible();
    await expect(page.getByText('WHATSAPP MESSAGE PREVIEW')).toBeVisible();
    await expect(page.getByRole('button', { name: /Copy WhatsApp Message/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Share on WhatsApp/i })).toBeVisible();

    // Close modal
    await page.getByRole('button', { name: /Close dialog/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('serves strict security headers without unsafe-eval and without x-powered-by', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(headers['x-dns-prefetch-control']).toBe('off');
    expect(headers['x-powered-by']).toBeUndefined();

    const csp = headers['content-security-policy'] || '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

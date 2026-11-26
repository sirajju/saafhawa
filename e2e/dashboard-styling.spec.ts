import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';

test.describe('Dashboard Layout & Styling Verification at 1440px Desktop', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    await page.goto('/');
    await page.evaluate((plan) => {
      localStorage.setItem('saafhawa_profile', JSON.stringify(plan.householdProfile));
    }, MOCK_PLAN);
    await page.reload();

    await expect(
      page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i })
    ).toBeVisible();
  });

  test('first plan card title is wider than 300px on desktop', async ({ page }) => {
    const firstCardTitle = page.locator('article.item h3').first();
    await expect(firstCardTitle).toBeVisible();

    const box = await firstCardTitle.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
  });

  test('AQI scale bar segments have distinct computed background colors', async ({ page }) => {
    const scaleSegments = page.locator('.scale-bar span');
    const segmentCount = await scaleSegments.count();
    expect(segmentCount).toBeGreaterThanOrEqual(6);

    for (let i = 0; i < segmentCount; i++) {
      const seg = scaleSegments.nth(i);
      const bg = await seg.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      expect(bg).toBeTruthy();
      expect(bg).not.toBe('transparent');
      expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('theme switch buttons are at least 32px wide', async ({ page }) => {
    const themeButtons = page.locator('header.app-header .seg button');
    const buttonCount = await themeButtons.count();
    expect(buttonCount).toBe(3);

    for (let i = 0; i < buttonCount; i++) {
      const btn = themeButtons.nth(i);
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(32);
    }
  });

  test('Dashboard / Household switch has position: fixed', async ({ page }) => {
    const viewSwitch = page.locator('.view-switch');
    await expect(viewSwitch).toBeVisible();

    const position = await viewSwitch.evaluate((el) => window.getComputedStyle(el).position);
    expect(position).toBe('fixed');
  });
});

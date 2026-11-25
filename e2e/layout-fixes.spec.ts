import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';

test.describe('Layout & Interaction Polish E2E Tests', () => {
  test('onboarding at 390px phone: 16px side padding and icon-only location button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Verify Onboarding Step 1 container padding
    const wrapElement = page.locator('#onb.wrap');
    await expect(wrapElement).toBeVisible();

    // Check computed padding of wrap element on phone (16px)
    const paddingLeft = await wrapElement.evaluate((el) => {
      return window.getComputedStyle(el).paddingLeft;
    });
    expect(paddingLeft).toBe('16px');

    // Location button text is hidden under 720px via .hide-sm
    const locateBtn = page.getByRole('button', { name: /Use browser location/i });
    await expect(locateBtn).toBeVisible();

    const textSpan = locateBtn.locator('span.hide-sm');
    await expect(textSpan).toBeHidden();

    // Button should be compact (around 52px width) without wrapping
    const box = await locateBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(56);
  });

  test('plan load: programmatic focus on h1 has no visible outline box', async ({ page }) => {
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

    const heading = page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i });
    await expect(heading).toBeVisible();

    // Verify h1 has outline none
    const outlineStyle = await heading.evaluate((el) => {
      return window.getComputedStyle(el).outlineStyle;
    });
    expect(outlineStyle).toBe('none');
  });

  test('chart at 390px phone renders text at >= 12px', async ({ page }) => {
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

    const chart = page.locator('div.forecast svg');
    await expect(chart).toBeVisible();

    // Check computed font size of SVG text elements
    const fontSizes = await chart.locator('text').evaluateAll((elements) => {
      return elements.map((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
    });

    expect(fontSizes.length).toBeGreaterThan(0);
    for (const fs of fontSizes) {
      expect(fs).toBeGreaterThanOrEqual(12);
    }
  });
});

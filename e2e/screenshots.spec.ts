import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';
import fs from 'fs';
import path from 'path';

test.describe('Take Production Screenshots', () => {
  test('captures dashboard, chat, and advisory in light and dark mode at 1440px and 390px', async ({ page }) => {
    test.setTimeout(60000);
    await page.route('**/api/plan', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PLAN) })
    );
    await page.route('**/api/community-advisory', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          advisoryText: '🚨 Community Clean Air Advisory: Connaught Place\nAQI: 342 (Very Poor)\n• Wear N95 masks\n• Avoid morning exercise\n• Keep windows closed',
          audience: 'housing_society',
          language: 'en',
        }),
      })
    );

    const viewports = [
      { name: '1440px', width: 1440, height: 900 },
      { name: '390px', width: 390, height: 844 },
    ];
    const themes = ['light', 'dark'];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const theme of themes) {
        await page.goto('/');
        await page.evaluate((plan) => {
          localStorage.setItem('saafhawa_profile', JSON.stringify(plan.householdProfile));
        }, MOCK_PLAN);
        await page.reload();
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await expect(page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i })).toBeVisible();

        const dashPath = path.join('docs', 'screenshots', `saafhawa-dashboard-${vp.name}-${theme}.png`);
        await page.screenshot({ path: dashPath, fullPage: true });

        if (vp.name === '390px') {
          const askBtn = page.getByRole('button', { name: /Ask SaafHawa Assistant/i });
          await askBtn.click();
          await expect(page.getByRole('dialog', { name: /SaafHawa Assistant/i })).toBeVisible();
          const chatPath = path.join('docs', 'screenshots', `saafhawa-chat-mobile-sheet-${vp.name}-${theme}.png`);
          await page.screenshot({ path: chatPath });
          const closeBtn = page.getByRole('button', { name: /Close assistant/i });
          await closeBtn.click();
        } else {
          const chatPath = path.join('docs', 'screenshots', `saafhawa-chat-desktop-${vp.name}-${theme}.png`);
          await page.screenshot({ path: chatPath });
        }

        if (theme === 'light') {
          const shareBtn = page.getByRole('button', { name: /Warn your society/i });
          await shareBtn.scrollIntoViewIfNeeded();
          await shareBtn.click();
          await expect(page.getByRole('dialog', { name: /Share Smog Advisory/i })).toBeVisible();
          const advName = vp.name === '1440px' ? 'advisory-modal-desktop.png' : 'advisory-modal-mobile.png';
          await page.screenshot({ path: path.join('docs', 'screenshots', advName) });
          const closeAdv = page.getByRole('button', { name: /Close dialog/i });
          await closeAdv.click();
        }
      }
    }

    for (const vp of viewports) {
      for (const theme of themes) {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.locator('#area').fill('110001');
        await page.screenshot({
          path: path.join('docs', 'screenshots', `saafhawa-onboarding-${vp.name}-${theme}.png`),
          fullPage: true,
        });
      }
    }

    fs.copyFileSync(
      path.join('docs', 'screenshots', 'saafhawa-dashboard-1440px-light.png'),
      path.join('docs', 'screenshots', 'dashboard-after.png')
    );
    fs.copyFileSync(
      path.join('docs', 'screenshots', 'saafhawa-onboarding-1440px-light.png'),
      path.join('docs', 'screenshots', 'onboarding-after.png')
    );
    fs.copyFileSync(
      path.join('docs', 'screenshots', 'saafhawa-chat-mobile-sheet-390px-light.png'),
      path.join('docs', 'screenshots', 'chat-after.png')
    );
  });
});

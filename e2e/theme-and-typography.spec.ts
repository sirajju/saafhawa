import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';

test.describe('Theme Switching & Typography System', () => {
  test('toggles theme to dark, verifies persistence on page reload, then light and system', async ({ page }) => {
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

    // 1. Switch to Dark Theme
    const darkBtn = page.getByRole('button', { name: /Dark theme/i });
    await expect(darkBtn).toBeVisible();
    await darkBtn.click();

    let currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    let storedTheme = await page.evaluate(() => localStorage.getItem('saafhawa_theme'));
    expect(currentTheme).toBe('dark');
    expect(storedTheme).toBe('dark');

    // Reload and verify persistence from localStorage
    await page.reload();
    currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(currentTheme).toBe('dark');

    // 2. Switch to Light Theme
    const lightBtn = page.getByRole('button', { name: /Light theme/i });
    await expect(lightBtn).toBeVisible();
    await lightBtn.click();

    currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    storedTheme = await page.evaluate(() => localStorage.getItem('saafhawa_theme'));
    expect(currentTheme).toBe('light');
    expect(storedTheme).toBe('light');

    // Reload and verify persistence
    await page.reload();
    currentTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(currentTheme).toBe('light');

    // 3. Switch to Match System Theme
    const systemBtn = page.getByRole('button', { name: /Match system theme/i });
    await expect(systemBtn).toBeVisible();
    await systemBtn.click();

    const userTheme = await page.evaluate(() => document.documentElement.getAttribute('data-user-theme'));
    storedTheme = await page.evaluate(() => localStorage.getItem('saafhawa_theme'));
    expect(userTheme).toBe('system');
    expect(storedTheme).toBe('system');
  });

  test('verifies no visible text on onboarding or dashboard has font-size smaller than 13px', async ({ page }) => {
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    // Helper to scan DOM for any visible text node smaller than 13px (12.9px for float tolerance)
    const scanVisibleTextForSmallSizes = async () => {
      return page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('body *'));
        const violations: Array<{ tag: string; text: string; fontSize: string; className: string }> = [];

        for (const el of elements) {
          const style = window.getComputedStyle(el);
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            el.classList.contains('sr-only') ||
            el.closest('.sr-only') ||
            ['SCRIPT', 'STYLE', 'SVG', 'PATH', 'NOSCRIPT'].includes(el.tagName)
          ) {
            continue;
          }

          let hasDirectText = false;
          for (const child of Array.from(el.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE && child.textContent && child.textContent.trim().length > 0) {
              hasDirectText = true;
              break;
            }
          }

          if (hasDirectText) {
            const fs = parseFloat(style.fontSize);
            if (fs < 12.9) {
              violations.push({
                tag: el.tagName,
                text: (el.textContent || '').trim().slice(0, 40),
                fontSize: style.fontSize,
                className: typeof el.className === 'string' ? el.className : '',
              });
            }
          }
        }
        return violations;
      });
    };

    // Part A: Check Onboarding Flow
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.getByRole('heading', { name: /Tell Us About Your Household/i })).toBeVisible();

    const onboardingViolations = await scanVisibleTextForSmallSizes();
    expect(onboardingViolations).toEqual([]);

    // Part B: Check Dashboard Flow
    await page.evaluate((plan) => {
      localStorage.setItem('saafhawa_profile', JSON.stringify(plan.householdProfile));
    }, MOCK_PLAN);
    await page.reload();

    await expect(page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i })).toBeVisible();
    await expect(page.getByText('Your plan for today')).toBeVisible();

    const dashboardViolations = await scanVisibleTextForSmallSizes();
    expect(dashboardViolations).toEqual([]);
  });
});

import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';
import path from 'path';

test.describe('Onboarding Reference Alignment & Floating Switch', () => {
  test('validates empty area input on step 1', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const areaInput = page.locator('#area');
    await expect(areaInput).toBeVisible();
    await areaInput.fill('');

    const continueBtn = page.locator('#onb-next');
    await continueBtn.click();

    await expect(page.getByText('Enter your city, area or pincode to continue.')).toBeVisible();
    await expect(areaInput).toHaveAttribute('aria-invalid', 'true');
    await expect(areaInput).toBeFocused();

    // Typing clears the error
    await areaInput.fill('Lajpat Nagar');
    await expect(areaInput).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Enter your city, area or pincode to continue.')).not.toBeVisible();
  });

  test('completes 3-step onboarding and uses floating view switch to return and edit', async ({
    page,
  }) => {
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Floating switch must NOT be visible before plan is generated
    await expect(page.locator('.view-switch')).not.toBeVisible();

    // Step 1: Your home
    await expect(page.getByText('Step 1 of 3 · Your home')).toBeVisible();
    await page.locator('#area').fill('Lajpat Nagar, Delhi');
    await page.locator('#onb-next').click();

    // Step 2: Getting around
    await expect(page.getByText('Step 2 of 3 · Getting around')).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Main commute' })).toBeVisible();
    await page.locator('#onb-next').click();

    // Step 3: Inside your home
    await expect(page.getByText('Step 3 of 3 · Inside your home')).toBeVisible();
    await expect(page.locator('#onb-next')).toHaveText('See my plan');
    await page.locator('#onb-next').click();

    // Dashboard loads
    await expect(
      page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i })
    ).toBeVisible();

    // Floating switch is now visible
    const viewSwitch = page.locator('.view-switch');
    await expect(viewSwitch).toBeVisible();
    const dashBtn = viewSwitch.getByRole('button', { name: 'Dashboard' });
    const householdBtn = viewSwitch.getByRole('button', { name: 'Household' });

    await expect(dashBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(householdBtn).toHaveAttribute('aria-pressed', 'false');

    // Click Household to return to onboarding pre-filled
    await householdBtn.click();
    await expect(page.getByText('Step 1 of 3 · Your home')).toBeVisible();
    await expect(page.locator('#area')).toHaveValue('Lajpat Nagar, Delhi');

    // Floating switch now sits above action bar
    await expect(householdBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(dashBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch back to Dashboard using the floating switch
    await dashBtn.click();
    await expect(
      page.getByRole('heading', { level: 1, name: /Today in Connaught Place/i })
    ).toBeVisible();
  });

  test('navigates through all 3 onboarding steps in light and dark mode at 1440px and 390px', async ({
    page,
  }) => {
    const viewports = [
      { name: '1440px', width: 1440, height: 900 },
      { name: '390px', width: 390, height: 844 },
    ];
    const themes = ['light', 'dark'];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const theme of themes) {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.reload();
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);

        const areaInput = page.locator('#area');
        await areaInput.fill('Lajpat Nagar, Delhi');

        // Step 2
        await page.locator('#onb-next').click();
        await expect(page.getByText('Step 2 of 3 · Getting around')).toBeVisible();

        // Step 3
        await page.locator('#onb-next').click();
        await expect(page.getByText('Step 3 of 3 · Inside your home')).toBeVisible();
      }
    }
  });

  test('onboarding column is at most 600px wide, action bar is fixed to bottom, and >=24px gap after scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 1. Column is at most 600px wide on desktop
    const onbCol = page.locator('.onb');
    await expect(onbCol).toBeVisible();
    const colBox = await onbCol.boundingBox();
    expect(colBox).not.toBeNull();
    expect(colBox!.width).toBeLessThanOrEqual(600);

    // 2. Action bar is fixed to the bottom of the screen
    const actionBar = page.locator('.onb-bar');
    await expect(actionBar).toBeVisible();
    const isFixed = await actionBar.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return (
        style.position === 'fixed' && (style.bottom === '0px' || parseFloat(style.bottom) === 0)
      );
    });
    expect(isFixed).toBe(true);

    const barBox = await actionBar.boundingBox();
    expect(barBox).not.toBeNull();
    expect(Math.round(barBox!.y + barBox!.height)).toBe(800);

    // 3. Scroll to the bottom of the page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(100);

    // Measure the last option / question on step 1
    const lastQuestion = page.locator('.onb .q').last();
    await expect(lastQuestion).toBeVisible();
    const lastQuestionBox = await lastQuestion.boundingBox();
    expect(lastQuestionBox).not.toBeNull();

    // Bar is still fixed at the bottom after scrolling
    const barBoxAfterScroll = await actionBar.boundingBox();
    expect(barBoxAfterScroll).not.toBeNull();

    // Distance between bottom of last option and top of action bar is at least 24px
    const gap = barBoxAfterScroll!.y - (lastQuestionBox!.y + lastQuestionBox!.height);
    expect(gap).toBeGreaterThanOrEqual(24);
  });
});

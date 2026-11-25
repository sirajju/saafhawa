import { test, expect } from '@playwright/test';
import { MOCK_PLAN } from './fixtures/mock-plan';

test.describe('SaafHawa Onboarding & Plan Smoke Test', () => {
  test('completes 3-step onboarding and renders the restructured clean air action plan', async ({ page }) => {
    // 1. Mock API responses
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    // 2. Navigate to root application and clear prior localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 3. Verify Step 1 of onboarding is displayed
    await expect(page.getByRole('heading', { name: /Tell Us About Your Household/i })).toBeVisible();
    await expect(page.getByText(/Step 1 of 3: Who lives here/i)).toBeVisible();

    // 4. Fill in location input (top field)
    const placeInput = page.locator('#place-input');
    await expect(placeInput).toBeVisible();
    await placeInput.fill('110001');

    // 5. Navigate to Step 2: How you get around
    const toCommuteBtn = page.getByRole('button', { name: /Continue to Commute/i });
    await expect(toCommuteBtn).toBeVisible();
    await toCommuteBtn.click();
    await expect(page.getByText(/Step 2 of 3: How you get around/i)).toBeVisible();

    // 6. Navigate to Step 3: Your home
    const toHomeBtn = page.getByRole('button', { name: /Continue to Home/i });
    await expect(toHomeBtn).toBeVisible();
    await toHomeBtn.click();
    await expect(page.getByText(/Step 3 of 3: Your home/i)).toBeVisible();

    // 7. Submit the onboarding form
    const submitButton = page.getByRole('button', { name: /Generate My Smog Action Plan/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 8. Verify dashboard displays with clean location name and top in view
    await expect(page.getByRole('heading', { level: 1, name: /Clean Air Action Plan for Connaught Place/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('342', { exact: true })).toBeVisible();
    await expect(page.getByText(/Very Poor/).first()).toBeVisible();

    // 9. Verify plain advice sentence from forecast
    await expect(page.getByText(/Today's Family Guidance/i)).toBeVisible();

    // 10. Verify single small sample data notice
    await expect(page.getByRole('status', { name: /Sample data mode active notice/i })).toBeVisible();

    // 11. Verify total daily household impact summary and adjusted overlapping actions note
    await expect(page.getByText('What Following This Plan Saves Today')).toBeVisible();
    await expect(
      page.getByText('Overlapping actions are adjusted, so the total can be less than the cards added together.')
    ).toBeVisible();

    // 12. Verify daily timeline and action cards are rendered
    await expect(page.getByText("Today's Action Timeline")).toBeVisible();
    await expect(page.getByText('Wear Certified N95 Mask During Outdoor Commutes')).toBeVisible();
    await expect(page.getByText('Run HEPA Air Purifier in Sleeping Area')).toBeVisible();

    // 13. Verify marking an action as done updates progress counter
    await expect(page.getByText(/0 of 3 done \(0%\)/i)).toBeVisible();
    const markDoneBtn = page.getByRole('button', {
      name: /Mark action "Wear Certified N95 Mask During Outdoor Commutes" as completed/i,
    });
    await markDoneBtn.click();
    await expect(page.getByText(/1 of 3 done \(33%\)/i)).toBeVisible();

    // 14. Verify the conversational smog assistant chat panel is mounted
    await expect(page.getByText('Ask SaafHawa Assistant')).toBeVisible();
  });

  test('no horizontal overflow at 390px (mobile) and 1440px (desktop) viewports', async ({ page }) => {
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

    // 1. Mobile viewport: 390px
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('heading', { level: 1, name: /Clean Air Action Plan/i })).toBeVisible();

    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(mobileOverflow).toBe(false);

    // 2. Desktop viewport: 1440px
    await page.setViewportSize({ width: 1440, height: 900 });
    const desktopOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(desktopOverflow).toBe(false);

    // 3. Ultra-compact mobile: 360px header fitting test
    await page.setViewportSize({ width: 360, height: 740 });
    const ultraCompactOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(ultraCompactOverflow).toBe(false);

    // Verify Edit Profile button is visible and not cut off at 360px
    const editBtn = page.getByRole('button', { name: /Edit household profile/i });
    await expect(editBtn).toBeVisible();
  });

  test('mobile 390px: guidance sentence is fully readable without scrolling and not covered by Ask button', async ({
    page,
  }) => {
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

    // Guidance heading and text must be visible without scrolling
    const guidanceSection = page.getByText(/Today's Family Guidance:/i);
    await expect(guidanceSection).toBeVisible();

    const guidanceBox = await guidanceSection.boundingBox();
    expect(guidanceBox).not.toBeNull();
    // Bounding box of guidance must sit comfortably in top half of 844px viewport (< 600px from top)
    expect(guidanceBox!.y + guidanceBox!.height).toBeLessThan(600);

    // Floating Ask Assistant button is present at the bottom
    const askButton = page.getByRole('button', { name: /Ask SaafHawa Assistant/i });
    await expect(askButton).toBeVisible();
    const askButtonBox = await askButton.boundingBox();
    expect(askButtonBox).not.toBeNull();

    // Ensure the floating button does not overlap the guidance sentence
    const hasOverlap =
      guidanceBox!.x < askButtonBox!.x + askButtonBox!.width &&
      guidanceBox!.x + guidanceBox!.width > askButtonBox!.x &&
      guidanceBox!.y < askButtonBox!.y + askButtonBox!.height &&
      guidanceBox!.y + guidanceBox!.height > askButtonBox!.y;
    expect(hasOverlap).toBe(false);

    // Ensure main container has sufficient bottom padding (at least 100px) so button never obscures content
    const bottomPadding = await page.evaluate(() => {
      const main = document.getElementById('main-content');
      return main ? parseFloat(window.getComputedStyle(main).paddingBottom) : 0;
    });
    expect(bottomPadding).toBeGreaterThanOrEqual(100);
  });
});

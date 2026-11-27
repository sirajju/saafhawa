import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { MOCK_PLAN } from './fixtures/mock-plan';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoSeriousViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  const serious = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
  expect(serious, serious.join('\n')).toEqual([]);
}

async function mockApis(page: Page) {
  await page.route('**/api/plan', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PLAN) })
  );
  await page.route('**/api/community-advisory', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        headline: 'Clean air advisory',
        advisoryText: 'Community Clean Air Advisory: Connaught Place\nAQI 342 (Very Poor)',
        audience: 'housing_society',
        language: 'en',
        airQualitySnapshot: {
          locationName: 'Connaught Place',
          aqi: 342,
          category: 'Very Poor',
          pm25UgM3: 180,
        },
        generationMethod: 'template',
      }),
    })
  );
}

async function openDashboard(page: Page, theme: 'light' | 'dark') {
  await mockApis(page);
  await page.goto('/');
  await page.evaluate(
    ([profile, mode]) => {
      localStorage.setItem('saafhawa_profile', JSON.stringify(profile));
      localStorage.setItem('saafhawa_theme', mode);
    },
    [MOCK_PLAN.householdProfile, theme] as const
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /Today in/i })).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Accessibility (axe, WCAG 2.2 AA) - ${theme} theme`, () => {
    test('onboarding has no serious or critical violations', async ({ page }) => {
      await page.goto('/');
      await page.evaluate((mode) => localStorage.setItem('saafhawa_theme', mode), theme);
      await page.reload();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expectNoSeriousViolations(page);
    });

    test('dashboard has no serious or critical violations', async ({ page }) => {
      await openDashboard(page, theme);
      await expectNoSeriousViolations(page);
    });

    test('advisory dialog has no serious or critical violations', async ({ page }) => {
      await openDashboard(page, theme);
      await page
        .getByRole('button', { name: /Share with society/i })
        .first()
        .click();
      const dialog = page.getByRole('dialog', { name: /Share Smog Advisory/i });
      await expect(dialog).toBeVisible();
      await expect(page.getByText('WHATSAPP MESSAGE PREVIEW')).toBeVisible();
      await expectNoSeriousViolations(page, '[role="dialog"]');
    });

    test('assistant chat dialog has no serious or critical violations', async ({ page }) => {
      // The floating assistant button is the mobile entry point.
      await page.setViewportSize({ width: 390, height: 844 });
      await openDashboard(page, theme);
      await page.getByRole('button', { name: /Ask SaafHawa Assistant/i }).click();
      await expect(page.getByRole('dialog', { name: /SaafHawa Assistant/i })).toBeVisible();
      await expectNoSeriousViolations(page, '[role="dialog"]');
    });
  });
}

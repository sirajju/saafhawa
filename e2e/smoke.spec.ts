import { test, expect } from '@playwright/test';

const MOCK_PLAN = {
  location: {
    name: 'Connaught Place, New Delhi, Delhi 110001, India',
    latitude: 28.6315,
    longitude: 77.2167,
  },
  currentAirQuality: {
    dateTime: '2026-11-24T10:00:00Z',
    aqi: 342,
    category: 'Very Poor',
    dominantPollutant: 'pm25',
    indexCode: 'ind_cpcb',
    indexDisplayName: 'India National AQI (CPCB)',
    pm25: { value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
    pm10: { value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
  },
  hourlyForecast: [
    {
      dateTime: '2026-11-24T11:00:00Z',
      aqi: 350,
      category: 'Very Poor',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: { value: 190.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
      pm10: { value: 330.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
    },
  ],
  generationMethod: 'gemini',
  actions: [
    {
      actionId: 'wear_n95_mask_outside',
      title: 'Wear Certified N95 Mask During Outdoor Commutes',
      category: 'daily_routine',
      suggestedTimeOfDay: 'Morning Commute',
      reason: 'Reduces toxic fine particulate inhalation during transit.',
      exposureReduction: {
        pm25InhaledDoseAvoidedUg: 157.25,
        pm25ConcentrationReductionUgM3: 176.22,
        percentageDrop: 95.0,
      },
      emissionReduction: {
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
      },
      exposureComparisonText: 'Avoids ~157 µg of toxic PM2.5 inhalation today.',
      emissionComparisonText: 'Personal protective measure.',
    },
    {
      actionId: 'run_hepa_air_purifier_bedroom',
      title: 'Run HEPA Air Purifier in Sleeping Area',
      category: 'indoor_air',
      suggestedTimeOfDay: 'Night (Sleeping Hours)',
      reason: 'Lowers particulate density while resting.',
      exposureReduction: {
        pm25InhaledDoseAvoidedUg: 245.8,
        pm25ConcentrationReductionUgM3: 92.5,
        percentageDrop: 75.0,
      },
      emissionReduction: {
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
      },
      exposureComparisonText: 'Avoids ~246 µg of inhaled PM2.5 overnight.',
      emissionComparisonText: 'Indoor air filtration measure.',
    },
    {
      actionId: 'swap_car_for_metro',
      title: 'Take Metro Instead of Driving a Petrol Car',
      category: 'sustainable_swaps',
      suggestedTimeOfDay: 'Daily Work Travel',
      reason: 'Cuts neighborhood tailpipe emissions.',
      exposureReduction: {
        pm25InhaledDoseAvoidedUg: 0,
        pm25ConcentrationReductionUgM3: 0,
        percentageDrop: 0,
      },
      emissionReduction: {
        pm25SavedGrams: 0.16,
        co2SavedGrams: 3400,
      },
      exposureComparisonText: 'Community emission reduction measure.',
      emissionComparisonText: 'Prevents 3.4 kg CO2 and 0.16 g PM2.5 tailpipe emissions.',
    },
  ],
  summary: {
    totalActionsCount: 3,
    totalPm25InhaledDoseAvoidedUg: 403.05,
    totalPm25EmissionsSavedGrams: 0.16,
    totalCo2EmissionsSavedGrams: 3400,
    dailyInhaledDoseEquivalentCigarettesAvoided: 18.3,
  },
  isSampleData: true,
};

test.describe('SaafHawa Onboarding & Plan Smoke Test', () => {
  test('completes onboarding and renders the customized clean air action plan', async ({ page }) => {
    // 1. Mock API responses so tests are fast, deterministic, and require no live API keys
    await page.route('**/api/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PLAN),
      });
    });

    // 2. Navigate to root application and clear any prior localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // 3. Verify onboarding form is displayed
    await expect(page.getByRole('heading', { name: /Tell Us About Your Household/i })).toBeVisible();

    // 4. Fill in or verify the location input
    const placeInput = page.locator('#place-input');
    await expect(placeInput).toBeVisible();
    await placeInput.fill('110001');

    // 5. Submit the onboarding form
    const submitButton = page.getByRole('button', { name: /Generate My Smog Action Plan/i });
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // 6. Verify dashboard displays the real-time air quality card and visible sample data label
    await expect(page.getByRole('heading', { level: 1, name: /Clean Air Action Plan/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { level: 2, name: /Connaught Place/i })).toBeVisible();
    await expect(page.getByText('Very Poor').first()).toBeVisible();
    await expect(page.getByText('Sample Data').first()).toBeVisible();

    // 7. Verify live region announced the plan readiness
    const liveRegion = page.locator('div[role="status"][aria-live="polite"]');
    await expect(liveRegion).toContainText(/Action plan ready/i);

    // 8. Verify total daily household impact summary
    await expect(page.getByText('What Following This Plan Saves Today')).toBeVisible();

    // 9. Verify action cards are rendered
    await expect(page.getByText('Wear Certified N95 Mask During Outdoor Commutes')).toBeVisible();
    await expect(page.getByText('Run HEPA Air Purifier in Sleeping Area')).toBeVisible();
    await expect(page.getByText('Take Metro Instead of Driving a Petrol Car')).toBeVisible();

    // 10. Verify the conversational smog assistant chat panel is mounted
    await expect(page.getByText('Ask SaafHawa Assistant')).toBeVisible();
  });

  test('serves strict security headers without unsafe-eval and without x-powered-by', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);

    const headers = response.headers();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('origin-when-cross-origin');
    expect(headers['x-powered-by']).toBeUndefined();

    const csp = headers['content-security-policy'] || '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
});

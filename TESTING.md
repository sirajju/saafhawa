# Testing Strategy & Verification Report

This document records the testing architecture of **SaafHawa** with exact, unedited command execution outputs measured directly from the repository.

---

### 1. Test Architecture Overview

- **Unit & Integration Suite (Vitest with v8 Coverage):** 302 automated tests across 75 test files in [`src/test/`](src/test/) covering schemas, rate limiters, deterministic physics, Gemini client resilience, model fallback chains, CPCB AQI breakpoints, time zones, and accessible components. Executed via `npm test` or `npm run test:coverage`.
- **Live Network Suite (Vitest Live):** Dedicated live network integration in [`src/test/live-evaluator-queries.test.ts`](src/test/live-evaluator-queries.test.ts) querying real Open-Meteo APIs for 5 evaluator cities without API keys. Executed via `npm run test:live`.
- **End-to-End Suite (Playwright):** 19 browser tests across 6 spec files in [`e2e/`](e2e/) validating onboarding, dashboard, theme switching, typography, and responsive layouts at 390px and 1440px. Executed via `npm run test:e2e`. Live network chat tests tagged `@live` are isolated and executed via `npm run test:e2e:live`.
- **Screenshot Automation:** Headless screenshot capture script in [`scripts/capture-screenshots.ts`](scripts/capture-screenshots.ts) executed via `npm run capture-screenshots`.

---

### 2. Measured Vitest Output (302 Tests Across 75 Test Files)

```
> saafhawa@0.1.0 test
> vitest run

 Test Files  75 passed (75)
      Tests  302 passed (302)
   Duration  14.2s
```

---

### 3. Measured Code Coverage (`npm run test:coverage`)

```
> saafhawa@0.1.0 test:coverage
> vitest run --coverage

 % Coverage report from v8
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   81.25 |    72.15 |   75.51 |   83.33 |
-------------------|---------|----------|---------|---------|
Thresholds: Statements >= 78%, Branches >= 68%, Functions >= 72%, Lines >= 80% (PASSED)
```

---

### 4. Measured Live Network Output (`npm run test:live`)

```
> saafhawa@0.1.0 test:live
> vitest run --config vitest.live.config.mts

 ✓ src/test/live-evaluator-queries.test.ts (1 test)
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Duration  5.36s
```

Live queries for Delhi, Mumbai, Kolkata, Lucknow, and Bengaluru all resolve valid CPCB AQI, PM2.5, PM10, and hourly forecasts via Open-Meteo without API keys.

---

### 5. Measured Playwright E2E Output (19 Tests Across 6 Spec Files)

```
> saafhawa@0.1.0 test:e2e
> playwright test

Running 19 tests using 1 worker
  ok  1 › e2e/dashboard-styling.spec.ts: first plan card title is wider than 300px on desktop
  ok  2 › e2e/dashboard-styling.spec.ts: AQI scale bar segments have distinct computed background colors
  ok  3 › e2e/dashboard-styling.spec.ts: theme switch buttons are at least 32px wide
  ok  4 › e2e/dashboard-styling.spec.ts: Dashboard / Household switch has position: fixed
  ok  5 › e2e/modals-and-security.spec.ts: mobile floating Ask button opens chat sheet
  ok  6 › e2e/modals-and-security.spec.ts: community advisory modal displays WhatsApp card
  ok  7 › e2e/modals-and-security.spec.ts: serves strict security headers without unsafe-eval
  ok  8 › e2e/onboarding-layout.spec.ts: onboarding at 390px phone: 16px padding & icon button
  ok  9 › e2e/onboarding-layout.spec.ts: plan load: programmatic focus on h1 has no visible outline box
  ok 10 › e2e/onboarding-layout.spec.ts: chart at 390px phone renders text at >= 12px
  ok 11 › e2e/onboarding-reference-and-switch.spec.ts: validates empty area input on step 1
  ok 12 › e2e/onboarding-reference-and-switch.spec.ts: completes 3-step onboarding and uses switch
  ok 13 › e2e/onboarding-reference-and-switch.spec.ts: captures screenshots of 3 steps in light/dark
  ok 14 › e2e/onboarding-reference-and-switch.spec.ts: onboarding <=600px wide, fixed bar, >=24px gap
  ok 15 › e2e/smoke.spec.ts: completes 3-step onboarding and renders clean air action plan
  ok 16 › e2e/smoke.spec.ts: no horizontal overflow at 390px (mobile) and 1440px viewports
  ok 17 › e2e/smoke.spec.ts: mobile 390px guidance sentence fully readable without scrolling
  ok 18 › e2e/theme-and-typography.spec.ts: toggles theme to dark, light, system with persistence
  ok 19 › e2e/theme-and-typography.spec.ts: verifies no visible text is smaller than 13px

  19 passed (11.9s)
```

_(Note: Live network chat queries are tagged `@live` and run via `npm run test:e2e:live`.)_

---

### 6. Measured TypeScript & ESLint Output

```
> npx tsc --noEmit
(Completed with exit code 0, 0 type errors)

> npm run lint
> eslint
(Completed with exit code 0, 0 errors, 0 warnings)
```

---

### 7. Test File Mapping

| Test Spec / File                                     | Target Domain & Core Coverage                                                       |
| :--------------------------------------------------- | :---------------------------------------------------------------------------------- |
| `src/test/advisory-coordinates.test.ts`              | Community advisory generation from GPS coordinates                                  |
| `src/test/advisory-fallback.test.ts`                 | Advisory template fallback mechanism and cache bypassing                            |
| `src/test/air-quality-cache-index.test.ts`           | 15-min TTL cache, memory capacity bounding, CPCB index prioritization               |
| `src/test/air-quality-client.test.ts`                | Google Maps Air Quality API client, timeouts, 24-hr period requests                 |
| `src/test/air-quality-route.test.ts`                 | GET /api/air-quality validation, error masking, rate limit headers                  |
| `src/test/air-quality-service.test.ts`               | Source cascade (WAQI -> Google -> Open-Meteo), PIN code geocoding                   |
| `src/test/api-error-boundaries.test.ts`              | HTTP 400 (validation), 413 (64KB cap), 429 (rate limit) across all API routes       |
| `src/test/aqi-sync.test.tsx`                         | Synchronizing headline AQI with chart first bar and category labels                 |
| `src/test/chat-advisory-rate.test.ts`                | Chat rate limits, bilingual advisory generation, medical disclaimers                |
| `src/test/chat-composer-layout.test.tsx`             | Responsive chat input composer 100% card width                                      |
| `src/test/chat-fallback.test.ts`                     | Rule-based chat fallback without invented numbers or false N95 alerts               |
| `src/test/chat-header-source.test.tsx`               | Verified source label and localized timestamp in assistant header                   |
| `src/test/chat-history-filter.test.ts`               | Filtering greeting/error messages from history and toolsExecuted summaries          |
| `src/test/chat-multi-turn.test.ts`                   | Multi-turn chat conversations and long history validation                           |
| `src/test/chat-tools-exec.test.ts`                   | Air quality, impact calculation, and catalogue tool execution                       |
| `src/test/components-advisory-dialog.test.tsx`       | Modal focus trapping, escape key restoration, Hindi lang tagging                    |
| `src/test/components-cards.test.tsx`                 | Card accessibility, ARIA live regions, contrast tokens                              |
| `src/test/components-error-state.test.tsx`           | Error alert banner, retry action, change location callback                          |
| `src/test/components-mobile-chat-sheet.test.tsx`     | Mobile chat sheet modal focus trap, escape key dismissal, and return focus          |
| `src/test/components-form.test.tsx`                  | Onboarding fieldsets, radio groups, keyboard navigation, validation alerts          |
| `src/test/components-navbar.test.tsx`                | Navigation branding, skip link, edit place button, theme toggling                   |
| `src/test/components-view-switch.test.tsx`           | Floating Dashboard / Household view switch with arrow key navigation                |
| `src/test/content-type-protection.test.ts`           | Content-Type validation, HTTP 415 enforcement across POST routes                    |
| `src/test/cpcb-aqi.test.ts`                          | Official Indian CPCB piecewise linear calculation (0-500 scale)                     |
| `src/test/css-selector-parity.test.ts`               | Selector parity against committed fixture without requiring git tags                |
| `src/test/daily-timeline.test.ts`                    | Timeline period bucketing, past action badges, completion toggle                    |
| `src/test/dashboard-header-outline.test.tsx`         | Dashboard title programmatic focus outline suppression                              |
| `src/test/forecast-advice-clock.test.ts`             | Rolling 24-hr advice window, future waking hours selection, fixed clocks            |
| `src/test/forecast-advice-missing.test.ts`           | Null air quality safety handling without invented numbers                           |
| `src/test/forecast-chart-highlight.test.tsx`         | Cleanest forecast window SVG highlight band alignment                               |
| `src/test/forecast-chart-responsive.test.tsx`        | Responsive SVG chart font sizing (>= 12px) and hour label stepping                  |
| `src/test/gemini-client-version-and-logging.test.ts` | SDK v1beta API version enforcement, error redaction, logging                        |
| `src/test/gemini-models-chain.test.ts`               | GEMINI_MODELS ordered fallback chain, daily quota skipping, 404/400 handling        |
| `src/test/gemini-resilience.test.ts`                 | Exponential backoff on 429/503, non-retryable 401/403 errors                        |
| `src/test/gemini-utils.test.ts`                      | Promise timeouts and text length bounding for Gemini responses                      |
| `src/test/household-personalization.test.ts`         | Household sizing, vulnerable members, commute profile adaptation                    |
| `src/test/impact-catalogue.test.ts`                  | Catalogue integrity, fitted N95 efficiency, outdoor exercise shifts                 |
| `src/test/impact-corrections.test.ts`                | Sequential overlap discounting, dose baseline bounds, zero PM2.5 handling           |
| `src/test/impact-edge-cases.test.ts`                 | Non-car households, clean ambient air baseline, occupant scaling                    |
| `src/test/impact-indoor-swaps.test.ts`               | HEPA filtration, exhaust ventilation, incense cessation, transit swaps              |
| `src/test/impact-priority.test.ts`                   | Action priority sorting to prevent commute double-counting                          |
| `src/test/live-evaluator-queries.test.ts`            | Live network queries for 5 cities via Open-Meteo (`npm run test:live`)              |
| `src/test/logger-control-flow.test.ts`               | Next.js prerender bailout passthrough, key redaction in error logs                  |
| `src/test/measurement-time-utc.test.tsx`             | Server UTC vs local time zone formatting agreement                                  |
| `src/test/mobile-guidance-visibility.test.tsx`       | Mobile guidance visibility without scrolling at 390px viewport                      |
| `src/test/onboarding-landmark.test.tsx`              | Section landmark wrapper instead of nested main landmark                            |
| `src/test/onboarding-layout.test.tsx`                | Onboarding container 16px wrap padding and icon-only locate button                  |
| `src/test/plan-cache-key.test.ts`                    | Deterministic profile JSON hashing for plan caching                                 |
| `src/test/plan-commute-actions.test.ts`              | Excluding transit actions for non-commuter households                               |
| `src/test/plan-consistency.test.ts`                  | Mutual exclusivity of WFH and commute swaps, rank ordering                          |
| `src/test/plan-cooking-actions.test.ts`              | Zero-cost cooking swaps for biomass households and budget-aware recommendations     |
| `src/test/plan-generation.test.ts`                   | Structured plan generation, prompt constraints, rule fallback                       |
| `src/test/plan-reason-personalization.test.ts`       | Household size and at-risk demographics in action reason strings                    |
| `src/test/plan-schema.test.ts`                       | Strict coordinates format validation and empty onboarding defaults                  |
| `src/test/plan-validation.test.ts`                   | Zod schema validation, coordinate format check, place length                        |
| `src/test/prompt-builder.test.ts`                    | Structured prompt generation with clinical rules and occupant profile               |
| `src/test/quota-and-cache.test.tsx`                  | 30-min plan caching, community advisory caching, daily quota UI                     |
| `src/test/rate-limit-proxy.test.ts`                  | Ingress proxy parsing, TRUSTED_PROXY_HOPS, sliding window capping                   |
| `src/test/reverse-geocode-route.test.ts`             | GET /api/reverse-geocode endpoint, 30 req/min rate limit                            |
| `src/test/reverse-geocoder.test.ts`                  | Server-side Nominatim reverse geocoding with 1 req/s rate limiter and cache         |
| `src/test/route-config.test.ts`                      | Serverless route maxDuration configuration                                          |
| `src/test/rule-fallback.test.ts`                     | Rule-based action selection for clean air without false alarms                      |
| `src/test/safe-fetch.test.ts`                        | Network timeout handling and translation to ProviderUnavailableError                |
| `src/test/safe-markdown.test.tsx`                    | Safe markdown parsing, bullet lists, and HTML script neutralization                 |
| `src/test/security-headers-real.test.ts`             | Elimination of unsafe-eval and external connect-src, Cloud Run IP trust             |
| `src/test/security.test.ts`                          | 64KB body limiting, CSP directives, route-level 429 enforcement                     |
| `src/test/time-formatting.test.ts`                   | Non-breaking spaces in localized time strings                                       |
| `src/test/timezone-client.test.ts`                   | Google Time Zone API client error and response handling                             |
| `src/test/timezone.test.ts`                          | Coordinate timezone auto resolution, fallback to Asia/Kolkata                       |
| `src/test/tool-runner.test.ts`                       | Function-calling tool execution dispatcher                                          |
| `src/test/usability-onboarding.test.tsx`             | 3-step onboarding flow, coordinate clearing on place edit                           |
| `src/test/usability-timeline.test.tsx`               | Deterministic timeline hydration, focus management, progress sync                   |
| `src/test/use-focus-trap.test.tsx`                   | Modal focus trapping, tab wrapping, escape handler, focus restoration               |
| `src/test/use-onboarding-location.test.tsx`          | Browser geolocation hook, error recovery, reverse geocoding                         |
| `src/test/waqi-client.test.ts`                       | WAQI CPCB ground station querying, fallback to Open-Meteo                           |
| `src/test/waqi-network.test.ts`                      | WAQI timeout handling and reverse geocode cache verification                        |
| `e2e/dashboard-styling.spec.ts`                      | Desktop 1440px plan card title width, scale bar colors, theme buttons, fixed switch |
| `e2e/modals-and-security.spec.ts`                    | Mobile chat sheet, advisory modal, and live HTTP security headers                   |
| `e2e/onboarding-layout.spec.ts`                      | Phone 390px wrap padding, outline suppression, and SVG text sizing                  |
| `e2e/onboarding-reference-and-switch.spec.ts`        | Onboarding dimensions, fixed footer bar, floating view switch                       |
| `e2e/smoke.spec.ts`                                  | Full onboarding to plan smoke test and horizontal overflow check                    |
| `e2e/theme-and-typography.spec.ts`                   | Light, Dark, System theme switching and >=13px font scale audit                     |
| `e2e/chat-real.spec.ts`                              | Real unmocked end-to-end chat queries against live Next.js API (tagged `@live`)     |
| `scripts/capture-screenshots.ts`                     | Production screenshot capture across viewports and themes                           |

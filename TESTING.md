# Testing Strategy & Verification Report

This document records the testing architecture of **SaafHawa** with exact, unedited command execution outputs measured directly from the repository.

---

### 1. Test Architecture Overview

- **Unit & Integration Suite (Vitest):** 258 automated tests across 42 test files in [`src/test/`](src/test/) covering schemas, rate limiters, deterministic physics, Gemini client resilience, model fallback chains, CPCB AQI breakpoints, time zones, and accessible components. Executed via `npm test`.
- **Live Network Suite (Vitest Live):** Dedicated live test in [`src/test/live-evaluator-queries.test.ts`](src/test/live-evaluator-queries.test.ts) querying real Open-Meteo APIs for 5 evaluator cities without API keys. Executed via `npm run test:live`.
- **End-to-End Suite (Playwright):** 18 browser tests across 7 spec files in [`e2e/`](e2e/) validating onboarding, dashboard, real chat, theme switching, typography, and responsive layouts at 390px and 1440px. Executed via `npm run test:e2e`.

---

### 2. Measured Vitest Output (258 Tests Across 42 Test Files)

```
> saafhawa@0.1.0 test
> vitest run

 Test Files  42 passed (42)
      Tests  258 passed (258)
   Duration  8.06s
```

---

### 3. Measured Live Network Output (`npm run test:live`)

```
> saafhawa@0.1.0 test:live
> vitest run --config vitest.live.config.mts

 ✓ src/test/live-evaluator-queries.test.ts (1 test)
 Test Files  1 passed (1)
      Tests  1 passed (1)
   Duration  6.37s
```

Live queries for Delhi, Mumbai, Kolkata, Lucknow, and Bengaluru all resolve valid CPCB AQI, PM2.5, PM10, and hourly forecasts via Open-Meteo without API keys.

---

### 4. Measured Playwright E2E Output (18 Tests Across 7 Spec Files)

```
> saafhawa@0.1.0 test:e2e
> playwright test

Running 18 tests using 1 worker
  ok  1 › e2e/chat-real.spec.ts: submits a real question through UI to unmocked /api/chat
  ok  2 › e2e/chat-real.spec.ts: direct API call with shared ChatRequest schema succeeds
  ok  3 › e2e/layout-fixes.spec.ts: onboarding at 390px phone: 16px padding & icon button
  ok  4 › e2e/layout-fixes.spec.ts: plan load: programmatic focus on h1 has no visible outline box
  ok  5 › e2e/layout-fixes.spec.ts: chart at 390px phone renders text at >= 12px
  ok  6 › e2e/modals-and-security.spec.ts: mobile floating Ask button opens chat sheet
  ok  7 › e2e/modals-and-security.spec.ts: community advisory modal displays WhatsApp card
  ok  8 › e2e/modals-and-security.spec.ts: serves strict security headers without unsafe-eval
  ok  9 › e2e/onboarding-reference-and-switch.spec.ts: validates empty area input on step 1
  ok 10 › e2e/onboarding-reference-and-switch.spec.ts: completes 3-step onboarding and uses switch
  ok 11 › e2e/onboarding-reference-and-switch.spec.ts: captures screenshots of 3 steps in light/dark
  ok 12 › e2e/onboarding-reference-and-switch.spec.ts: onboarding <=600px wide, fixed bar, >=24px gap
  ok 13 › e2e/screenshots.spec.ts: captures dashboard, chat, and advisory at 1440px and 390px
  ok 14 › e2e/smoke.spec.ts: completes 3-step onboarding and renders clean air action plan
  ok 15 › e2e/smoke.spec.ts: no horizontal overflow at 390px (mobile) and 1440px viewports
  ok 16 › e2e/smoke.spec.ts: mobile 390px guidance sentence fully readable without scrolling
  ok 17 › e2e/theme-and-typography.spec.ts: toggles theme to dark, light, system with persistence
  ok 18 › e2e/theme-and-typography.spec.ts: verifies no visible text is smaller than 13px

  18 passed (14.0s)
```

---

### 5. Measured TypeScript & ESLint Output

```
> npx tsc --noEmit
(Completed with exit code 0, 0 type errors)

> npm run lint
> eslint
(Completed with exit code 0, 0 errors, 0 warnings)
```

---

### 6. Test File Mapping

| Test Spec / File | Target Domain & Core Coverage |
| :--- | :--- |
| `src/test/air-quality-cache-index.test.ts` | 15-min TTL cache, memory capacity bounding, CPCB index prioritization |
| `src/test/air-quality-client.test.ts` | Google Maps Air Quality API client, timeouts, 24-hr period requests |
| `src/test/air-quality-route.test.ts` | GET /api/air-quality validation, error masking, rate limit headers |
| `src/test/air-quality-service.test.ts` | Source cascade (WAQI -> Google -> Open-Meteo), PIN code geocoding |
| `src/test/aqi-sync.test.tsx` | Synchronizing headline AQI with chart first bar and category labels |
| `src/test/chat-advisory-rate.test.ts` | Chat rate limits, bilingual advisory generation, medical disclaimers |
| `src/test/chat-header-source.test.tsx` | Verified source label and localized timestamp in assistant header |
| `src/test/chat-tools-exec.test.ts` | Air quality, impact calculation, and catalogue tool execution |
| `src/test/code-quality-fixes.test.ts` | Nominatim server-side reverse geocoding, bound cache, coordinate validation |
| `src/test/components-advisory-dialog.test.tsx` | Modal focus trapping, escape key restoration, Hindi lang tagging |
| `src/test/components-cards.test.tsx` | Card accessibility, ARIA live regions, contrast tokens |
| `src/test/components-form.test.tsx` | Onboarding fieldsets, radio groups, keyboard navigation, validation alerts |
| `src/test/cpcb-aqi.test.ts` | Official Indian CPCB piecewise linear calculation (0-500 scale) |
| `src/test/daily-timeline.test.ts` | Timeline period bucketing, past action badges, completion toggle |
| `src/test/forecast-advice-clock.test.ts` | Rolling 24-hr advice window, future waking hours selection |
| `src/test/four-fixes-validation.test.tsx` | UI edge cases, coordinate resets, layout constraints |
| `src/test/gemini-client-version-and-logging.test.ts` | SDK v1beta API version enforcement, error redaction, logging |
| `src/test/gemini-models-chain.test.ts` | GEMINI_MODELS ordered fallback chain, daily quota skipping, 404/400 handling |
| `src/test/gemini-resilience.test.ts` | Exponential backoff on 429/503, non-retryable 401/403 errors |
| `src/test/household-personalization.test.ts` | Household sizing, vulnerable members, commute profile adaptation |
| `src/test/impact-catalogue.test.ts` | Catalogue integrity, fitted N95 efficiency, outdoor exercise shifts |
| `src/test/impact-corrections.test.ts` | Sequential overlap discounting, dose baseline bounds, zero PM2.5 handling |
| `src/test/impact-edge-cases.test.ts` | Non-car households, clean ambient air baseline, occupant scaling |
| `src/test/impact-indoor-swaps.test.ts` | HEPA filtration, exhaust ventilation, incense cessation, transit swaps |
| `src/test/kozhikode-fixes.test.ts` | Reverse geocoding display name vs lookup coordinate separation |
| `src/test/layout-polish-fixes.test.tsx` | 600px onboarding column, sticky action bar gap, outline suppression |
| `src/test/live-evaluator-queries.test.ts` | Live network queries for 5 cities via Open-Meteo (`npm run test:live`) |
| `src/test/logger-control-flow.test.ts` | Next.js prerender bailout passthrough, key redaction in error logs |
| `src/test/measurement-time-utc.test.tsx` | Server UTC vs local time zone formatting agreement |
| `src/test/mobile-guidance-visibility.test.tsx` | Mobile guidance visibility without scrolling at 390px viewport |
| `src/test/plan-consistency.test.ts` | Mutual exclusivity of WFH and commute swaps, rank ordering |
| `src/test/plan-generation.test.ts` | Structured plan generation, prompt constraints, rule fallback |
| `src/test/plan-validation.test.ts` | Zod schema validation, coordinate format check, place length |
| `src/test/quota-and-cache.test.tsx` | 30-min plan caching, community advisory caching, daily quota UI |
| `src/test/rate-limit-proxy.test.ts` | Ingress proxy parsing, TRUSTED_PROXY_HOPS, sliding window capping |
| `src/test/reverse-geocode-route.test.ts` | GET /api/reverse-geocode endpoint, 30 req/min rate limit |
| `src/test/security.test.ts` | 64KB body limiting, CSP directives, route-level 429 enforcement |
| `src/test/security-headers-real.test.ts` | Elimination of unsafe-eval and external connect-src, Cloud Run IP trust |
| `src/test/timezone.test.ts` | Coordinate timezone auto resolution, fallback to Asia/Kolkata |
| `src/test/usability-onboarding.test.tsx` | 3-step onboarding flow, coordinate clearing on place edit |
| `src/test/usability-timeline.test.tsx` | Focus management on plan load, localStorage progress sync |
| `src/test/use-onboarding-location.test.tsx` | Browser geolocation hook, error recovery, reverse geocoding |
| `src/test/waqi-client.test.ts` | WAQI CPCB ground station querying, fallback to Open-Meteo |
| `e2e/chat-real.spec.ts` | Real unmocked end-to-end chat queries and API responses |
| `e2e/layout-fixes.spec.ts` | Padding, outline suppression, and chart typography on mobile |
| `e2e/modals-and-security.spec.ts` | Mobile chat sheet, advisory modal, and live HTTP security headers |
| `e2e/onboarding-reference-and-switch.spec.ts` | Onboarding dimensions, fixed footer bar, floating view switch |
| `e2e/screenshots.spec.ts` | Screenshot capture across light/dark themes and mobile/desktop |
| `e2e/smoke.spec.ts` | Full onboarding to plan smoke test and horizontal overflow check |
| `e2e/theme-and-typography.spec.ts` | Light, Dark, System theme switching and >=13px font scale audit |

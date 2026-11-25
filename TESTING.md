# Testing Strategy & Verification Report

This document records the testing architecture of **SaafHawa** and includes exact, unedited command execution outputs measured directly from the repository.

---

### 1. Test Architecture Overview

- **Unit & Integration Suite (Vitest):** Tests cover input validation, rate limiting with trusted proxy hops, deterministic physical arithmetic, Gemini structured prompt building, fallback engines, security headers, request body limits, component accessibility, focus management, Open-Meteo keyless client, WAQI ground station client, CPCB piecewise linear breakpoints, rolling 24-hr forecast logic, waking hours advice, timeline grouping, Indian PIN code resolution, and live evaluator cities.
  - Test files located in [`src/test/`](src/test/).
  - Executed via `npm test` using JSDOM environment.
- **End-to-End Smoke Suite (Playwright):** Validates the user onboarding flow through to plan generation against a Next.js server with mocked API endpoints, mobile chat sheets, WhatsApp community advisories, viewport containment, and production security headers sent over HTTP.
  - Test files located in [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts) and [`e2e/modals-and-security.spec.ts`](e2e/modals-and-security.spec.ts).
  - Executed via `npm run test:e2e`.

---

### 2. Measured Vitest Output (172 Tests Across 29 Test Files)

```
> saafhawa@0.1.0 test
> vitest run

 RUN  v5.1.1 C:/Users/USER/Desktop/Learn/SAAFHAWA

 ✓ src/test/security-headers-real.test.ts (9 tests)
 ✓ src/test/air-quality-client.test.ts (6 tests)
 ✓ src/test/chat-tools-exec.test.ts (13 tests)
 ✓ src/test/usability-onboarding.test.tsx (2 tests)
 ✓ src/test/components-advisory-dialog.test.tsx (2 tests)
 ✓ src/test/plan-generation.test.ts (6 tests)
 ✓ src/test/wording-sample-data.test.tsx (5 tests)
 ✓ src/test/components-cards.test.tsx (7 tests)
 ✓ src/test/usability-timeline.test.tsx (4 tests)
 ✓ src/test/components-form.test.tsx (4 tests)
 ✓ src/test/air-quality-service.test.ts (5 tests)
 ✓ src/test/chat-advisory-rate.test.ts (8 tests)
 ✓ src/test/forecast-advice-clock.test.ts (4 tests)
 ✓ src/test/air-quality-route.test.ts (4 tests)
 ✓ src/test/timezone.test.ts (6 tests)
 ✓ src/test/plan-consistency.test.ts (4 tests)
 ✓ src/test/impact-corrections.test.ts (9 tests)
 ✓ src/test/security.test.ts (10 tests)
 ✓ src/test/plan-validation.test.ts (6 tests)
 ✓ src/test/rate-limit-proxy.test.ts (8 tests)
 ✓ src/test/impact-edge-cases.test.ts (4 tests)
 ✓ src/test/impact-indoor-swaps.test.ts (7 tests)
 ✓ src/test/air-quality-cache-index.test.ts (6 tests)
 ✓ src/test/impact-catalogue.test.ts (7 tests)
 ✓ src/test/cpcb-aqi.test.ts (12 tests)
 ✓ src/test/logger-control-flow.test.ts (5 tests)
 ✓ src/test/waqi-client.test.ts (3 tests)
 ✓ src/test/daily-timeline.test.ts (5 tests)
 ✓ src/test/live-evaluator-queries.test.ts (1 test)

 Test Files  29 passed (29)
      Tests  172 passed (172)
   Duration  6.11s
```

---

### 3. Measured Playwright E2E Output (5 Tests Across 2 Spec Files)

```
> saafhawa@0.1.0 test:e2e
> playwright test

Running 5 tests using 1 worker

  ok 1 [chromium] › e2e\modals-and-security.spec.ts:5:3 › Modals, Chat & Security Headers › mobile floating Ask Assistant button opens full-height chat sheet with suggested chips (411ms)
  ok 2 [chromium] › e2e\modals-and-security.spec.ts:41:3 › Modals, Chat & Security Headers › community advisory modal displays WhatsApp preview card and copy button (405ms)
  ok 3 [chromium] › e2e\modals-and-security.spec.ts:84:3 › Modals, Chat & Security Headers › serves strict security headers without unsafe-eval and without x-powered-by (20ms)
  ok 4 [chromium] › e2e\smoke.spec.ts:5:3 › SaafHawa Onboarding & Plan Smoke Test › completes 3-step onboarding and renders the restructured clean air action plan (2.5s)
  ok 5 [chromium] › e2e\smoke.spec.ts:80:3 › SaafHawa Onboarding & Plan Smoke Test › no horizontal overflow at 390px (mobile) and 1440px (desktop) viewports (305ms)

  5 passed (5.4s)
```

---

### 4. Measured TypeScript & ESLint Output

```
> npx tsc --noEmit
(Completed with exit code 0, 0 type errors)

> npm run lint
> eslint
(Completed with exit code 0, 0 errors, 0 warnings)
```

---

### 5. Test File Mapping

| Test File | Description | Core Coverage |
| :--- | :--- | :--- |
| [`src/test/security.test.ts`](src/test/security.test.ts) | Security baseline | Request body limit (64 KB cap), Security headers dictionary, Route-level 429 enforcement |
| [`src/test/security-headers-real.test.ts`](src/test/security-headers-real.test.ts) | Header realization & IP extraction | Exclusion of `'unsafe-eval'`, `poweredByHeader: false`, Cloud Run rightmost IP in `x-forwarded-for`, port stripping, rate limiter map capping and pruning |
| [`src/test/air-quality-cache-index.test.ts`](src/test/air-quality-cache-index.test.ts) | Cache & Index unit tests | 15-min TTL, capacity eviction, `ind_cpcb` priority, null AQI handling |
| [`src/test/air-quality-client.test.ts`](src/test/air-quality-client.test.ts) | Google API client | Timeout handling, explicit 24h forecast period, quota/network error mapping |
| [`src/test/air-quality-service.test.ts`](src/test/air-quality-service.test.ts) | Air quality service | WAQI CPCB priority, keyless Open-Meteo default, Google fallback, Indian PIN code resolution |
| [`src/test/waqi-client.test.ts`](src/test/waqi-client.test.ts) | WAQI CPCB ground stations | Querying nearest CAAQMS ground station feed, parsing PM2.5/PM10, station attribution |
| [`src/test/air-quality-route.test.ts`](src/test/air-quality-route.test.ts) | Air quality route | GET /api/air-quality parameter validation, headers, and rate limits |
| [`src/test/cpcb-aqi.test.ts`](src/test/cpcb-aqi.test.ts) | Official CPCB AQI calculator | Piecewise linear interpolation standard (0-500 scale), PM2.5/PM10 dominance, category classification, null handling |
| [`src/test/forecast-advice-clock.test.ts`](src/test/forecast-advice-clock.test.ts) | Rolling forecast clock & advice | Fixed-clock testing at 8 AM, 1 PM, 8:30 PM, 11 PM; future waking hours selection; today vs tomorrow label |
| [`src/test/daily-timeline.test.ts`](src/test/daily-timeline.test.ts) | Timeline grouping & passed markers | "Any time today" for All Day/Setup actions, morning/afternoon/evening/night slots, passed section badges |
| [`src/test/live-evaluator-queries.test.ts`](src/test/live-evaluator-queries.test.ts) | Real live evaluator queries | Live queries for 5 cities (Delhi, Mumbai, Kolkata, Lucknow, Bengaluru) via free Open-Meteo default without keys |
| [`src/test/impact-catalogue.test.ts`](src/test/impact-catalogue.test.ts) | Catalogue & Routine arithmetic | 21 actions catalogue, N95 fitted efficiency, outdoor exercise diurnal shift |
| [`src/test/impact-indoor-swaps.test.ts`](src/test/impact-indoor-swaps.test.ts) | Indoor & Swaps arithmetic | HEPA bedroom reduction, kitchen exhaust, incense elimination, metro/cookstove swaps |
| [`src/test/impact-edge-cases.test.ts`](src/test/impact-edge-cases.test.ts) | Edge case calculations | Households with no car, zero/clean ambient air (PM2.5=5), occupant scaling |
| [`src/test/impact-corrections.test.ts`](src/test/impact-corrections.test.ts) | Impact correctness & deduplication | Overlap sequential discounting, baseline dose capping, missing/zero PM2.5, WFH exposure agreement |
| [`src/test/plan-validation.test.ts`](src/test/plan-validation.test.ts) | Plan request & prompt | Zod validation with upper bounds, place constraints, Gemini negative constraint prompt |
| [`src/test/plan-generation.test.ts`](src/test/plan-generation.test.ts) | Plan service & Route | Unknown ID rejection, calculator impact attachment, rule-based fallback, POST route |
| [`src/test/chat-tools-exec.test.ts`](src/test/chat-tools-exec.test.ts) | Chat tools | Tool execution handlers (`getAirQualityAndForecast`, `calculateActionImpact`, `listCatalogueActions`) |
| [`src/test/chat-advisory-rate.test.ts`](src/test/chat-advisory-rate.test.ts) | Rate limit & Advisory | Sliding window rate limiter, medical guidance policy, bilingual WhatsApp generator |
| [`src/test/components-form.test.tsx`](src/test/components-form.test.tsx) | Form accessibility | Semantic fieldsets, explicit input labels, keyboard Tab navigation, error alert linkage |
| [`src/test/components-advisory-dialog.test.tsx`](src/test/components-advisory-dialog.test.tsx) | Dialog focus trap | Trapping focus within dialog on Tab/Shift+Tab, restoring focus to trigger on Escape, `lang="hi"` markup |
| [`src/test/components-cards.test.tsx`](src/test/components-cards.test.tsx) | Component accessibility | `role="status"` sample notice, screen reader text equivalents, modal escape key |
| [`src/test/usability-timeline.test.tsx`](src/test/usability-timeline.test.tsx) | Timeline usability & progress | Focus on plan heading on load, daily timeline groupings, localStorage progress persistence, clean place names |
| [`src/test/usability-onboarding.test.tsx`](src/test/usability-onboarding.test.tsx) | Onboarding usability & habits | Three-step wizard, browser geolocation button, un-pre-ticked habit defaults |
| [`src/test/plan-consistency.test.ts`](src/test/plan-consistency.test.ts) | Plan consistency | Mutual exclusivity of WFH and commute swaps, benefit ranking comparison, replacement with different group |
| [`src/test/wording-sample-data.test.tsx`](src/test/wording-sample-data.test.tsx) | Sample data neutrality | Absence of "live" text across screens during sample mode, visible sample notices, adjusted totals line |
| [`src/test/rate-limit-proxy.test.ts`](src/test/rate-limit-proxy.test.ts) | Proxy hops rate limiting | `TRUSTED_PROXY_HOPS` setting, Cloud Run ingress parsing, untrusted/direct fallback to single shared bucket |
| [`src/test/timezone.test.ts`](src/test/timezone.test.ts) | Time zone lookup & formatting | Google Time Zone API resolution, fallback to Asia/Kolkata, hour formatting in location local time |
| [`src/test/logger-control-flow.test.ts`](src/test/logger-control-flow.test.ts) | Server logging & control flow | Prerender bailout suppression, Next.js control flow passthrough, sensitive key redaction |
| [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts) | E2E smoke test | Onboarding completion to dashboard rendering with mocked APIs, viewport containment checks |
| [`e2e/modals-and-security.spec.ts`](e2e/modals-and-security.spec.ts) | E2E modals & security test | Mobile chat sheet modal, WhatsApp advisory modal, live server security header inspection |

---

### 6. Real Measured Live Query Results (5 Evaluator Cities)

Executed live against Open-Meteo and Postal PIN code APIs with zero Google API keys configured:

| City & Query | Resolved Geographic Location | Live CPCB AQI | Category | Measured PM₂.₅ | Measured PM₁₀ | Dominant Pollutant | Data Source Attribution |
|---|---|---|---|---|---|---|---|
| **Delhi** (`110001`) | Delhi, National Capital Territory of Delhi, India | **121** | Moderate | 66.1 µg/m³ | 69.2 µg/m³ | PM2.5 | Open-Meteo (CAMS model) |
| **Mumbai** (`Mumbai`) | Mumbai, Maharashtra, India | **151** | Moderate | 75.2 µg/m³ | 76.6 µg/m³ | PM2.5 | Open-Meteo (CAMS model) |
| **Kolkata** (`Kolkata`) | Kolkata, West Bengal, India | **176** | Moderate | 82.7 µg/m³ | 86.4 µg/m³ | PM2.5 | Open-Meteo (CAMS model) |
| **Lucknow** (`Lucknow`) | Lucknow, Uttar Pradesh, India | **112** | Moderate | 63.3 µg/m³ | 65.9 µg/m³ | PM2.5 | Open-Meteo (CAMS model) |
| **Bengaluru** (`Bengaluru`) | Bengaluru, Karnataka, India | **6** | Good | 3.3 µg/m³ | 3.4 µg/m³ | PM2.5 | Open-Meteo (CAMS model) |

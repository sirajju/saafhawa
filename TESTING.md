# Testing Strategy & Verification Report

This document records the testing architecture of **SaafHawa** and includes exact, unedited command execution outputs measured directly from the repository.

---

### 1. Test Architecture Overview

- **Unit & Integration Suite (Vitest):** Tests cover input validation, rate limiting, deterministic physical arithmetic, Gemini structured prompt building, fallback engines, security headers, request body limits, and component accessibility.
  - Test files located in [`src/test/`](file:///src/test/).
  - Executed via `npm test` using JSDOM environment.
- **End-to-End Smoke Suite (Playwright):** Validates the user onboarding flow through to plan generation against a Next.js server with mocked API endpoints.
  - Test file located in [`e2e/smoke.spec.ts`](file:///e2e/smoke.spec.ts).
  - Executed via `npm run test:e2e`.

---

### 2. Measured Vitest Output (99 Tests)

```
> saafhawa@0.1.0 test
> vitest run

 RUN  v5.1.1 C:/Users/USER/Desktop/Learn/SAAFHAWA

 ✓ src/test/impact-corrections.test.ts (9 tests)
 ✓ src/test/air-quality-service.test.ts (3 tests)
 ✓ src/test/air-quality-route.test.ts (4 tests)
 ✓ src/test/air-quality-client.test.ts (6 tests)
 ✓ src/test/plan-validation.test.ts (6 tests)
 ✓ src/test/chat-tools-exec.test.ts (13 tests)
 ✓ src/test/chat-advisory-rate.test.ts (8 tests)
 ✓ src/test/security.test.ts (10 tests)
 ✓ src/test/components-cards.test.tsx (7 tests)
 ✓ src/test/plan-generation.test.ts (6 tests)
 ✓ src/test/components-form.test.tsx (3 tests)
 ✓ src/test/impact-indoor-swaps.test.ts (7 tests)
 ✓ src/test/impact-edge-cases.test.ts (4 tests)
 ✓ src/test/air-quality-cache-index.test.ts (6 tests)
 ✓ src/test/impact-catalogue.test.ts (7 tests)

 Test Files  15 passed (15)
      Tests  99 passed (99)
```

---

### 3. Measured Playwright E2E Output

```
> saafhawa@0.1.0 test:e2e
> playwright test

Running 1 test using 1 worker

  ok 1 [chromium] › e2e\smoke.spec.ts:99:3 › SaafHawa Onboarding & Plan Smoke Test › completes onboarding and renders the customized clean air action plan (522ms)

  1 passed (2.3s)
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
| [`src/test/security.test.ts`](file:///src/test/security.test.ts) | Security suite | Request body limit (64 KB cap), Security headers, IP rate limit enforcement |
| [`src/test/air-quality-cache-index.test.ts`](file:///src/test/air-quality-cache-index.test.ts) | Cache & Index unit tests | 15-min TTL, capacity eviction, `ind_cpcb` priority, null AQI handling |
| [`src/test/air-quality-client.test.ts`](file:///src/test/air-quality-client.test.ts) | Google API client | Timeout handling, explicit 24h forecast period, quota/network error mapping |
| [`src/test/air-quality-service.test.ts`](file:///src/test/air-quality-service.test.ts) | Air quality service | Graceful forecast failure recovery, zero-key Delhi sample fallback, geocoding |
| [`src/test/air-quality-route.test.ts`](file:///src/test/air-quality-route.test.ts) | Air quality route | GET /api/air-quality parameter validation, headers, and rate limits |
| [`src/test/impact-catalogue.test.ts`](file:///src/test/impact-catalogue.test.ts) | Catalogue & Routine arithmetic | 20 actions catalogue, N95 fitted efficiency, outdoor exercise diurnal shift |
| [`src/test/impact-indoor-swaps.test.ts`](file:///src/test/impact-indoor-swaps.test.ts) | Indoor & Swaps arithmetic | HEPA bedroom reduction, kitchen exhaust, incense elimination, metro/cookstove swaps |
| [`src/test/impact-edge-cases.test.ts`](file:///src/test/impact-edge-cases.test.ts) | Edge case calculations | Households with no car, zero/clean ambient air (PM2.5=5), occupant scaling |
| [`src/test/impact-corrections.test.ts`](file:///src/test/impact-corrections.test.ts) | Impact correctness & deduplication | Overlap sequential discounting, baseline dose capping, missing/zero PM2.5, WFH exposure agreement |
| [`src/test/plan-validation.test.ts`](file:///src/test/plan-validation.test.ts) | Plan request & prompt | Zod validation with upper bounds, place constraints, Gemini negative constraint prompt |
| [`src/test/plan-generation.test.ts`](file:///src/test/plan-generation.test.ts) | Plan service & Route | Unknown ID rejection, calculator impact attachment, rule-based fallback, POST route |
| [`src/test/chat-tools-exec.test.ts`](file:///src/test/chat-tools-exec.test.ts) | Chat tools | Tool execution handlers (`getAirQualityAndForecast`, `calculateActionImpact`, `listCatalogueActions`) |
| [`src/test/chat-advisory-rate.test.ts`](file:///src/test/chat-advisory-rate.test.ts) | Rate limit & Advisory | Sliding window rate limiter, medical guidance policy, bilingual WhatsApp generator |
| [`src/test/components-form.test.tsx`](file:///src/test/components-form.test.tsx) | Form accessibility | Semantic fieldsets, explicit input labels, keyboard navigation and submission |
| [`src/test/components-cards.test.tsx`](file:///src/test/components-cards.test.tsx) | Component accessibility | `role="status"` sample notice, screen reader text equivalents, modal escape key |
| [`e2e/smoke.spec.ts`](file:///e2e/smoke.spec.ts) | E2E smoke test | Onboarding completion to dashboard rendering with mocked APIs |

# System Efficiency & Performance Report

This document details the efficiency and resource optimization strategies implemented in **SaafHawa**, documenting measured metrics without self-awarded scores.

---

### 1. In-Memory Caching with Capacity Bounding
- **TTL Cache Implementation:** Live air quality reports are cached in memory for 15 minutes (900,000 ms) using a FIFO eviction queue capped at 300 entries: [`src/lib/air-quality/cache.ts`](src/lib/air-quality/cache.ts).
- **Network Reduction:** Duplicate queries for the same area or pincode within the 15-minute window are served instantly from memory, eliminating redundant calls to Google Maps and Google Air Quality APIs.
- **Key Normalization:** Whitespace trimming and case folding avoid duplicate cache entries for minor spelling variants: [`src/lib/air-quality/cache.ts`](src/lib/air-quality/cache.ts).

---

### 2. Next.js Standalone Build Optimization
- **Minimal Runtime Container:** Configured `output: 'standalone'` in [`next.config.ts`](next.config.ts). Turbopack bundles only the necessary server-side dependencies into `.next/standalone`, eliminating dev dependencies and unnecessary `node_modules` from production Docker containers.
- **Measured Build Output:**
  ```
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ƒ /api/air-quality
  ├ ƒ /api/chat
  ├ ƒ /api/community-advisory
  ├ ƒ /api/plan
  └ ○ /icon.svg

  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```
- **Measured Static Assets:** Client chunks in `.next/static/chunks` total 8 files (7 JavaScript chunks, 1 CSS stylesheet) with a cumulative size of 940,646 bytes (~918.6 KB uncompressed across shared dependencies, React runtime, and Tailwind stylesheet). Total `.next/static` directory size across all assets is 1,102,591 bytes (23 files).

---

### 3. Lightweight Arithmetic Engine
- **Pure Arithmetic:** Personal dose avoided ($\mu\text{g}$) and source emissions prevented ($\text{g}$) are computed using algebraic formulas directly in TypeScript without loading external mathematical or physics libraries: [`src/lib/impact/calculator.ts`](src/lib/impact/calculator.ts).
- **In-Memory Synchronous Execution:** Evaluates all 21 actions synchronously in memory via direct algebraic operations with zero external network or database dependencies.

---

### 4. Sliding Window Rate Limiting Memory Management
- **In-Memory Map Pruning & Capping:** The sliding window rate limiter stores timestamps in small integer arrays per IP, with map growth strictly capped at 5,000 keys (`maxKeys = 5000`): [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts).
- **Bounded Retention & Oldest Eviction:** Expired timestamps outside the sliding window are pruned automatically during rate limit checks. When the 5,000 key capacity is reached, the oldest key is evicted to protect against memory exhaustion attacks.

---

### 5. Client-Side Persistence
- **LocalStorage Caching:** Returning households skip the onboarding form by retrieving their profile from browser `localStorage`: [`src/app/page.tsx`](src/app/page.tsx).
- **Instant First-Time Rendering:** First-time visitors are presented with the onboarding form immediately on initial load without a loading screen flash (`isLoading: false` initial state).

---

### 6. Strict Architectural Modularity & File Size Discipline
- **Every File Strictly $\le$ 200 Lines:** Every source code file across `src/` and `e2e/` is strictly under 200 lines:
  - Complex monolithic icons split into focused submodules (`TimeIcons.tsx`, `NavIcons.tsx`, `ActionIcons.tsx`, `DomainIcons.tsx`, `VehicleIcons.tsx`).
  - Onboarding form factored into step components (`OnboardingStep1.tsx`, `CommuteFields.tsx`, `IndoorEnvironmentFields.tsx`, `OnboardingProgressBar.tsx`, `OnboardingNavFooter.tsx`).
  - Forecast charts separated into SVG renderer (`ForecastChartSvg.tsx`) and container (`ForecastChart.tsx`).
  - Air quality services cleanly separated across providers (`open-meteo-client.ts`, `waqi-client.ts`, `google-client.ts`, `google-service.ts`, `pincode-resolver.ts`, `timezone-client.ts`).
  - Playwright E2E suites split into smoke flow (`smoke.spec.ts`) and modal/security verification (`modals-and-security.spec.ts`).
- **Development & Turbopack Benefits:** Ensures high maintainability, granular tree-shaking, fast hot-module replacement (HMR), and rapid Turbopack compilation.

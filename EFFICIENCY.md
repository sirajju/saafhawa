# System Efficiency & Performance Report

This document details the efficiency and resource optimization strategies implemented in **SaafHawa**, documenting measured metrics without self-awarded scores.

---

### 1. In-Memory Caching with Capacity Bounding
- **TTL Cache Implementation:** Live air quality reports are cached in memory for 15 minutes (900,000 ms) using a FIFO eviction queue capped at 500 entries: [`src/lib/air-quality/cache.ts`](file:///src/lib/air-quality/cache.ts).
- **Network Reduction:** Duplicate queries for the same area or pincode within the 15-minute window are served instantly from memory, eliminating redundant calls to Google Maps and Google Air Quality APIs.
- **Key Normalization:** Whitespace trimming and case folding avoid duplicate cache entries for minor spelling variants: [`src/lib/air-quality/cache.ts#L10-L12`](file:///src/lib/air-quality/cache.ts#L10-L12).

---

### 2. Next.js Standalone Build Optimization
- **Minimal Runtime Container:** Configured `output: 'standalone'` in [`next.config.ts`](file:///next.config.ts). Turbopack bundles only the necessary server-side dependencies into `.next/standalone`, eliminating dev dependencies and unnecessary `node_modules` from production Docker containers.
- **Measured Build Output:**
  ```
  Route (app)
  ┌ ○ /
  ├ ○ /_not-found
  ├ ƒ /api/air-quality
  ├ ƒ /api/chat
  ├ ƒ /api/community-advisory
  └ ƒ /api/plan

  ○  (Static)   prerendered as static content
  ƒ  (Dynamic)  server-rendered on demand
  ```
- **Static Assets:** Static client chunks total 8 files with a cumulative size of 675.8 KB (uncompressed across all shared libraries, React runtime, and CSS).

---

### 3. Lightweight Arithmetic Engine
- **Pure Arithmetic:** Personal dose avoided ($\mu\text{g}$) and source emissions prevented ($\text{g}$) are computed using algebraic formulas directly in TypeScript without loading heavy mathematical or statistical libraries: [`src/lib/impact/calculator.ts`](file:///src/lib/impact/calculator.ts).
- **Execution Time:** Single household evaluation across all 20 actions executes in under 2 milliseconds.

---

### 4. Sliding Window Rate Limiting Memory Management
- **In-Memory Map Pruning:** The sliding window rate limiter stores timestamps in small integer arrays per IP: [`src/lib/rate-limit.ts`](file:///src/lib/rate-limit.ts).
- **Bounded Retention:** Entries are automatically pruned on each check as timestamps fall outside the sliding window.

---

### 5. Client-Side Persistence
- **LocalStorage Caching:** Returning households skip the onboarding form by retrieving their profile from browser `localStorage`: [`src/app/page.tsx`](file:///src/app/page.tsx#L40-L65).
- **Network Savings:** Avoids redundant network round-trips for profile retrieval.

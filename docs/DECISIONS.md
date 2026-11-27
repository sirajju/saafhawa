# Architectural Design Decisions

This document records the core architectural and design decisions made in **SaafHawa**, documenting the rationale, alternatives considered, and trade-offs.

---

### Decision 1: Deterministic Arithmetic Engine vs. LLM Calculations

- **Context:** The application recommends smog mitigation actions and quantifies two core metrics: personal PM2.5 inhaled dose avoided ($\mu\text{g}$) and community emissions prevented ($\text{g}$ of PM2.5, $\text{g}$ of $\text{CO}_2$).
- **Decision:** All mathematical calculations, physical exposure models, and emission savings are executed strictly in pure TypeScript arithmetic ([`../src/lib/impact/calculator.ts`](../src/lib/impact/calculator.ts)), with scientific factors isolated in [`../src/lib/impact/emission-factors.ts`](../src/lib/impact/emission-factors.ts) and [`../src/lib/impact/exposure-factors.ts`](../src/lib/impact/exposure-factors.ts). Gemini is constrained via strict negative system instructions to never output, estimate, or alter numbers. Numbers are computed and attached deterministically in server code after Gemini returns action IDs.
- **Rationale:** Large Language Models are prone to arithmetic drift, inconsistent scaling, and numerical inaccuracies. In air quality health, providing inaccurate dose numbers undermines trust and clinical validity.
- **Trade-off:** The calculation models must be explicitly coded and maintained, but they are fully unit-testable and reproduce exact values for any given household input.

---

### Decision 2: Multi-Turn Function Calling for Context-Grounded Chat

- **Context:** Users ask open-ended follow-up questions in the assistant panel (e.g., "Can my daughter play outside at 5 PM?").
- **Decision:** Gemini is configured with native Function Calling declarations ([`../src/lib/chat/tools.ts`](../src/lib/chat/tools.ts)). When an action requires live data, the server intercepts the tool call, executes [`getAirQualityAndForecast`](../src/lib/chat/tools.ts) or [`calculateActionImpact`](../src/lib/chat/tools.ts), and feeds grounded observations back into the conversational context.
- **Rationale:** Prevents the LLM from fabricating current PM2.5 numbers or hourly forecasts. The model reasons over real 24-hour hourly sensor data from the active provider.
- **Trade-off:** Adds an extra round-trip API turn for tool execution, but grounds responses in real-time sensor measurements and verified calculations instead of unverified generation.

---

### Decision 3: Free Keyless Default with Multi-Provider Hierarchy

- **Context:** The application must remain operable, testable, and demonstrable in environments where neither `GOOGLE_MAPS_API_KEY`, `WAQI_TOKEN`, nor `GEMINI_API_KEY` are provided.
- **Decision:** SaafHawa implements a clean data source hierarchy:
  1. **Air Quality:** Free keyless Open-Meteo (Copernicus CAMS model) and OpenStreetMap Nominatim reverse geocoding serve as universal defaults. Optional upgrades prioritize nearest CPCB CAAQMS ground stations when `WAQI_TOKEN` is configured, or Google Air Quality API when `GOOGLE_MAPS_API_KEY` is set.
  2. **AI & Planning:** `GEMINI_API_KEY` is optional. When configured, SaafHawa queries candidate models defined in `GEMINI_MODELS` (`gemini-flash-lite-latest,gemini-2.5-flash-lite,gemini-3.8-flash`) using the `@google/genai` `v1beta` API. When keys are unset or daily limits are exhausted, deterministic rule-based planning ([`../src/lib/plan/fallback.ts`](../src/lib/plan/fallback.ts)) automatically provides tailored interventions with honest UI status.
- **Rationale:** Eliminates setup friction for evaluators, ensures complete live real-time coverage across any Indian location without paid API keys, and guarantees that test suites never depend on paid quotas or external billing.
- **Trade-off:** Model output depends on API availability; transparent rule-based fallback ensures reliable uninterrupted service.

---

### Decision 4: In-Memory Sliding Window Rate Limiting and Strict Body Caps

- **Context:** Every public API route must defend against denial-of-service, request flooding, and memory exhaustion without requiring an external Redis infrastructure dependency.
- **Decision:** We implemented an in-memory sliding window rate limiter ([`../src/lib/rate-limit.ts`](../src/lib/rate-limit.ts)) per client IP with strict capacity caps, paired with a request body validator ([`../src/lib/security.ts`](../src/lib/security.ts)) that enforces a 64 KB hard limit before payload processing.
- **Rationale:** Keeps deployment zero-dependency and lightweight for cloud containers while preventing oversized JSON bombs or rapid endpoint abuse.
- **Trade-off:** In a multi-replica autoscaling cluster, sliding windows are tracked per container instance unless backed by a distributed store.

---

### Decision 5: Standalone Container Output with Strict Security Headers

- **Context:** Deployment to Google Cloud Run and hardened container environments.
- **Decision:** Next.js `output: 'standalone'` is enabled in [`../next.config.ts`](../next.config.ts) for container builds (it is skipped on Vercel, which packages the app itself), generating a minimal Node.js server bundle with all security headers injected via Next.js response headers ([`../src/lib/security.ts`](../src/lib/security.ts)), including Content-Security-Policy (CSP), HSTS, X-Frame-Options, and X-Content-Type-Options.
- **Rationale:** Drastically reduces Docker image size, removes dev dependencies from runtime containers, and ensures security policy compliance at the edge.

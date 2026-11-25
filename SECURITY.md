# Security Policy & Implementation

This document details the security controls implemented in **SaafHawa**, linking each mechanism directly to the source code implementing and testing it.

---

### 1. Zero Browser Exposure of API Keys
- All calls to Google Air Quality API, Google Geocoding API, and Google Gen AI (Gemini) are strictly executed on the server inside API route handlers.
- Environment variables (`GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`, and optional fallback `AI_API_KEY`) do not use the `NEXT_PUBLIC_` prefix, preventing Next.js from bundling them into client-side JavaScript.
- Implementation: [`src/lib/air-quality/service.ts`](src/lib/air-quality/service.ts), [`src/lib/plan/service.ts`](src/lib/plan/service.ts), [`src/lib/chat/service.ts`](src/lib/chat/service.ts).

### 2. Request Body Size Limits (Anti-DoS)
- All POST endpoints enforce a hard request body limit of 65,536 bytes (64 KB) via `readJsonBodyWithLimit`.
- Payloads with an declared `Content-Length` header exceeding 64 KB are rejected upfront with HTTP 413 (Payload Too Large). The received body is verified via `TextEncoder` byte measurement.
- Malformed or empty JSON payloads are caught and returned as HTTP 400 without leaking server stack traces.
- Implementation: [`src/lib/security.ts`](src/lib/security.ts).
- Verification: [`src/test/security.test.ts`](src/test/security.test.ts).

### 3. Per-IP Sliding Window Rate Limiting & Cloud Run Proxy Hop Assumptions
- Every API endpoint is protected by an in-memory sliding window rate limiter:
  - `GET /api/air-quality`: 60 requests per minute ([`src/app/api/air-quality/route.ts`](src/app/api/air-quality/route.ts))
  - `POST /api/plan`: 30 requests per minute ([`src/app/api/plan/route.ts`](src/app/api/plan/route.ts))
  - `POST /api/chat`: 15 requests per minute ([`src/app/api/chat/route.ts`](src/app/api/chat/route.ts))
  - `POST /api/community-advisory`: 20 requests per minute ([`src/app/api/community-advisory/route.ts`](src/app/api/community-advisory/route.ts))
- **Cloud Run Trusted Proxy Hops & Architecture Assumptions:**
  - **Direct Cloud Run Ingress (`*.run.app`):** Cloud Run's Google Front End (GFE) appends the verified caller IP as the last entry in `X-Forwarded-For`: `client-supplied-values, Google-observed-client-IP`. The default setting is `TRUSTED_PROXY_HOPS=1` (1 hop from the right).
  - **Behind Google Cloud Load Balancer (Serverless NEG):** The load balancer prepends the client IP and appends its own forwarding rule IP: `client-supplied-values, CLIENT_IP, LOAD_BALANCER_IP`. When running behind an external application load balancer, configure `TRUSTED_PROXY_HOPS=2`.
  - **What Happens When Running Without a Proxy (or Unknown Setup):** If the application runs directly on a host or container without a trusted reverse proxy in front of it, or if `TRUSTED_PROXY_HOPS` is set to `0` or `'unknown'`, client-provided `X-Forwarded-For` or `X-Real-IP` headers can be arbitrarily forged. To prevent attackers from bypassing rate limits by rotating fake IP headers, the rate limiter falls back to a **single shared limit key** (`shared_untrusted_client`). All unproxied requests share this single quota bucket rather than trusting spoofable headers.
  - If an incoming `X-Forwarded-For` header contains fewer hops than configured, it is treated as an unexpected proxy chain and also safely falls back to the single shared limit.
- **Memory Bounding & Eviction:** The internal map is capped at 5,000 keys (`maxKeys`). Expired timestamps are pruned automatically on check, and the oldest entry is evicted if the cap is reached.
- Exceeded limits return HTTP 429 with standard `Retry-After` headers.
- Implementation: [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts).
- Verification: [`src/test/security.test.ts`](src/test/security.test.ts), [`src/test/security-headers-real.test.ts`](src/test/security-headers-real.test.ts), [`src/test/chat-advisory-rate.test.ts`](src/test/chat-advisory-rate.test.ts).

### 4. Single Definition of Security Headers & Server Inspection
- A single canonical list of security headers (`SECURITY_HEADERS_LIST`) is maintained in [`src/lib/security.ts`](src/lib/security.ts) and imported directly into [`next.config.ts`](next.config.ts):
  - `Content-Security-Policy`: Strictly excludes `'unsafe-eval'`; restricts `script-src` to `'self' 'unsafe-inline'`, preventing arbitrary code execution.
  - `X-Frame-Options: DENY`: Prevents clickjacking in iframes.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `Referrer-Policy: origin-when-cross-origin`: Restricts referrer transmission.
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`: Enforces HTTPS (HSTS).
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`: Disables sensitive hardware APIs.
  - `poweredByHeader: false`: Explicitly disables the `X-Powered-By: Next.js` fingerprint header in [`next.config.ts`](next.config.ts).
- Verification: [`src/test/security-headers-real.test.ts`](src/test/security-headers-real.test.ts), and live server verification in [`e2e/smoke.spec.ts`](e2e/smoke.spec.ts).

### 5. Secret-Redacted Server Error Logging & Control-Flow Exception Handling
- Server-side exceptions are logged via `logServerError(context, error)` ([`src/lib/logger.ts`](src/lib/logger.ts)), which strips sensitive API keys, auth tokens, and secret patterns from messages and stack traces. Errors are never swallowed silently.
- **Next.js Internal Control-Flow Propagation:** Internal Next.js control-flow exceptions (such as dynamic prerender bailouts via `NEXT_PRERENDER_INTERRUPTED`, `DYNAMIC_SERVER_USAGE`, `NEXT_REDIRECT`, and `NEXT_NOT_FOUND`) are identified via `isNextControlFlowError` and allowed to propagate through route handlers unchanged. They are never logged to console or treated as application crashes, preserving clean production builds.
- Implementation: [`src/lib/logger.ts`](src/lib/logger.ts), used across all API route handlers.
- Verification: [`src/test/logger-control-flow.test.ts`](src/test/logger-control-flow.test.ts).

### 6. External Call Timeouts & Output Caps
- All generative AI calls to Google Gemini are bounded by a 15-second abort timeout via `withTimeout` to prevent thread hanging on degraded upstream connections.
- Output response strings are truncated to length limits (e.g. 2,500 characters for advisories, 3,000 for chat responses) via `capTextLength`.
- Implementation: [`src/lib/gemini-utils.ts`](src/lib/gemini-utils.ts), integrated into [`src/lib/plan/gemini-client.ts`](src/lib/plan/gemini-client.ts), [`src/lib/community/advisory-generator.ts`](src/lib/community/advisory-generator.ts), and [`src/lib/chat/service.ts`](src/lib/chat/service.ts).

### 7. Input Validation & Strict Allow-Lists
- All inputs are parsed and sanitized using strict Zod schemas before being passed to business logic:
  - Location queries capped at 120 characters: [`src/lib/air-quality/types.ts`](src/lib/air-quality/types.ts)
  - Chat messages capped at 500 characters: [`src/lib/chat/types.ts`](src/lib/chat/types.ts)
  - Household profile demographics with realistic upper bounds (e.g., adults max 15, children max 10, distance max 300 km, area max 25,000 sq ft): [`src/lib/plan/types.ts`](src/lib/plan/types.ts)
  - Single query parameter accepted (`place` only): [`src/app/api/air-quality/route.ts`](src/app/api/air-quality/route.ts)
- Verification: [`src/test/plan-validation.test.ts`](src/test/plan-validation.test.ts).

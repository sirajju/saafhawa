# Security Policy & Implementation

This document details the security controls implemented in **SaafHawa**, linking each mechanism directly to the source code implementing and testing it.

---

### 1. Zero Browser Exposure of API Keys
- All calls to Google Air Quality API, Google Geocoding API, and Google Gen AI (Gemini) are strictly executed on the server inside API route handlers.
- Environment variables (`GOOGLE_MAPS_API_KEY`, `GEMINI_API_KEY`) do not use the `NEXT_PUBLIC_` prefix, preventing Next.js from bundling them into client-side JavaScript.
- Implementation: [`src/lib/air-quality/service.ts`](file:///src/lib/air-quality/service.ts), [`src/lib/plan/service.ts`](file:///src/lib/plan/service.ts), [`src/lib/chat/service.ts`](file:///src/lib/chat/service.ts).

### 2. Request Body Size Limits (Anti-DoS)
- All POST endpoints enforce a hard request body limit of 65,536 bytes (64 KB) via a chunk-counting streaming reader.
- Payloads exceeding 64 KB are terminated with HTTP 413 (Payload Too Large) without buffering into memory.
- Malformed JSON is caught and returned as HTTP 400 without leaking server stack traces.
- Implementation: [`src/lib/security.ts`](file:///src/lib/security.ts#L42-L73).
- Verification: [`src/test/security.test.ts`](file:///src/test/security.test.ts).

### 3. Per-IP Sliding Window Rate Limiting
- Every API endpoint is protected by an in-memory sliding window rate limiter tracking client IP addresses extracted from `x-forwarded-for` and `x-real-ip` headers:
  - `GET /api/air-quality`: 60 requests per minute ([`src/app/api/air-quality/route.ts`](file:///src/app/api/air-quality/route.ts))
  - `POST /api/plan`: 15 requests per minute ([`src/app/api/plan/route.ts`](file:///src/app/api/plan/route.ts))
  - `POST /api/chat`: 20 requests per minute ([`src/app/api/chat/route.ts`](file:///src/app/api/chat/route.ts))
  - `POST /api/community-advisory`: 20 requests per minute ([`src/app/api/community-advisory/route.ts`](file:///src/app/api/community-advisory/route.ts))
- Exceeded limits return HTTP 429 with standard `Retry-After` headers.
- Implementation: [`src/lib/rate-limit.ts`](file:///src/lib/rate-limit.ts).
- Verification: [`src/test/security.test.ts`](file:///src/test/security.test.ts), [`src/test/chat-advisory-rate.test.ts`](file:///src/test/chat-advisory-rate.test.ts).

### 4. Input Validation & Strict Allow-Lists
- All inputs are parsed and sanitized using strict Zod schemas before being passed to business logic:
  - Location queries capped at 120 characters to prevent buffer and URI abuse: [`src/lib/air-quality/types.ts`](file:///src/lib/air-quality/types.ts)
  - Chat messages capped at 500 characters: [`src/lib/chat/types.ts`](file:///src/lib/chat/types.ts)
  - Household profile demographic bounds enforced: [`src/lib/plan/types.ts`](file:///src/lib/plan/types.ts)
  - Single query parameter accepted (`place` only): [`src/app/api/air-quality/route.ts`](file:///src/app/api/air-quality/route.ts)

### 5. Sensitive Error Masking
- Upstream Google API errors (e.g. `OVER_QUERY_LIMIT`, raw quota strings, stack traces) are intercepted by custom error classes and mapped to clean, user-friendly messages:
  - Quota errors map to HTTP 429: [`src/lib/air-quality/types.ts`](file:///src/lib/air-quality/types.ts#L24-L29)
  - Network timeouts map to HTTP 503: [`src/lib/air-quality/types.ts`](file:///src/lib/air-quality/types.ts#L31-L36)
- Raw provider internals are never forwarded to the client.
- Verification: [`src/test/air-quality-service-route.test.ts`](file:///src/test/air-quality-service-route.test.ts).

### 6. Security Headers & Content Security Policy (CSP)
- HTTP response headers configured on all responses:
  - `Content-Security-Policy`: Restricts scripts, styles, frames, and connects to self and trusted endpoints.
  - `X-Frame-Options: DENY`: Prevents clickjacking in iframes.
  - `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
  - `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer transmission.
  - `Strict-Transport-Security`: Enforces HTTPS (HSTS).
  - `Permissions-Policy`: Disables unused device APIs (geolocation, microphone, camera).
- Implementation: [`src/lib/security.ts`](file:///src/lib/security.ts#L10-L36), [`next.config.ts`](file:///next.config.ts).
- Verification: [`src/test/security.test.ts`](file:///src/test/security.test.ts).

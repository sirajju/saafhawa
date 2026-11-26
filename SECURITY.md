# Security Policy & Implementation

This document details the security architecture and controls implemented in **SaafHawa**, linking each mechanism directly to the source code implementing and testing it.

---

### 1. Zero Browser Exposure of API Keys & Server-Side Delegation

- All external API calls (Open-Meteo, OpenStreetMap Nominatim, WAQI CPCB ground stations, Google Maps, and Google Gemini AI) are executed strictly on the server inside Next.js route handlers.
- Environment variables (`GOOGLE_MAPS_API_KEY`, `WAQI_TOKEN`, `GEMINI_API_KEY`, `GEMINI_MODELS`) do not use the `NEXT_PUBLIC_` prefix, preventing Next.js from bundling credentials into client JavaScript.
- **Keyless Default Operation:** The application defaults to keyless Open-Meteo (Copernicus CAMS model) and Nominatim reverse geocoding, operating with full real-time functionality without requiring API keys or payment.
- Implementation: [`src/lib/air-quality/open-meteo-client.ts`](src/lib/air-quality/open-meteo-client.ts), [`src/lib/air-quality/reverse-geocoder.ts`](src/lib/air-quality/reverse-geocoder.ts), [`src/lib/plan/service.ts`](src/lib/plan/service.ts), [`src/lib/chat/service.ts`](src/lib/chat/service.ts).

---

### 2. Request Body Size Limits & Timeouts

- **64 KB Hard Payload Cap:** All POST endpoints enforce a 65,536-byte (64 KB) body size cap via `readJsonBodyWithLimit`. Declared `Content-Length` > 64 KB is rejected upfront with HTTP 413, and actual body bytes are measured with `TextEncoder` before JSON parsing: [`src/lib/security.ts`](src/lib/security.ts).
- **Content-Type Strictness (HTTP 415):** In `readJsonBodyWithLimit`, all incoming POST requests must have a `Content-Type` header starting with `application/json`. Requests with missing or alternative content types (such as `text/plain` or `application/x-www-form-urlencoded`) are rejected with HTTP 415 Unsupported Media Type, preventing cross-origin simple-request CSRF abuse from consuming Gemini quota.
- **Execution Timeouts:** Gemini API calls are bounded by 15-second timeouts with retries constrained to keep total attempt latency under 25 seconds: [`src/lib/gemini-utils.ts`](src/lib/gemini-utils.ts).
- **Output Length Bounds:** Model output strings are strictly capped (2,500 characters for advisories, 3,000 characters for chat responses) to mitigate prompt injection buffer overflows.

---

### 3. Server-Side Reverse Geocoding & Privacy

- Browser GPS coordinates are reverse-geocoded entirely server-side via `GET /api/reverse-geocode?lat=...&lon=...`: [`src/app/api/reverse-geocode/route.ts`](src/app/api/reverse-geocode/route.ts).
- **Zod Validation & Safe Logging:** `lat` and `lon` query parameters are strictly validated with Zod (max 40 chars, finite numeric regex rejecting values like `"12abc"`, bounded between $[-90, 90]$ and $[-180, 180]$). Upstream geocoding exceptions are logged securely via `logServerError`.
- **Nominatim Fair Use:** Queries OpenStreetMap Nominatim with an identifying User-Agent (`SaafHawa/0.1.0`), an in-memory queue enforcing Nominatim's 1 request/second policy, and a 50-entry bounded LRU cache: [`src/lib/air-quality/reverse-geocoder.ts`](src/lib/air-quality/reverse-geocoder.ts).
- **No Third-Party Client Calls:** The browser never contacts third-party geocoding APIs directly.

---

### 4. Sliding Window Rate Limiting & Proxy Trust Model

- Every endpoint enforces an in-memory sliding window rate limit per client IP:
  - `GET /api/air-quality`: 60 requests/min
  - `GET /api/reverse-geocode`: 30 requests/min
  - `POST /api/plan`: 30 requests/min
  - `POST /api/chat`: 15 requests/min
  - `POST /api/community-advisory`: 20 requests/min
- **Client IP Resolution on Vercel vs Docker / Google Cloud Run:**
  - **Vercel:** Vercel edge infrastructure manages and provides verified visitor IPs parsed from `x-forwarded-for` (first entry) or `x-real-ip`.
  - **Cloud Run / Docker (`TRUSTED_PROXY_HOPS`):** Cloud Run Google Front End (GFE) appends verified caller IPs to `X-Forwarded-For`. Setting `TRUSTED_PROXY_HOPS=1` (default) extracts the rightmost IP (`parts[parts.length - hops]`). When behind a Google Cloud Load Balancer (Serverless NEG), `TRUSTED_PROXY_HOPS=2` is used.
  - **Untrusted / Direct Fallback:** If `TRUSTED_PROXY_HOPS=0` or incoming headers have fewer hops than expected, requests fall back to the real shared quota key `127.0.0.1` (`SHARED_UNTRUSTED_KEY`), preventing attackers from spoofing IPs to bypass rate limits.
- **Instance-Level State:** Rate limit maps and caches operate in-memory per serverless/container instance with automatic capacity caps (5,000 keys for rate limits, 100 entries for AQI cache, 50 entries for reverse geocode cache) and LRU/TTL eviction to prevent memory exhaustion: [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts).

---

### 5. Content Security Policy & Production Security Headers

A canonical header configuration (`SECURITY_HEADERS_LIST`) in [`src/lib/security.ts`](src/lib/security.ts) is injected via [`next.config.ts`](next.config.ts):

| Header | Production Directive / Value | Purpose |
| :--- | :--- | :--- |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; worker-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;` | Blocks arbitrary script execution, restricts network connections and workers to `'self'`, enforces HTTPS upgrades, and prohibits plugins, embedded frames, inline event attributes, and form redirects. |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS with 2-year HSTS preload. |
| `X-Frame-Options` | `DENY` | Prevents UI redressing and clickjacking. |
| `X-Content-Type-Options` | `nosniff` | Disables MIME-type sniffing. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full referrer to same-origin requests, origin-only on cross-origin HTTPS requests, and no referrer to insecure destinations. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | Restricts hardware APIs; allows geolocation for self origin only. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolates browsing context from cross-origin documents. |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents external origins from embedding application resources. |
| `X-Permitted-Cross-Domain-Policies` | `none` | Prevents Flash and PDF cross-domain policy file loading. |
| `X-DNS-Prefetch-Control` | `off` | Disables speculative DNS prefetching to protect user privacy. |
| `poweredByHeader` | `false` | Strips Next.js server fingerprinting header. |

---

### 6. Secret Redaction & Safe Error Logging

- Server exceptions are sanitized via `logServerError(context, error)` ([`src/lib/logger.ts`](src/lib/logger.ts)), stripping API keys, tokens, and query credentials from logs and stack traces.
- Upstream error messages from Open-Meteo and WAQI monitoring APIs are kept generic for client responses; raw provider names and status codes remain in server logs only.
- Next.js dynamic control-flow exceptions (`NEXT_PRERENDER_INTERRUPTED`, `DYNAMIC_SERVER_USAGE`, `NEXT_REDIRECT`, `NEXT_NOT_FOUND`) propagate cleanly without console noise.

---

### 7. Input Validation & Bounds

- Incoming payloads are validated with strict Zod schemas before processing:
  - Query parameters: single `place` query, maximum 120 characters ([`src/lib/air-quality/types.ts`](src/lib/air-quality/types.ts)).
  - Reverse geocoding: `lat` and `lon` validated with Zod (max 40 chars, finite numeric regex, range bounds).
  - Coordinates: strictly validated as `lat, lon` numeric strings with max length 40.
  - Chat input: maximum 500 characters ([`src/lib/chat/types.ts`](src/lib/chat/types.ts)).
  - Demographics: realistic bounds on adults, children, seniors, commute distance, and floor area ([`src/lib/plan/types.ts`](src/lib/plan/types.ts)).

---

### 8. Known Limitations

- **Inline Scripts (`script-src 'unsafe-inline'`):** Next.js statically generated pages and React hydration runtimes inject inline scripts into initial HTML. Implementing dynamic CSP nonces requires server-side rendering on every page request, which would disable static prerendering, edge caching, and offline PWA capabilities. To mitigate this constraint, `script-src-attr 'none'` strictly forbids inline event handlers (e.g. `onclick`), while `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'` provide layered defense-in-depth against XSS.

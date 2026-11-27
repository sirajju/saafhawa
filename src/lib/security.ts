import { type NextRequest, NextResponse } from 'next/server';

/**
 * Global maximum payload size for incoming API requests: 64 Kilobytes.
 * Mitigates denial-of-service via memory exhaustion or regex evaluation on oversized JSON.
 */
export const MAX_REQUEST_BODY_BYTES = 64 * 1024; // 64 KB

export const SECURITY_HEADERS_LIST = [
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self';",
      "script-src 'self' 'unsafe-inline';",
      "script-src-attr 'none';",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data: https:;",
      "font-src 'self';",
      "connect-src 'self';",
      "worker-src 'self';",
      "frame-ancestors 'none';",
      "object-src 'none';",
      "base-uri 'self';",
      "form-action 'self';",
    ].join(' '),
  },
] as const;

export const SECURITY_HEADERS: Record<string, string> = Object.fromEntries(
  SECURITY_HEADERS_LIST.map((h) => [h.key, h.value])
);

/**
 * Validates request payload size and safely parses JSON.
 * Returns HTTP 413 if the payload exceeds maxBytes, or HTTP 400 if JSON is malformed.
 */
export async function readJsonBodyWithLimit<T = unknown>(
  request: NextRequest,
  maxBytes: number = MAX_REQUEST_BODY_BYTES
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  // 1. Verify Content-Type starts with application/json (prevents simple CSRF / text-plain abuse)
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return {
      error: NextResponse.json(
        {
          error: 'Unsupported Media Type',
          message: 'Content-Type must start with application/json.',
        },
        { status: 415 }
      ),
    };
  }

  // 2. Check Content-Length header if present
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(declaredLength) && declaredLength > maxBytes) {
      return {
        error: NextResponse.json(
          {
            error: 'Payload Too Large',
            message: `Request body exceeds the maximum permitted size of ${maxBytes} bytes.`,
          },
          { status: 413 }
        ),
      };
    }
  }

  // 2. Read text payload and enforce byte length
  let rawText = '';
  try {
    rawText = await request.text();
  } catch {
    return {
      error: NextResponse.json(
        {
          error: 'Read Error',
          message: 'Unable to read request payload stream.',
        },
        { status: 400 }
      ),
    };
  }

  const actualBytes = new TextEncoder().encode(rawText).length;
  if (actualBytes > maxBytes) {
    return {
      error: NextResponse.json(
        {
          error: 'Payload Too Large',
          message: `Request body of ${actualBytes} bytes exceeds the maximum permitted size of ${maxBytes} bytes.`,
        },
        { status: 413 }
      ),
    };
  }

  if (!rawText || rawText.trim().length === 0) {
    return {
      error: NextResponse.json(
        {
          error: 'Invalid JSON Body',
          message: 'The request body cannot be empty.',
        },
        { status: 400 }
      ),
    };
  }

  // 3. Parse JSON safely
  try {
    const parsed = JSON.parse(rawText) as T;
    return { data: parsed };
  } catch {
    return {
      error: NextResponse.json(
        {
          error: 'Invalid JSON Body',
          message: 'The request body must be valid JSON.',
        },
        { status: 400 }
      ),
    };
  }
}

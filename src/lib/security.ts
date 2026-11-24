import { NextRequest, NextResponse } from 'next/server';

/**
 * Global maximum payload size for incoming API requests: 64 Kilobytes.
 * Mitigates denial-of-service via memory exhaustion or regex evaluation on oversized JSON.
 */
export const MAX_REQUEST_BODY_BYTES = 64 * 1024; // 64 KB

export const SECURITY_HEADERS: Record<string, string> = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self';",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' data: https:;",
    "font-src 'self';",
    "connect-src 'self' https://maps.googleapis.com;",
    "frame-ancestors 'none';",
  ].join(' '),
};

/**
 * Validates request payload size and safely parses JSON.
 * Returns HTTP 413 if the payload exceeds maxBytes, or HTTP 400 if JSON is malformed.
 */
export async function readJsonBodyWithLimit<T = unknown>(
  request: NextRequest,
  maxBytes: number = MAX_REQUEST_BODY_BYTES
): Promise<{ data: T; error?: never } | { data?: never; error: NextResponse }> {
  // 1. Check Content-Length header if present
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

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AirQualityError } from '@/lib/air-quality/types';
import { logServerError, isNextControlFlowError } from '@/lib/logger';

/**
 * Standard HTTP 429 Rate Limited response with Retry-After header.
 */
export function rateLimited(resetSeconds: number, message?: string): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message:
        message || `Rate limit exceeded. Please wait ${resetSeconds} seconds before trying again.`,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(resetSeconds),
      },
    }
  );
}

/**
 * Standard structured JSON error response.
 */
export function jsonError(
  status: number,
  error: string,
  message: string,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ error, message }, { status, headers });
}

const AIR_QUALITY_ERROR_TITLES: Record<number, string> = {
  400: 'Invalid Request',
  404: 'Location Not Found',
  429: 'Too Many Requests',
  502: 'Service Error',
  503: 'Service Unavailable',
};

/**
 * Maps uncaught errors into structured HTTP error responses.
 * Propagates Next.js control-flow bailouts and logs unexpected 500 errors.
 */
export function toErrorResponse(
  scope: string,
  err: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again later.'
): NextResponse {
  if (isNextControlFlowError(err)) {
    throw err;
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0]?.message || 'Validation error.';
    return jsonError(400, 'Invalid Request', firstIssue);
  }

  if (err instanceof AirQualityError) {
    const errorTitle = AIR_QUALITY_ERROR_TITLES[err.statusCode] || 'Service Error';
    return jsonError(err.statusCode, errorTitle, err.message);
  }

  logServerError(scope, err);
  return jsonError(500, 'Internal Server Error', fallbackMessage);
}

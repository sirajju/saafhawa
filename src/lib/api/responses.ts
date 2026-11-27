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

export interface RouteErrorOptions {
  serverErrorTitle?: string;
  fallbackMessage?: string;
  zodErrorTitle?: string;
  zodErrorMessage?: string;
  airQualityTitles?: Record<number, string>;
  airQualityFallbackTitle?: string;
  treatAirQualityAsServerError?: boolean;
}

const DEFAULT_AQ_TITLES: Record<number, string> = {
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
  options?: string | RouteErrorOptions
): NextResponse {
  if (isNextControlFlowError(err)) {
    throw err;
  }

  const opts: RouteErrorOptions =
    typeof options === 'string' ? { fallbackMessage: options } : options || {};

  if (err instanceof ZodError) {
    const title = opts.zodErrorTitle || 'Validation Error';
    const message = opts.zodErrorMessage || err.issues[0]?.message || 'Validation error.';
    return jsonError(400, title, message);
  }

  if (err instanceof AirQualityError) {
    if (opts.treatAirQualityAsServerError) {
      logServerError(scope, err);
      const title = opts.serverErrorTitle || 'Internal Server Error';
      const message =
        opts.fallbackMessage || 'An unexpected error occurred. Please try again later.';
      return jsonError(500, title, message);
    }

    const title =
      opts.airQualityTitles?.[err.statusCode] ||
      opts.airQualityFallbackTitle ||
      DEFAULT_AQ_TITLES[err.statusCode] ||
      'Service Error';
    return jsonError(err.statusCode, title, err.message);
  }

  logServerError(scope, err);
  const title = opts.serverErrorTitle || 'Internal Server Error';
  const message = opts.fallbackMessage || 'An unexpected error occurred. Please try again later.';
  return jsonError(500, title, message);
}

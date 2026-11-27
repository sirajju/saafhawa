import { type NextRequest, type NextResponse } from 'next/server';
import { type z } from 'zod';
import { getClientIp, type SlidingWindowRateLimiter } from '@/lib/rate-limit';
import { readJsonBodyWithLimit } from '@/lib/security';
import { rateLimited, jsonError } from './responses';

/**
 * Personalised API responses must never be cached by browsers or CDNs.
 */
export const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' } as const;

export interface JsonRequestOptions<S extends z.ZodType> {
  schema: S;
  limiter: SlidingWindowRateLimiter;
  /** Builds the 429 message from the seconds until the client may retry. */
  rateLimitMessage: (resetSeconds: number) => string;
  invalidTitle: string;
  invalidMessage: string;
}

export type ParsedJsonRequest<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Shared front door for JSON POST routes: per-IP rate limit, JSON content type and
 * body-size check, then schema validation. Returns either the parsed body or the
 * error response the route should send unchanged.
 */
export async function parseJsonRequest<S extends z.ZodType>(
  request: NextRequest,
  options: JsonRequestOptions<S>
): Promise<ParsedJsonRequest<z.output<S>>> {
  const rateCheck = options.limiter.check(getClientIp(request));
  if (!rateCheck.success) {
    return {
      ok: false,
      response: rateLimited(
        rateCheck.resetSeconds,
        options.rateLimitMessage(rateCheck.resetSeconds)
      ),
    };
  }

  const { data: rawBody, error: bodyError } = await readJsonBodyWithLimit(request);
  if (bodyError) {
    return { ok: false, response: bodyError };
  }

  const parseResult = options.schema.safeParse(rawBody);
  if (!parseResult.success) {
    return {
      ok: false,
      response: jsonError(400, options.invalidTitle, options.invalidMessage),
    };
  }

  return { ok: true, data: parseResult.data };
}

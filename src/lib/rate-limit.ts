import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private requests = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests = 15, windowSeconds = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  /**
   * Checks whether the given key (e.g. client IP) has exceeded the rate limit.
   */
  public check(key: string): {
    success: boolean;
    limit: number;
    remaining: number;
    resetSeconds: number;
  } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let record = this.requests.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.requests.set(key, record);
    }

    // Filter out timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));

      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        resetSeconds,
      };
    }

    record.timestamps.push(now);
    const resetSeconds = Math.ceil(this.windowMs / 1000);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - record.timestamps.length,
      resetSeconds,
    };
  }

  /**
   * Resets records for testing or administrative purposes.
   */
  public reset(): void {
    this.requests.clear();
  }
}

/**
 * Extracts a normalized client IP address from a Next.js request.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return '127.0.0.1';
}

// Singletons for the two endpoints
// Chat endpoint: 15 messages per minute per IP
export const chatRateLimiter = new SlidingWindowRateLimiter(15, 60);

// Community advisory endpoint: 20 generations per minute per IP
export const advisoryRateLimiter = new SlidingWindowRateLimiter(20, 60);

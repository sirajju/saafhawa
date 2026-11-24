import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private requests = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly maxKeys: number;
  private lastPruneTime = 0;

  constructor(maxRequests = 15, windowSeconds = 60, maxKeys = 5000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
    this.maxKeys = maxKeys;
  }

  private pruneExpired(now: number): void {
    const windowStart = now - this.windowMs;
    for (const [k, rec] of this.requests.entries()) {
      rec.timestamps = rec.timestamps.filter((ts) => ts > windowStart);
      if (rec.timestamps.length === 0) {
        this.requests.delete(k);
      }
    }
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

    // Periodically prune expired keys or when approaching max capacity
    if (
      this.requests.size >= this.maxKeys ||
      now - this.lastPruneTime >= Math.min(this.windowMs, 10000)
    ) {
      this.pruneExpired(now);
      this.lastPruneTime = now;
      if (this.requests.size >= this.maxKeys) {
        const oldestKey = this.requests.keys().next().value;
        if (oldestKey !== undefined) {
          this.requests.delete(oldestKey);
        }
      }
    }

    let record = this.requests.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.requests.set(key, record);
    } else {
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    }

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
   * Returns current active keys in the rate limiter map.
   */
  public get size(): number {
    return this.requests.size;
  }

  /**
   * Resets records for testing or administrative purposes.
   */
  public reset(): void {
    this.requests.clear();
    this.lastPruneTime = 0;
  }
}

export const RateLimiter = SlidingWindowRateLimiter;

/**
 * Extracts a normalized client IP address from a Next.js request.
 * On Cloud Run / Google Cloud Load Balancer, the platform appends the verified caller IP
 * as the last entry in X-Forwarded-For, preventing spoofing via client-provided headers.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const parts = forwardedFor.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      let ip = parts[parts.length - 1];
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ip)) {
        ip = ip.split(':')[0];
      }
      return ip;
    }
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    let ip = realIp.trim();
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ip)) {
      ip = ip.split(':')[0];
    }
    return ip;
  }

  return '127.0.0.1';
}

// Singletons for the API endpoints
export const airQualityRateLimiter = new SlidingWindowRateLimiter(60, 60);
export const planRateLimiter = new SlidingWindowRateLimiter(30, 60);
export const chatRateLimiter = new SlidingWindowRateLimiter(15, 60);
export const advisoryRateLimiter = new SlidingWindowRateLimiter(20, 60);

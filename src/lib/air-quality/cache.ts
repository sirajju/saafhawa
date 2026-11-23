import type { AirQualityReport } from './types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  cachedAt: number;
}

export class SimpleTtlCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  constructor(defaultTtlMinutes = 15, maxEntries = 300) {
    this.defaultTtlMs = defaultTtlMinutes * 60 * 1000;
    this.maxEntries = maxEntries;
  }

  public get(key: string): { value: T; cachedAt: number; expiresAt: number } | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return {
      value: entry.value,
      cachedAt: entry.cachedAt,
      expiresAt: entry.expiresAt,
    };
  }

  public set(key: string, value: T, ttlMs: number = this.defaultTtlMs): void {
    const now = Date.now();

    // If key already exists, delete first so insertion order is refreshed
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxEntries) {
      // 1. First evict any expired entries
      for (const [k, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(k);
        }
      }

      // 2. If still at or exceeding capacity, remove the oldest entry (FIFO)
      if (this.cache.size >= this.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey !== undefined) {
          this.cache.delete(oldestKey);
        }
      }
    }

    this.cache.set(key, {
      value,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

export function normalizeLocationKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Global 15-minute singleton cache limited to 300 entries
export const airQualityCache = new SimpleTtlCache<AirQualityReport>(15, 300);

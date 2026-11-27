import { type PlanRequest, type PlanResponse } from '../plan/types';
import { type AdvisoryResponse } from '../community/types';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const planCache = new Map<string, CacheEntry<PlanResponse>>();
const advisoryCache = new Map<string, CacheEntry<AdvisoryResponse>>();

function getHourKey(): string {
  return new Date().toISOString().slice(0, 13); // e.g. "2026-11-25T21"
}

function normalizePlace(place: string): string {
  return place.trim().toLowerCase().replace(/\s+/g, ' ');
}

function stableProfileString(profile: PlanRequest): string {
  const sortedKeys = Object.keys(profile).sort() as Array<keyof PlanRequest>;
  const ordered: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    ordered[k] = profile[k];
  }
  return JSON.stringify(ordered);
}

export function buildPlanCacheKey(place: string, profile: PlanRequest): string {
  const normPlace = normalizePlace(place);
  const hour = getHourKey();
  const profileKey = stableProfileString(profile);
  return `plan:${normPlace}:${hour}:${profileKey}`;
}

export function getCachedPlan(cacheKey: string): PlanResponse | null {
  const entry = planCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    planCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function setCachedPlan(cacheKey: string, plan: PlanResponse): void {
  planCache.set(cacheKey, {
    data: plan,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function buildAdvisoryCacheKey(place: string, audience: string, language: string): string {
  const normPlace = normalizePlace(place);
  const hour = getHourKey();
  return `adv:${normPlace}:${audience}:${language}:${hour}`;
}

export function getCachedAdvisory(cacheKey: string): AdvisoryResponse | null {
  const entry = advisoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    advisoryCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

export function setCachedAdvisory(cacheKey: string, advisory: AdvisoryResponse): void {
  advisoryCache.set(cacheKey, {
    data: advisory,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearGeminiCache(): void {
  planCache.clear();
  advisoryCache.clear();
}

import { type PlanRequest, type PlanResponse } from '../plan/types';
import { type AdvisoryResponse } from '../community/types';
import { SimpleTtlCache } from '../air-quality/cache';

const CACHE_TTL_MINUTES = 30;
/** Bounded so per-profile plan keys cannot grow server memory without limit. */
export const GEMINI_CACHE_MAX_ENTRIES = 200;

const planCache = new SimpleTtlCache<PlanResponse>(CACHE_TTL_MINUTES, GEMINI_CACHE_MAX_ENTRIES);
const advisoryCache = new SimpleTtlCache<AdvisoryResponse>(
  CACHE_TTL_MINUTES,
  GEMINI_CACHE_MAX_ENTRIES
);

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
  return planCache.get(cacheKey)?.value ?? null;
}

export function setCachedPlan(cacheKey: string, plan: PlanResponse): void {
  planCache.set(cacheKey, plan);
}

export function buildAdvisoryCacheKey(place: string, audience: string, language: string): string {
  const normPlace = normalizePlace(place);
  const hour = getHourKey();
  return `adv:${normPlace}:${audience}:${language}:${hour}`;
}

export function getCachedAdvisory(cacheKey: string): AdvisoryResponse | null {
  return advisoryCache.get(cacheKey)?.value ?? null;
}

export function setCachedAdvisory(cacheKey: string, advisory: AdvisoryResponse): void {
  advisoryCache.set(cacheKey, advisory);
}

/** Number of live plan entries (used to verify the memory bound). */
export function getPlanCacheSize(): number {
  return planCache.size();
}

export function clearGeminiCache(): void {
  planCache.clear();
  advisoryCache.clear();
}

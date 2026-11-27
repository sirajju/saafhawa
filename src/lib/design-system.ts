/* eslint-disable complexity */
import { type PlanRequest } from './plan/types';

/**
 * SaafHawa Calm Health Design System
 *
 * Strict alignment with saafhawa-design-reference.html:
 * - Off-white (#f6f5f1) in light, near-black (#0e1013) in dark
 * - Three text colours: ink, ink-2, ink-3
 * - One brand color: deep teal (#0e5a55 in light, #5fc4b8 in dark)
 * - Six CPCB air quality colors used strictly for air quality data
 * - Strict type scale: 13, 15, 17, 22, 30 and the hero AQI number
 * - Corner radius: 16px cards, 10–12px controls, full pill for chips
 */

export function getAqiCategoryCssVar(
  aqi: number | null | undefined,
  category?: string | null
): string {
  const normCategory = (category || '').toLowerCase();
  if (
    normCategory.includes('severe') ||
    normCategory.includes('hazardous') ||
    (typeof aqi === 'number' && aqi > 400)
  ) {
    return 'var(--aqi-severe)';
  }
  if (
    normCategory.includes('very poor') ||
    normCategory.includes('very unhealthy') ||
    (typeof aqi === 'number' && aqi > 300)
  ) {
    return 'var(--aqi-vpoor)';
  }
  if (
    normCategory.includes('poor') ||
    normCategory.includes('unhealthy') ||
    (typeof aqi === 'number' && aqi > 200)
  ) {
    return 'var(--aqi-poor)';
  }
  if (normCategory.includes('moderate') || (typeof aqi === 'number' && aqi > 100)) {
    return 'var(--aqi-mod)';
  }
  if (normCategory.includes('satisfactory') || (typeof aqi === 'number' && aqi > 50)) {
    return 'var(--aqi-sat)';
  }
  return 'var(--aqi-good)';
}

export function getAqiCategorySoftCssVar(
  aqi: number | null | undefined,
  category?: string | null
): string {
  const normCategory = (category || '').toLowerCase();
  if (
    normCategory.includes('severe') ||
    normCategory.includes('hazardous') ||
    (typeof aqi === 'number' && aqi > 400)
  ) {
    return 'var(--aqi-severe-soft)';
  }
  if (
    normCategory.includes('very poor') ||
    normCategory.includes('very unhealthy') ||
    (typeof aqi === 'number' && aqi > 300)
  ) {
    return 'var(--aqi-vpoor-soft)';
  }
  if (
    normCategory.includes('poor') ||
    normCategory.includes('unhealthy') ||
    (typeof aqi === 'number' && aqi > 200)
  ) {
    return 'var(--aqi-poor-soft)';
  }
  if (normCategory.includes('moderate') || (typeof aqi === 'number' && aqi > 100)) {
    return 'var(--aqi-mod-soft)';
  }
  if (normCategory.includes('satisfactory') || (typeof aqi === 'number' && aqi > 50)) {
    return 'var(--aqi-sat-soft)';
  }
  return 'var(--aqi-good-soft)';
}

/**
 * Strips noisy administrative suffixes so the user sees a calm, clean short place name
 * e.g. "Connaught Place, New Delhi, Delhi 110001, India" -> "Delhi" or "Connaught Place"
 */
export function getShortPlaceName(rawPlace?: string | null): string {
  if (!rawPlace || !rawPlace.trim()) return 'Delhi';
  const clean = rawPlace.replace(/·\s*Station:.*$/i, '').trim();
  const parts = clean
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return 'Delhi';

  // If pincode alone, return it
  if (/^\d{6}$/.test(parts[0])) return parts[0];

  // If Delhi is in the string, return Delhi for city-level clarity
  if (parts.some((p) => p.toLowerCase() === 'delhi' || p.toLowerCase().includes('delhi'))) {
    const locality = parts.find(
      (p) =>
        !p.toLowerCase().includes('india') &&
        !p.toLowerCase().includes('national capital') &&
        !p.toLowerCase().includes('nct')
    );
    return locality || 'Delhi';
  }

  // Return the first significant locality/city component
  return parts[0].replace(/\b\d{6}\b/, '').trim() || parts[0];
}

/**
 * Returns a friendly one-line summary of the household composition
 */
export function getHouseholdSummary(profile?: PlanRequest | null): string {
  if (!profile) return 'Plan for your household';
  const adults = profile.adultsCount || 2;
  const children = profile.childrenCount || 0;
  const seniors = profile.elderlyCount || 0;
  const total = adults + children + seniors;

  const sensitive = profile.hasAsthmaOrRespiratoryCondition
    ? children > 0
      ? 'one child with asthma'
      : 'family member with asthma'
    : children > 0
      ? `${children} ${children === 1 ? 'child' : 'children'}`
      : seniors > 0
        ? `${seniors} senior`
        : 'daily routine & commute';

  return `Plan for a family of ${total} · ${sensitive}`;
}

/**
 * Calculates percentage for CPCB scale marker (0 to 100%) across 6 scale bands
 */
export function getScaleMarkerPercentage(aqi: number | null | undefined): number {
  if (typeof aqi !== 'number' || isNaN(aqi) || aqi <= 0) return 2;
  const clamped = Math.min(500, aqi);
  const bandWidth = 100 / 6;

  if (clamped <= 50) return (clamped / 50) * bandWidth;
  if (clamped <= 100) return bandWidth + ((clamped - 50) / 50) * bandWidth;
  if (clamped <= 200) return bandWidth * 2 + ((clamped - 100) / 100) * bandWidth;
  if (clamped <= 300) return bandWidth * 3 + ((clamped - 200) / 100) * bandWidth;
  if (clamped <= 400) return bandWidth * 4 + ((clamped - 300) / 100) * bandWidth;
  return bandWidth * 5 + ((clamped - 400) / 100) * bandWidth;
}

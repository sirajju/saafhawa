/**
 * Single source of truth for mapping an AQI value or a provider's category label
 * onto the six CPCB bands. Bands are checked from most to least severe, and a band applies
 * when either the label or the number matches it, so the more severe signal always wins.
 */
export type AqiBand = 'severe' | 'vpoor' | 'poor' | 'mod' | 'sat' | 'good';

const AQI_BANDS: ReadonlyArray<{ band: AqiBand; keywords: readonly string[]; above: number }> = [
  { band: 'severe', keywords: ['severe', 'hazardous'], above: 400 },
  { band: 'vpoor', keywords: ['very poor', 'very unhealthy'], above: 300 },
  { band: 'poor', keywords: ['poor', 'unhealthy'], above: 200 },
  { band: 'mod', keywords: ['moderate'], above: 100 },
  { band: 'sat', keywords: ['satisfactory', 'fair'], above: 50 },
];

export function getAqiBand(aqi: number | null | undefined, category?: string | null): AqiBand {
  const label = (category || '').toLowerCase();
  const match = AQI_BANDS.find(
    ({ keywords, above }) =>
      keywords.some((k) => label.includes(k)) || (typeof aqi === 'number' && aqi > above)
  );
  return match?.band ?? 'good';
}

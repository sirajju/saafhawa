import { AQI_UNAVAILABLE } from '../constants';
import { getAqiBand, type AqiBand } from '../aqi-band';

export interface AqiCategoryDetails {
  categoryText: string;
  badgeClass: string;
  icon: string;
  healthSummary: string;
}

type BandDetails = Omit<AqiCategoryDetails, 'categoryText'> & { defaultText: string };

const BAND_DETAILS: Record<AqiBand, BandDetails> = {
  severe: {
    defaultText: 'Severe',
    icon: '⚠️',
    badgeClass:
      'bg-rose-100 text-rose-950 border-rose-500 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-600',
    healthSummary:
      'Emergency conditions. Entire population is likely to be affected. Keep all vulnerable individuals indoors.',
  },
  vpoor: {
    defaultText: 'Very Poor',
    icon: '🚨',
    badgeClass:
      'bg-purple-100 text-purple-950 border-purple-500 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-600',
    healthSummary:
      'Health alert: risk of respiratory illness on prolonged exposure. Strict protective routines advised.',
  },
  poor: {
    defaultText: 'Poor',
    icon: '😷',
    badgeClass:
      'bg-orange-100 text-orange-950 border-orange-500 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-600',
    healthSummary:
      'Air quality causes breathing discomfort to most people on prolonged exposure. Masking recommended.',
  },
  mod: {
    defaultText: 'Moderate',
    icon: '⛅',
    badgeClass:
      'bg-amber-100 text-amber-950 border-amber-500 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-600',
    healthSummary:
      'May cause minor breathing discomfort to sensitive individuals and children. Sensitive groups take care.',
  },
  sat: {
    defaultText: 'Satisfactory',
    icon: '🌤️',
    badgeClass:
      'bg-lime-100 text-lime-950 border-lime-500 dark:bg-lime-950 dark:text-lime-100 dark:border-lime-600',
    healthSummary: 'Acceptable air quality with minimal health impacts for the general public.',
  },
  good: {
    defaultText: 'Good Air Quality',
    icon: '🌿',
    badgeClass:
      'bg-emerald-100 text-emerald-950 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-600',
    healthSummary: 'Minimal health impact. Ideal for outdoor recreation.',
  },
};

const UNAVAILABLE_DETAILS: AqiCategoryDetails = {
  categoryText: AQI_UNAVAILABLE,
  icon: '🌫️',
  badgeClass:
    'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  healthSummary: 'Air quality data is currently unavailable for this location.',
};

/**
 * Badge text, icon, colour classes and health summary for an AQI reading.
 * With neither a number nor a label, reports the data as unavailable instead of guessing.
 */
export function getAqiCategoryDetails(
  category: string | null | undefined,
  aqi: number | null | undefined
): AqiCategoryDetails {
  const band = getAqiBand(aqi, category);
  const hasNoData = (aqi === null || aqi === undefined) && (!category || category.trim() === '');
  if (band === 'good' && hasNoData) return UNAVAILABLE_DETAILS;

  const { defaultText, ...details } = BAND_DETAILS[band];
  return { categoryText: category || defaultText, ...details };
}

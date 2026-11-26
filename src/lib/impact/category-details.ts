/**
 * Returns color and text description for AQI and action categories.
 */

export function getCategoryBadgeDetails(category: string): {
  label: string;
  icon: string;
  badgeClass: string;
} {
  switch (category) {
    case 'daily_routine':
      return {
        label: 'Daily Routine',
        icon: '🌅',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700',
      };
    case 'indoor_air':
      return {
        label: 'Indoor Air',
        icon: '🏠',
        badgeClass: 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-950/60 dark:text-teal-200 dark:border-teal-700',
      };
    case 'sustainable_swaps':
      return {
        label: 'Sustainable Swap',
        icon: '🚲',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700',
      };
    default:
      return {
        label: 'Action',
        icon: '🌱',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
      };
  }
}

export function getAqiCategoryDetails(category: string | null | undefined, aqi: number | null | undefined): {
  categoryText: string;
  badgeClass: string;
  icon: string;
  healthSummary: string;
} {
  const normCategory = (category || '').toLowerCase();

  if (normCategory.includes('severe') || normCategory.includes('hazardous') || (typeof aqi === 'number' && aqi > 400)) {
    return {
      categoryText: category || 'Severe',
      icon: '⚠️',
      badgeClass: 'bg-rose-100 text-rose-950 border-rose-500 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-600',
      healthSummary: 'Emergency conditions. Entire population is likely to be affected. Keep all vulnerable individuals indoors.',
    };
  }

  if (normCategory.includes('very poor') || normCategory.includes('very unhealthy') || (typeof aqi === 'number' && aqi > 300)) {
    return {
      categoryText: category || 'Very Poor',
      icon: '🚨',
      badgeClass: 'bg-purple-100 text-purple-950 border-purple-500 dark:bg-purple-950 dark:text-purple-100 dark:border-purple-600',
      healthSummary: 'Health alert: risk of respiratory illness on prolonged exposure. Strict protective routines advised.',
    };
  }

  if (normCategory.includes('poor') || normCategory.includes('unhealthy') || (typeof aqi === 'number' && aqi > 200)) {
    return {
      categoryText: category || 'Poor',
      icon: '😷',
      badgeClass: 'bg-orange-100 text-orange-950 border-orange-500 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-600',
      healthSummary: 'Air quality causes breathing discomfort to most people on prolonged exposure. Masking recommended.',
    };
  }

  if (normCategory.includes('moderate') || (typeof aqi === 'number' && aqi > 100)) {
    return {
      categoryText: category || 'Moderate',
      icon: '⛅',
      badgeClass: 'bg-amber-100 text-amber-950 border-amber-500 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-600',
      healthSummary: 'May cause minor breathing discomfort to sensitive individuals and children. Sensitive groups take care.',
    };
  }

  if (normCategory.includes('satisfactory') || normCategory.includes('fair') || (typeof aqi === 'number' && aqi > 50)) {
    return {
      categoryText: category || 'Satisfactory',
      icon: '🌤️',
      badgeClass: 'bg-lime-100 text-lime-950 border-lime-500 dark:bg-lime-950 dark:text-lime-100 dark:border-lime-600',
      healthSummary: 'Acceptable air quality with minimal health impacts for the general public.',
    };
  }

  if ((aqi === null || aqi === undefined) && (!category || category.trim() === '')) {
    return {
      categoryText: 'unavailable',
      icon: '🌫️',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
      healthSummary: 'Air quality data is currently unavailable for this location.',
    };
  }

  return {
    categoryText: category || 'Good Air Quality',
    icon: '🌿',
    badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-600',
    healthSummary: 'Minimal health impact. Ideal for outdoor recreation.',
  };
}

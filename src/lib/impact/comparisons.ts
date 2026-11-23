import { ExposureReduction, EmissionReduction } from './types';

/**
 * Returns plain-language, relatable comparisons for scientific exposure and emission numbers.
 */
export function getExposureComparisonText(
  exposure: ExposureReduction,
  actionId: string
): string {
  const dose = exposure.pm25InhaledDoseAvoidedUg;
  const conc = exposure.pm25ConcentrationReductionUgM3;

  if (actionId === 'wear_n95_mask_outside') {
    return `Filters ~85% of fine toxic particles whenever you step outside (${dose} µg inhaled dose avoided).`;
  }

  if (actionId === 'run_hepa_air_purifier_bedroom' || actionId === 'diy_corsi_rosenthal_box') {
    return `Keeps indoor air ~${Math.round(exposure.percentageDrop)}% cleaner through the night (${dose} µg inhaled dose avoided).`;
  }

  if (actionId === 'eliminate_incense_and_mosquito_coils') {
    return `Eliminates a massive indoor smoke source (${conc} µg/m³ peak drop), saving your lungs from heavy particle exposure.`;
  }

  if (actionId === 'keep_children_indoors_morning_smog') {
    return `Shields developing lungs from peak morning temperature inversion spikes (${dose} µg inhaled dose avoided).`;
  }

  if (actionId === 'use_exhaust_fan_cooking') {
    return `Vents ~70% of frying and tadka smoke directly outside before it settles into living areas.`;
  }

  if (dose >= 500) {
    return `Avoids ${dose} µg of inhaled PM2.5 — equivalent to avoiding the heavy toxic smoke of multiple cigarettes.`;
  } else if (dose >= 150) {
    return `Significantly reduces daily particulate inhalation by ${dose} µg across your household.`;
  } else if (dose > 0) {
    return `Lowers personal particulate exposure by ${dose} µg during smog peaks.`;
  }

  return 'Reduces exposure during hazardous winter smog periods.';
}

export function getEmissionComparisonText(
  emission: EmissionReduction,
  actionId: string
): string {
  const pm25 = emission.pm25SavedGrams;
  const co2 = emission.co2SavedGrams;

  if (actionId === 'swap_car_for_metro' || actionId === 'work_from_home_on_smog_days') {
    const kmEquiv = Math.round(co2 / 150);
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(2)} g PM₂.₅ — like taking a car off city roads for ~${kmEquiv} km.`;
  }

  if (actionId === 'swap_two_wheeler_for_metro_or_bus') {
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and eliminates direct street-level tailpipe exhaust.`;
  }

  if (actionId === 'stop_open_waste_burning') {
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(1)} g PM₂.₅ — stops choking neighborhood smoke plumes.`;
  }

  if (actionId === 'swap_biomass_cookstove_to_induction') {
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(1)} g PM₂.₅ daily — 100% smoke-free cooking.`;
  }

  if (actionId === 'carpool_to_work') {
    return `Halves vehicle trip emissions: saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(2)} g PM₂.₅.`;
  }

  if (co2 > 0 || pm25 > 0) {
    const co2Part = co2 >= 1000 ? `${(co2 / 1000).toFixed(1)} kg CO₂` : `${co2.toFixed(0)} g CO₂`;
    const pmPart = pm25 >= 1 ? `${pm25.toFixed(1)} g PM₂.₅` : `${(pm25 * 1000).toFixed(0)} mg PM₂.₅`;
    return `Prevents ${pmPart} and ${co2Part} from entering the atmosphere today.`;
  }

  return 'A personal protection action that directly shields health during severe air quality alerts.';
}

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

/**
 * Returns color and text description for AQI categories, ensuring never color alone.
 */
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

  return {
    categoryText: category || 'Good Air Quality',
    icon: '🌿',
    badgeClass: 'bg-emerald-100 text-emerald-950 border-emerald-500 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-600',
    healthSummary: 'Minimal health impact. Ideal for outdoor recreation.',
  };
}

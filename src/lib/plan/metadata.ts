import { PlanRequest } from './types';

export interface ActionPriorityMetadata {
  getSuggestedTimeOfDay: (profile: PlanRequest, cleanestWindowText?: string) => string;
  generateReason: (profile: PlanRequest, cleanestWindowText?: string) => string;
}

export const FALLBACK_METADATA_MAP: Record<string, ActionPriorityMetadata> = {
  wear_n95_mask_outside: {
    getSuggestedTimeOfDay: (p) =>
      p.commutersCount > 0 ? 'Morning & Evening Commute' : 'Any outdoor walks or errands',
    generateReason: (p) => {
      if (p.hasAsthmaOrRespiratoryCondition) {
        return 'Protects vulnerable lungs and airways from fine particulate inhalation during outdoor transit.';
      }
      if (p.childrenCount > 0) {
        return 'Significantly cuts down particulate inhalation for your children and family members outdoors.';
      }
      if (p.elderlyCount > 0) {
        return 'Protects senior cardiovascular and airway health whenever stepping outside.';
      }
      return 'Protects your lungs from fine respirable PM2.5 particulates whenever stepping outdoors.';
    },
  },

  senior_indoor_morning_walk: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Midday (1 PM – 4 PM)'),
    generateReason: () =>
      'Protects senior heart and lung reserves by replacing early morning cold-air walks with indoor movement or timing them to the cleanest daytime window.',
  },

  seniors_avoid_strenuous_outdoor: {
    getSuggestedTimeOfDay: () => 'Throughout the day',
    generateReason: () =>
      'Keeps physical exertion low during peak smog alerts to protect elderly family members from acute cardiovascular stress.',
  },

  keep_children_indoors_morning_smog: {
    getSuggestedTimeOfDay: () => 'Early Morning',
    generateReason: (p) =>
      `Keeps your ${p.childrenCount === 1 ? 'child' : `${p.childrenCount} children`} safely inside while ground-level temperature inversion concentrates severe smog outdoors.`,
  },

  run_hepa_air_purifier_bedroom: {
    getSuggestedTimeOfDay: () => 'Night / Bedtime',
    generateReason: (p) =>
      p.adultsCount === 1 && p.childrenCount === 0 && p.elderlyCount === 0
        ? 'Creates a clean air sanctuary in your bedroom so you breathe safe air through the night.'
        : 'Creates a clean air sanctuary in sleeping rooms so your family breathes safe air through the night.',
  },

  diy_corsi_rosenthal_box: {
    getSuggestedTimeOfDay: () => 'All Day',
    generateReason: (p) =>
      `A budget-friendly DIY high-volume air filter to keep your ${p.homeAreaSqFt} sq ft living area clean without costly purifiers.`,
  },

  use_exhaust_fan_cooking: {
    getSuggestedTimeOfDay: () => 'During Meal Preparation',
    generateReason: () =>
      'Vents intense frying and tadka aerosol spikes immediately so they do not settle inside your living rooms.',
  },

  seal_windows_during_peak_inversion: {
    getSuggestedTimeOfDay: () => 'Night to Early Morning',
    generateReason: () =>
      'Stops heavy toxic smog from leaking into your home during peak cold morning and nighttime inversion.',
  },

  eliminate_incense_and_mosquito_coils: {
    getSuggestedTimeOfDay: () => 'All Day',
    generateReason: () =>
      'Prevents heavy particulate accumulation inside your home caused by smoldering incense and mosquito coils.',
  },

  wet_mop_instead_of_dry_sweeping: {
    getSuggestedTimeOfDay: () => 'Morning Routine',
    generateReason: () =>
      'Prevents domestic settled dust and fine particles from being kicked back into your breathing zone.',
  },

  post_commute_hygiene: {
    getSuggestedTimeOfDay: () => 'Evening / Post-Commute',
    generateReason: () =>
      'Rinsing away trapped particles from face and upper airways prevents lingering respiratory irritation.',
  },

  swap_car_for_metro: {
    getSuggestedTimeOfDay: () => 'Morning & Evening Commute',
    generateReason: (p) =>
      `Shifts your ${p.dailyCommuteDistanceKm} km car commute to clean electric transit, avoiding congested road pollution and cutting emissions.`,
  },

  swap_two_wheeler_for_metro_or_bus: {
    getSuggestedTimeOfDay: () => 'Commute Hours',
    generateReason: (p) =>
      `Protects you from inhaling dense direct vehicle exhaust plumes during your ${p.dailyCommuteDistanceKm} km two-wheeler commute.`,
  },

  work_from_home_on_smog_days: {
    getSuggestedTimeOfDay: () => 'Full Day',
    generateReason: (p) =>
      `Eliminates your ${p.dailyCommuteDistanceKm} km round-trip commute travel entirely today while removing a vehicle trip from city roads.`,
  },

  carpool_to_work: {
    getSuggestedTimeOfDay: () => 'Morning & Evening Commute',
    generateReason: (p) =>
      `Sharing your ${p.dailyCommuteDistanceKm} km commute with coworkers removes another car from traffic and reduces total commute fuel.`,
  },

  stop_open_waste_burning: {
    getSuggestedTimeOfDay: () => 'All Day',
    generateReason: () =>
      'Stopping backyard leaf and waste burning protects your immediate neighborhood from choking localized smoke plumes.',
  },

  swap_biomass_cookstove_to_induction: {
    getSuggestedTimeOfDay: () => 'Meal Times',
    generateReason: (p) => {
      if (p.childrenCount === 0 && p.elderlyCount > 0) {
        return 'Replaces indoor chulha smoke with clean electric cooking, safeguarding senior respiratory health in your home.';
      }
      if (p.adultsCount === 1 && p.childrenCount === 0 && p.elderlyCount === 0) {
        return 'Replaces indoor chulha smoke with clean electric cooking, eliminating toxic particulate buildup in your living space.';
      }
      return 'Replaces indoor chulha smoke with clean electric cooking, safeguarding your household from toxic indoor emissions.';
    },
  },

  swap_biomass_or_kerosene_heating_to_electric: {
    getSuggestedTimeOfDay: () => 'Night / Evening',
    generateReason: () =>
      'Swapping unvented solid fuel heating for clean electric heat prevents toxic indoor carbon monoxide and smoke buildup.',
  },

  ventilate_at_cleanest_afternoon_hour: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Midday (1 PM – 4 PM)'),
    generateReason: (_p, w) =>
      `Flushes indoor stale air and carbon dioxide strictly during the cleanest forecast window (${w || 'midday'}) when outdoor pollution dips.`,
  },

  weatherstrip_doors_and_windows: {
    getSuggestedTimeOfDay: () => 'Daytime Setup',
    generateReason: () =>
      'Simple door draft stoppers and window seals block outdoor smog infiltration throughout the day.',
  },

  combine_or_cancel_outdoor_errands: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Afternoon / Flexible'),
    generateReason: () =>
      'Consolidating errands limits prolonged exposure on smoggy streets and saves unnecessary vehicle trips.',
  },

  avoid_non_hepa_vacuuming: {
    getSuggestedTimeOfDay: () => 'Cleaning Hours',
    generateReason: () =>
      'Avoids standard vacuum exhaust blowback by using damp cloth dusting during winter months.',
  },

  shift_outdoor_exercise_to_cleanest_hour: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Midday (1 PM – 4 PM)'),
    generateReason: (_p, w) =>
      `Avoids deep inhalation of cold morning inversion air by shifting workouts to the cleanest forecast window (${w || 'midday'}).`,
  },
};

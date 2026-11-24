import { PlanRequest } from './types';

export interface ActionPriorityMetadata {
  suggestedTimeOfDay: string;
  generateReason: (profile: PlanRequest) => string;
}

export const FALLBACK_METADATA_MAP: Record<string, ActionPriorityMetadata> = {
  wear_n95_mask_outside: {
    suggestedTimeOfDay: 'Morning & Commute Hours',
    generateReason: (p) =>
      p.hasAsthmaOrRespiratoryCondition
        ? 'Protects vulnerable lungs and airways from fine particulate inhalation during daily outdoor transit.'
        : 'Significantly cuts down particulate inhalation for family members whenever stepping outdoors.',
  },
  keep_children_indoors_morning_smog: {
    suggestedTimeOfDay: 'Early Morning',
    generateReason: () =>
      'Keeps kids safely inside while ground-level temperature inversion concentrates severe smog outdoors.',
  },
  run_hepa_air_purifier_bedroom: {
    suggestedTimeOfDay: 'Night / Bedtime',
    generateReason: () =>
      'Creates a clean air sanctuary in sleeping rooms so your family breathes safe air through the night.',
  },
  diy_corsi_rosenthal_box: {
    suggestedTimeOfDay: 'All Day',
    generateReason: () =>
      'A budget-friendly DIY high-volume air filter to keep shared living areas clean without costly purifiers.',
  },
  use_exhaust_fan_cooking: {
    suggestedTimeOfDay: 'During Meal Preparation',
    generateReason: () =>
      'Vents intense frying and tadka aerosol spikes immediately so they do not settle inside your living rooms.',
  },
  seal_windows_during_peak_inversion: {
    suggestedTimeOfDay: 'Night to Early Morning',
    generateReason: () =>
      'Stops heavy toxic smog from leaking into your home during peak cold morning and nighttime inversion.',
  },
  eliminate_incense_and_mosquito_coils: {
    suggestedTimeOfDay: 'All Day',
    generateReason: () =>
      'Prevents heavy particulate accumulation inside your home caused by smoldering incense and mosquito coils.',
  },
  wet_mop_instead_of_dry_sweeping: {
    suggestedTimeOfDay: 'Morning Routine',
    generateReason: () =>
      'Prevents domestic settled dust and fine particles from being kicked back into your breathing zone.',
  },
  post_commute_hygiene: {
    suggestedTimeOfDay: 'Evening / Post-Commute',
    generateReason: () =>
      'Rinsing away trapped particles from face and upper airways prevents lingering respiratory irritation.',
  },
  swap_car_for_metro: {
    suggestedTimeOfDay: 'Morning & Evening Commute',
    generateReason: () =>
      'Shifts your daily commute to clean electric transit, avoiding congested road pollution and cutting emissions.',
  },
  swap_two_wheeler_for_metro_or_bus: {
    suggestedTimeOfDay: 'Commute Hours',
    generateReason: () =>
      'Protects two-wheeler riders from inhaling dense direct vehicle exhaust plumes in slow-moving traffic.',
  },
  work_from_home_on_smog_days: {
    suggestedTimeOfDay: 'Full Day',
    generateReason: () =>
      'Eliminates roadway exposure completely while removing a vehicle trip from city roads today.',
  },
  carpool_to_work: {
    suggestedTimeOfDay: 'Morning & Evening Commute',
    generateReason: () =>
      'Sharing rides with coworkers removes another car from traffic and reduces total commute fuel.',
  },
  stop_open_waste_burning: {
    suggestedTimeOfDay: 'All Day',
    generateReason: () =>
      'Stopping backyard leaf and waste burning protects your neighborhood from choking localized smoke plumes.',
  },
  swap_biomass_cookstove_to_induction: {
    suggestedTimeOfDay: 'Meal Times',
    generateReason: () =>
      'Replaces indoor chulha smoke with clean electric cooking, safeguarding women and children in the home.',
  },
  swap_biomass_or_kerosene_heating_to_electric: {
    suggestedTimeOfDay: 'Night / Evening',
    generateReason: () =>
      'Swapping unvented solid fuel heating for clean electric heat prevents toxic indoor carbon monoxide and smoke buildup.',
  },
  ventilate_at_cleanest_afternoon_hour: {
    suggestedTimeOfDay: 'Midday (1 PM - 3 PM)',
    generateReason: () =>
      'Flushes indoor stale air and carbon dioxide only when afternoon sunlight breaks up surface pollution.',
  },
  weatherstrip_doors_and_windows: {
    suggestedTimeOfDay: 'Daytime Setup',
    generateReason: () =>
      'Simple door draft stoppers and window seals block outdoor smog infiltration throughout the day.',
  },
  combine_or_cancel_outdoor_errands: {
    suggestedTimeOfDay: 'Afternoon / Flexible',
    generateReason: () =>
      'Consolidating errands limits prolonged exposure on smoggy streets and saves unnecessary vehicle trips.',
  },
  avoid_non_hepa_vacuuming: {
    suggestedTimeOfDay: 'Cleaning Hours',
    generateReason: () =>
      'Avoids standard vacuum exhaust blowback by using damp cloth dusting during winter months.',
  },
  shift_outdoor_exercise_to_cleanest_hour: {
    suggestedTimeOfDay: 'Afternoon Window',
    generateReason: () =>
      'Avoids deep inhalation of cold morning inversion air by shifting workouts to the cleanest part of the day.',
  },
};

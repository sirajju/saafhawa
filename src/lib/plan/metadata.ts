import { PlanRequest } from './types';

export interface ActionPriorityMetadata {
  getSuggestedTimeOfDay: (profile: PlanRequest, cleanestWindowText?: string) => string;
  generateReason: (profile: PlanRequest, cleanestWindowText?: string) => string;
}

export const FALLBACK_METADATA_MAP: Record<string, ActionPriorityMetadata> = {
  wear_n95_mask_outside: {
    getSuggestedTimeOfDay: (p) => (p.commutersCount > 0 ? 'Morning & Evening Commute' : 'Any outdoor walks or errands'),
    generateReason: (p) => {
      if (p.hasAsthmaOrRespiratoryCondition) return 'Protects vulnerable lungs and airways from fine particulate inhalation during outdoor transit.';
      if (p.childrenCount > 0) return 'Significantly cuts down particulate inhalation for your children and family members outdoors.';
      if (p.elderlyCount > 0) return 'Protects senior cardiovascular and airway health whenever stepping outside.';
      return 'Protects your lungs from fine respirable PM2.5 particulates whenever stepping outdoors.';
    },
  },
  senior_indoor_morning_walk: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Midday (1 PM – 4 PM)'),
    generateReason: (p, w) =>
      `Protects heart and lung reserves for ${p.elderlyCount === 1 ? 'your senior family member' : `all ${p.elderlyCount} seniors`} by shifting walks from cold morning inversion to ${w || 'the cleanest daytime window'}.`,
  },
  seniors_avoid_strenuous_outdoor: {
    getSuggestedTimeOfDay: () => 'Throughout the day',
    generateReason: (p) =>
      `Keeping exertion low during peak smog alerts protects ${p.elderlyCount === 1 ? 'your elderly family member' : `all ${p.elderlyCount} senior members`} from acute cardiovascular stress.`,
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
        : `Creates a clean air sanctuary in sleeping rooms across your ${p.homeAreaSqFt} sq ft home so your family breathes safe air.`,
  },
  diy_corsi_rosenthal_box: {
    getSuggestedTimeOfDay: () => 'All Day',
    generateReason: (p) =>
      `A budget-friendly DIY high-volume air filter to keep your ${p.homeAreaSqFt} sq ft living area clean without costly purifiers.`,
  },
  use_exhaust_fan_cooking: {
    getSuggestedTimeOfDay: () => 'During Meal Preparation',
    generateReason: (p) => {
      const risk = p.hasAsthmaOrRespiratoryCondition ? 'protecting family members with respiratory sensitivity' : p.childrenCount > 0 ? 'so fumes do not reach children in living areas' : p.elderlyCount > 0 ? 'safeguarding senior cardiovascular health' : 'keeping indoor air clean';
      return `Running kitchen exhaust vents intense frying aerosol spikes directly out of your ${p.homeAreaSqFt} sq ft home, ${risk}.`;
    },
  },
  seal_windows_during_peak_inversion: {
    getSuggestedTimeOfDay: () => 'Night to Early Morning',
    generateReason: (p) => {
      const risk = p.hasAsthmaOrRespiratoryCondition ? 'vulnerable airways' : p.childrenCount > 0 ? 'children while sleeping' : p.elderlyCount > 0 ? 'seniors during rest' : 'your sleeping space';
      return `Sealing windows in your ${p.homeAreaSqFt} sq ft home stops heavy smog infiltration during cold inversion to protect ${risk}.`;
    },
  },
  eliminate_incense_and_mosquito_coils: {
    getSuggestedTimeOfDay: () => 'All Day',
    generateReason: (p) => {
      const risk = p.hasAsthmaOrRespiratoryCondition ? 'asthma and airway irritation' : p.childrenCount > 0 ? 'young children' : p.elderlyCount > 0 ? 'seniors' : 'your living space';
      return `Eliminating incense and mosquito coils in your ${p.homeAreaSqFt} sq ft home removes a major source of particulate spikes for ${risk}.`;
    },
  },
  wet_mop_instead_of_dry_sweeping: {
    getSuggestedTimeOfDay: () => 'Morning Routine',
    generateReason: (p) => {
      if (p.hasAsthmaOrRespiratoryCondition) return `Wet mopping your ${p.homeAreaSqFt} sq ft home traps settled fine dust without kicking allergens into sensitive airways.`;
      if (p.childrenCount > 0) return `Wet mopping your ${p.homeAreaSqFt} sq ft floors prevents settled fine particles from resuspending where children play.`;
      if (p.elderlyCount > 0) return `Wet mopping your ${p.homeAreaSqFt} sq ft home stops settled toxic dust from becoming airborne, protecting senior breathing air.`;
      return `Wet mopping your ${p.homeAreaSqFt} sq ft floor traps settled dust without resuspending fine particulates into your breathing zone.`;
    },
  },
  post_commute_hygiene: {
    getSuggestedTimeOfDay: () => 'Evening / Post-Commute',
    generateReason: (p) =>
      `Rinsing face and nasal passages after ${p.dailyCommuteDistanceKm} km ${p.primaryCommuteMode.replace('_', ' ')} travel flushes out soot and protects ${p.hasAsthmaOrRespiratoryCondition ? 'sensitive airways' : 'your respiratory tract'}.`,
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
    generateReason: (p) =>
      `Stopping backyard leaf and waste burning stops toxic smoke plumes from penetrating your ${p.homeAreaSqFt} sq ft home and immediate neighborhood.`,
  },
  swap_biomass_cookstove_to_induction: {
    getSuggestedTimeOfDay: () => 'Meal Times',
    generateReason: (p) => {
      if (p.childrenCount === 0 && p.elderlyCount > 0) return 'Replaces indoor chulha smoke with clean electric cooking, safeguarding senior respiratory health in your home.';
      if (p.adultsCount === 1 && p.childrenCount === 0 && p.elderlyCount === 0) return 'Replaces indoor chulha smoke with clean electric cooking, eliminating toxic particulate buildup in your living space.';
      return `Replaces indoor chulha smoke with clean electric cooking, safeguarding your ${p.homeAreaSqFt} sq ft household from toxic indoor emissions.`;
    },
  },
  swap_biomass_or_kerosene_heating_to_electric: {
    getSuggestedTimeOfDay: () => 'Night / Evening',
    generateReason: (p) =>
      `Switching unvented solid fuel heating to clean electric radiators in your ${p.homeAreaSqFt} sq ft home eliminates toxic carbon monoxide and smoke buildup.`,
  },
  ventilate_at_cleanest_afternoon_hour: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Midday (1 PM – 4 PM)'),
    generateReason: (p, w) =>
      `Flushes indoor stale air and carbon dioxide across your ${p.homeAreaSqFt} sq ft home strictly during the cleanest forecast window (${w || 'midday'}).`,
  },
  weatherstrip_doors_and_windows: {
    getSuggestedTimeOfDay: () => 'Daytime Setup',
    generateReason: (p) =>
      `Sealing outer door sweeps and window gaps blocks toxic winter drafts across your ${p.homeAreaSqFt} sq ft home${p.hasAsthmaOrRespiratoryCondition ? ' for vulnerable lungs' : ''}.`,
  },
  combine_or_cancel_outdoor_errands: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Afternoon / Flexible'),
    generateReason: (p, w) =>
      `Consolidating outdoor errands into the cleanest window (${w || 'midday'}) cuts smog road exposure for ${p.adultsCount === 1 ? 'you' : 'your family'} and avoids unnecessary driving.`,
  },
  avoid_non_hepa_vacuuming: {
    getSuggestedTimeOfDay: () => 'Cleaning Hours',
    generateReason: (p) => {
      if (p.hasAsthmaOrRespiratoryCondition) return `Damp dusting across your ${p.homeAreaSqFt} sq ft home prevents vacuum exhaust blowback from triggering sensitive airways.`;
      if (p.childrenCount > 0) return `Damp dusting your ${p.homeAreaSqFt} sq ft home stops vacuum exhaust from blowing fine dust back into your children's breathing zone.`;
      if (p.elderlyCount > 0) return `Damp dusting your ${p.homeAreaSqFt} sq ft home avoids vacuum exhaust blowback, protecting senior lung reserves.`;
      return `Damp dusting your ${p.homeAreaSqFt} sq ft living area avoids vacuum exhaust blowback from resuspending settled dust.`;
    },
  },
  shift_outdoor_exercise_to_cleanest_hour: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Midday (1 PM – 4 PM)'),
    generateReason: (_p, w) =>
      `Avoids deep inhalation of cold morning inversion air by shifting workouts to the cleanest forecast window (${w || 'midday'}).`,
  },
  keep_vulnerable_out_of_chulha_kitchen: {
    getSuggestedTimeOfDay: () => 'Meal Preparation Times',
    generateReason: (p) => {
      const vulnerable = [];
      if (p.childrenCount > 0) vulnerable.push(p.childrenCount === 1 ? 'your child' : 'children');
      if (p.elderlyCount > 0) vulnerable.push(p.elderlyCount === 1 ? 'your senior family member' : 'seniors');
      if (p.hasAsthmaOrRespiratoryCondition) vulnerable.push('anyone with respiratory sensitivity');
      const target = vulnerable.length > 0 ? vulnerable.join(' and ') : 'family members';
      return `Keeping ${target} outside the kitchen while the chulha burns prevents direct inhalation of dense toxic smoke in your ${p.homeAreaSqFt} sq ft home.`;
    },
  },
  cook_with_kitchen_cross_ventilation: {
    getSuggestedTimeOfDay: (_p, w) => (w ? `Cleanest window (${w})` : 'Meal Times'),
    generateReason: (p, w) =>
      `Cooking on the chulha with kitchen-side windows open during the cleanest window (${w || 'midday'}) vents smoke directly outside while protecting your ${p.homeAreaSqFt} sq ft living area.`,
  },
  use_dry_seasoned_chulha_fuel: {
    getSuggestedTimeOfDay: () => 'All Day',
    generateReason: (p) =>
      `Burning only dry, well-seasoned wood in your ${p.homeAreaSqFt} sq ft home reduces toxic smoke and soot output by more than half compared to damp wood.`,
  },
};

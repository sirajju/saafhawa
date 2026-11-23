import { ActionCategory } from './types';

export interface ActionDefinition {
  id: string;
  title: string;
  description: string;
  category: ActionCategory;
  defaultDurationHours?: number;
}

export const ACTION_CATALOGUE: ActionDefinition[] = [
  // ==========================================================================
  // Group 1: Daily Routine
  // ==========================================================================
  {
    id: 'wear_n95_mask_outside',
    title: 'Wear a Fitted N95 / FFP2 Mask Outdoors',
    description:
      'Wear a well-fitted certified N95 or FFP2 respirator for all outdoor commutes, walks, and errands during smog hours.',
    category: 'daily_routine',
  },
  {
    id: 'shift_outdoor_exercise_to_cleanest_hour',
    title: 'Shift Outdoor Exercise / Walks to the Cleanest Forecast Hour',
    description:
      'Move jogging, walking, or strenuous outdoor chores to the cleanest forecasted daytime window (typically midday) instead of high-inversion early morning hours.',
    category: 'daily_routine',
    defaultDurationHours: 1,
  },
  {
    id: 'seal_windows_during_peak_inversion',
    title: 'Keep Windows Sealed During Morning & Night Thermal Inversion',
    description:
      'Keep doors and windows firmly closed during early morning and late evening hours when cold air traps ground-level toxic particulates.',
    category: 'daily_routine',
  },
  {
    id: 'wet_mop_instead_of_dry_sweeping',
    title: 'Wet Mop Floors Instead of Dry Broom Sweeping',
    description:
      'Clean indoor floors with a damp mop instead of dry brooms to avoid kicking settled fine particulates back into the breathing zone.',
    category: 'daily_routine',
  },
  {
    id: 'post_commute_hygiene',
    title: 'Wash Face & Use Nasal Saline Rinse Post-Commute',
    description:
      'Rinse face, eyes, and perform a gentle isotonic saline nasal rinse upon returning home to clear deposited particulates from upper airways.',
    category: 'daily_routine',
  },
  {
    id: 'keep_children_indoors_morning_smog',
    title: 'Keep Children Indoors During Morning Smog Peaks',
    description:
      'Suspend morning outdoor school assemblies, sports practice, and playground time when morning AQI is severe.',
    category: 'daily_routine',
    defaultDurationHours: 1.5,
  },
  {
    id: 'combine_or_cancel_outdoor_errands',
    title: 'Combine or Cancel Non-Essential Outdoor Errands',
    description:
      'Consolidate multiple shopping or administrative trips into a single errand or defer non-urgent outdoor travel during hazardous smog alerts.',
    category: 'daily_routine',
  },

  // ==========================================================================
  // Group 2: Indoor Air
  // ==========================================================================
  {
    id: 'run_hepa_air_purifier_bedroom',
    title: 'Run a HEPA Air Purifier in Main Sleeping Rooms',
    description:
      'Operate a true HEPA air purifier in closed bedrooms throughout the night to ensure clean air for 7-8 hours of uninterrupted rest.',
    category: 'indoor_air',
    defaultDurationHours: 8,
  },
  {
    id: 'diy_corsi_rosenthal_box',
    title: 'Build & Run a DIY Corsi-Rosenthal Box Air Cleaner',
    description:
      'Construct an affordable high-volume air filter using a 20-inch box fan and four MERV-13 pleated air filters for large living spaces.',
    category: 'indoor_air',
    defaultDurationHours: 8,
  },
  {
    id: 'use_exhaust_fan_cooking',
    title: 'Use Kitchen Exhaust Chimney / Exhaust Fan While Cooking',
    description:
      'Run kitchen exhaust hoods or exhaust fans at high speed during frying, boiling, and tempering (tadka) to vent fine combustion aerosols.',
    category: 'indoor_air',
    defaultDurationHours: 1.5,
  },
  {
    id: 'ventilate_at_cleanest_afternoon_hour',
    title: 'Airs Out the Home Only During the Cleanest Midday Window',
    description:
      'Perform brief cross-ventilation (15-20 minutes) strictly during peak afternoon solar mixing when outdoor PM2.5 dips, flushing indoor CO2 without trapping morning smog.',
    category: 'indoor_air',
  },
  {
    id: 'eliminate_incense_and_mosquito_coils',
    title: 'Eliminate Agarbatti (Incense Sticks) & Mosquito Coils',
    description:
      'Stop smoldering incense sticks, dhoop, and mosquito coils indoors; replace with electric mosquito vaporizers or essential oil diffusers.',
    category: 'indoor_air',
  },
  {
    id: 'avoid_non_hepa_vacuuming',
    title: 'Avoid Non-HEPA Vacuum Cleaning During Smog Season',
    description:
      'Refrain from using conventional bag/cyclonic vacuum cleaners that blow fine respirable dust back into indoor air; use damp microfiber cloths instead.',
    category: 'indoor_air',
  },
  {
    id: 'weatherstrip_doors_and_windows',
    title: 'Weatherstrip Exterior Doors & Seal Window Gaps',
    description:
      'Install silicone draft seals, door sweeps, or damp rolled towels under outer doors and window sills to stop outdoor smog infiltration.',
    category: 'indoor_air',
  },

  // ==========================================================================
  // Group 3: Sustainable Swaps
  // ==========================================================================
  {
    id: 'swap_car_for_metro',
    title: 'Switch Daily Car Commute to Metro / Electric Rail',
    description:
      'Replace solo petrol or diesel passenger car commuting with electrified metro rail transit for daily work travel.',
    category: 'sustainable_swaps',
  },
  {
    id: 'swap_two_wheeler_for_metro_or_bus',
    title: 'Switch Two-Wheeler Commute to Metro or Electric Bus',
    description:
      'Shift motorcycle/scooter commuting to mass transit to drastically cut personal tailpipe exposure and reduce on-road fleet emissions.',
    category: 'sustainable_swaps',
  },
  {
    id: 'carpool_to_work',
    title: 'Carpool with Neighbors or Colleagues (2-3 Per Vehicle)',
    description:
      'Share car rides with nearby coworkers or neighbors to take at least one private vehicle off the road daily.',
    category: 'sustainable_swaps',
  },
  {
    id: 'work_from_home_on_smog_days',
    title: 'Work from Home (WFH) on High Smog Alert Days',
    description:
      'Eliminate daily round-trip commute travel entirely on red/severe AQI alert days when remote work is feasible.',
    category: 'sustainable_swaps',
  },
  {
    id: 'stop_open_waste_burning',
    title: 'Eliminate Open Burning of Garden Leaves & Solid Waste',
    description:
      'Mulch, compost, or bag garden leaves and solid waste instead of burning them in backyards or street corners.',
    category: 'sustainable_swaps',
  },
  {
    id: 'swap_biomass_cookstove_to_induction',
    title: 'Switch from Traditional Biomass Cookstove to Induction Cooktop',
    description:
      'Transition household cooking from solid biomass/wood/dung chulhas to clean electric induction stoves.',
    category: 'sustainable_swaps',
  },
  {
    id: 'swap_biomass_or_kerosene_heating_to_electric',
    title: 'Switch Solid Fuel / Kerosene Space Heating to Electric Radiators',
    description:
      'Replace unvented wood, coal, or kerosene winter space heaters with oil-filled electric radiators or heat pumps.',
    category: 'sustainable_swaps',
  },
];

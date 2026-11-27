import { type ActionDefinition } from './catalogue';

export const ROUTINE_ACTIONS_RAW: Omit<ActionDefinition, 'costRupees' | 'costLabel'>[] = [
  {
    id: 'wear_n95_mask_outside',
    title: 'Wear a Fitted N95 / FFP2 Mask Outdoors',
    description:
      'Wear a well-fitted certified N95 or FFP2 respirator for all outdoor commutes, walks, and errands during smog hours.',
    category: 'daily_routine',
  },
  {
    id: 'senior_indoor_morning_walk',
    title: 'Move Senior Morning Walks Indoors or to Cleanest Window',
    description:
      'Shift early morning walks during peak cold-air smog inversions (5 AM – 8 AM) indoors or to the cleanest forecast window.',
    category: 'daily_routine',
    defaultDurationHours: 1,
  },
  {
    id: 'seniors_avoid_strenuous_outdoor',
    title: 'Avoid Strenuous Outdoor Exertion for Elderly Family Members',
    description:
      'Keep physical exertion low during peak smog alerts; substitute outdoor chores with restful indoor routines.',
    category: 'daily_routine',
  },
  {
    id: 'shift_outdoor_exercise_to_cleanest_hour',
    title: 'Shift Outdoor Exercise / Walks to Cleanest Forecast Hour',
    description:
      'Move jogging, walking, or strenuous chores to the cleanest forecasted daytime window instead of peak early morning hours.',
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
      'Rinse face, eyes, and perform a gentle isotonic saline nasal rinse upon returning home to clear deposited particulates.',
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
      'Consolidate multiple trips into a single errand or defer non-urgent outdoor travel during hazardous smog alerts.',
    category: 'daily_routine',
  },
  {
    id: 'keep_vulnerable_out_of_chulha_kitchen',
    title: 'Keep Children & Seniors Away from Kitchen During Stove Burning',
    description:
      'Keep children, seniors, and family members with breathing sensitivity away from the kitchen area while wood or chulha burns.',
    category: 'daily_routine',
    defaultDurationHours: 2,
  },
];

import { type ActionDefinition } from './catalogue';

export const INDOOR_AND_SWAPS_ACTIONS_RAW: Omit<ActionDefinition, 'costRupees' | 'costLabel'>[] = [
  {
    id: 'run_hepa_air_purifier_bedroom',
    title: 'Run a HEPA Air Purifier in Main Sleeping Rooms',
    description:
      'Operate a true HEPA air purifier in closed bedrooms throughout the night to ensure clean air during rest.',
    category: 'indoor_air',
    defaultDurationHours: 8,
  },
  {
    id: 'diy_corsi_rosenthal_box',
    title: 'Build & Run a DIY Corsi-Rosenthal Box Air Cleaner',
    description:
      'Construct an affordable high-volume air filter using a 20-inch box fan and four MERV-13 filters for shared living spaces.',
    category: 'indoor_air',
    defaultDurationHours: 8,
  },
  {
    id: 'use_exhaust_fan_cooking',
    title: 'Use Kitchen Exhaust Chimney / Exhaust Fan While Cooking',
    description:
      'Run kitchen exhaust hoods or fans at high speed during frying, boiling, and tempering (tadka) to vent combustion aerosols.',
    category: 'indoor_air',
    defaultDurationHours: 1.5,
  },
  {
    id: 'ventilate_at_cleanest_afternoon_hour',
    title: 'Airs Out Home Only During Cleanest Midday Window',
    description:
      'Perform brief cross-ventilation (15-20 mins) strictly during peak solar mixing when outdoor PM2.5 dips.',
    category: 'indoor_air',
  },
  {
    id: 'eliminate_incense_and_mosquito_coils',
    title: 'Eliminate Agarbatti (Incense Sticks) & Mosquito Coils',
    description:
      'Stop smoldering incense sticks, dhoop, and mosquito coils indoors; replace with electric vaporizers or diffusers.',
    category: 'indoor_air',
  },
  {
    id: 'avoid_non_hepa_vacuuming',
    title: 'Avoid Non-HEPA Vacuum Cleaning During Smog Season',
    description:
      'Refrain from using conventional vacuum cleaners that blow fine respirable dust back into indoor air; use damp cloths.',
    category: 'indoor_air',
  },
  {
    id: 'weatherstrip_doors_and_windows',
    title: 'Weatherstrip Exterior Doors & Seal Window Gaps',
    description:
      'Install silicone draft seals, door sweeps, or damp rolled towels under outer doors and window sills to stop smog leaks.',
    category: 'indoor_air',
  },
  {
    id: 'cook_with_kitchen_cross_ventilation',
    title: 'Ventilate Kitchen During Cleanest Window While Cooking on Chulha',
    description:
      'Keep doors and windows open strictly on the kitchen side while cooking to vent smoke outdoors, keeping living area doors closed.',
    category: 'indoor_air',
    defaultDurationHours: 2,
  },
  {
    id: 'use_dry_seasoned_chulha_fuel',
    title: 'Burn Only Dry, Well-Seasoned Wood & Biomass Fuel',
    description:
      'Use thoroughly dried, seasoned firewood and biomass; burning damp or green wood produces up to 3x more toxic particulates and dense indoor smoke.',
    category: 'indoor_air',
  },
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
      'Shift motorcycle/scooter commuting to mass transit to drastically cut personal tailpipe exposure and fleet emissions.',
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
    title: 'Switch from Traditional Biomass Cookstove to Induction',
    description:
      'Transition household cooking from solid biomass/wood/dung chulhas to clean electric induction stoves.',
    category: 'sustainable_swaps',
  },
  {
    id: 'swap_biomass_or_kerosene_heating_to_electric',
    title: 'Switch Solid Fuel / Kerosene Heating to Electric Radiators',
    description:
      'Replace unvented wood, coal, or kerosene winter space heaters with electric radiators or heat pumps.',
    category: 'sustainable_swaps',
  },
];

import { type PlanRequest } from './types';

interface BasisInput {
  aqiStr: string;
  vulnerability: string;
  profile: PlanRequest;
  cleanestWindowText: string;
}

/** The most relevant at-risk group in the household, used to personalise each basis line. */
function describeVulnerability(profile: PlanRequest): string {
  const { childrenCount, elderlyCount, adultsCount } = profile;
  if (profile.hasAsthmaOrRespiratoryCondition) {
    return childrenCount > 0 ? 'child with asthma' : 'respiratory sensitivity';
  }
  if (childrenCount > 0) return `${childrenCount} child(ren)`;
  if (elderlyCount > 0) return `${elderlyCount} senior(s)`;
  if (adultsCount === 1) return 'solo adult';
  return `${adultsCount + childrenCount + elderlyCount} occupants`;
}

const commuteLabel = (p: PlanRequest) =>
  `${p.dailyCommuteDistanceKm} km ${p.primaryCommuteMode.replace('_', ' ')} commute`;
const budgetLabel = (p: PlanRequest) => `${p.budget.replace('_', ' ')} budget`;
const seniorsLabel = (p: PlanRequest) => `${p.elderlyCount || 2} senior(s) in home`;

/** One short "why this applies to you" line per catalogue action. */
const BASIS_BUILDERS: Record<string, (b: BasisInput) => string> = {
  wear_n95_mask_outside: (b) =>
    `${b.aqiStr} forecast · ${b.vulnerability} · ${b.profile.commutersCount > 0 ? commuteLabel(b.profile) : 'outdoor errands'}`,
  senior_indoor_morning_walk: (b) =>
    `${b.aqiStr} morning inversion · ${seniorsLabel(b.profile)} · morning walk routine`,
  seniors_avoid_strenuous_outdoor: (b) =>
    `${b.aqiStr} alert · ${seniorsLabel(b.profile)} · cardiovascular protection`,
  keep_children_indoors_morning_smog: (b) =>
    `${b.aqiStr} peak morning smog · ${b.vulnerability} · indoor protection`,
  shift_outdoor_exercise_to_cleanest_hour: (b) =>
    `Cleanest window (${b.cleanestWindowText}) · outdoor exercise routine (${b.profile.exerciseHoursPerDay}h/day)`,
  ventilate_at_cleanest_afternoon_hour: (b) =>
    `Cleanest window (${b.cleanestWindowText}) · ${b.vulnerability} · sealing: ${b.profile.windowSealingQuality}`,
  work_from_home_on_smog_days: (b) =>
    `${b.aqiStr} alert · ${commuteLabel(b.profile)} · WFH eligible`,
  swap_car_for_metro: (b) =>
    `${b.aqiStr} alert · ${b.profile.dailyCommuteDistanceKm} km car commute · road emission reduction`,
  carpool_to_work: (b) =>
    `${b.aqiStr} alert · ${b.profile.dailyCommuteDistanceKm} km car commute · road emission reduction`,
  swap_two_wheeler_for_metro_or_bus: (b) =>
    `${b.aqiStr} alert · ${b.profile.dailyCommuteDistanceKm} km two-wheeler ride · direct exhaust avoidance`,
  swap_biomass_cookstove_to_induction: (b) =>
    `Biomass chulha cooking · high indoor PM2.5 emissions · ${budgetLabel(b.profile)}`,
  swap_biomass_or_kerosene_heating_to_electric: (b) =>
    `Solid fuel space heating · indoor carbon monoxide and smoke · ${budgetLabel(b.profile)}`,
  run_hepa_air_purifier_bedroom: (b) =>
    `${b.aqiStr} nighttime inversion · ${b.vulnerability} · bedroom sanctuary`,
  diy_corsi_rosenthal_box: (b) =>
    `${b.aqiStr} alert · ${b.vulnerability} · ${b.profile.homeAreaSqFt} sq ft living area`,
  wet_mop_instead_of_dry_sweeping: (b) =>
    `Daily dust resuspension control · ${b.vulnerability} · damp cleaning`,
  seal_windows_during_peak_inversion: (b) =>
    `Night & morning thermal inversion · ${b.vulnerability} · sealing: ${b.profile.windowSealingQuality}`,
  eliminate_incense_and_mosquito_coils: (b) =>
    `Indoor incense/coils reported · ${b.vulnerability} · eliminates smoldering PM2.5 source`,
  stop_open_waste_burning: () =>
    `Backyard leaf/waste burning reported · localized smoke plume · Free (₹0)`,
  post_commute_hygiene: (b) =>
    `Upper airway particulate clearance · ${b.vulnerability} · post-commute routine`,
  combine_or_cancel_outdoor_errands: (b) =>
    `${b.aqiStr} alert · ${b.vulnerability} · non-essential trips consolidation`,
  weatherstrip_doors_and_windows: (b) =>
    `Draft infiltration reduction · ${b.vulnerability} · sealing: ${b.profile.windowSealingQuality}`,
};

/**
 * Explains, in one line, which live reading and household facts make an action relevant.
 */
export function generateBasisExplanation(
  actionId: string,
  profile: PlanRequest,
  currentAqi: number | null = null,
  cleanestWindowText = 'afternoon'
): string {
  const input: BasisInput = {
    aqiStr: typeof currentAqi === 'number' ? `AQI ${currentAqi}` : 'Air quality advisory',
    vulnerability: describeVulnerability(profile),
    profile,
    cleanestWindowText,
  };
  const build = BASIS_BUILDERS[actionId];
  return build ? build(input) : `${input.aqiStr} · tailored for ${input.vulnerability}`;
}

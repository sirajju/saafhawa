import { type PlanRequest } from './types';

export function generateBasisExplanation(
  actionId: string,
  profile: PlanRequest,
  currentAqi: number | null = null,
  cleanestWindowText = 'afternoon'
): string {
  const aqiStr = typeof currentAqi === 'number' ? `AQI ${currentAqi}` : 'Air quality advisory';
  const isSolo =
    profile.adultsCount === 1 && profile.childrenCount === 0 && profile.elderlyCount === 0;

  const vulnerability = profile.hasAsthmaOrRespiratoryCondition
    ? profile.childrenCount > 0
      ? 'child with asthma'
      : 'respiratory sensitivity'
    : profile.childrenCount > 0
      ? `${profile.childrenCount} child(ren)`
      : profile.elderlyCount > 0
        ? `${profile.elderlyCount} senior(s)`
        : isSolo
          ? 'solo adult'
          : `${profile.adultsCount + profile.childrenCount + profile.elderlyCount} occupants`;

  switch (actionId) {
    case 'wear_n95_mask_outside': {
      const transit =
        profile.commutersCount > 0
          ? `${profile.dailyCommuteDistanceKm} km ${profile.primaryCommuteMode.replace('_', ' ')} commute`
          : 'outdoor errands';
      return `${aqiStr} forecast · ${vulnerability} · ${transit}`;
    }

    case 'senior_indoor_morning_walk':
      return `${aqiStr} morning inversion · ${profile.elderlyCount || 2} senior(s) in home · morning walk routine`;

    case 'seniors_avoid_strenuous_outdoor':
      return `${aqiStr} alert · ${profile.elderlyCount || 2} senior(s) in home · cardiovascular protection`;

    case 'keep_children_indoors_morning_smog':
      return `${aqiStr} peak morning smog · ${vulnerability} · indoor protection`;

    case 'shift_outdoor_exercise_to_cleanest_hour':
      return `Cleanest window (${cleanestWindowText}) · outdoor exercise routine (${profile.exerciseHoursPerDay}h/day)`;

    case 'ventilate_at_cleanest_afternoon_hour':
      return `Cleanest window (${cleanestWindowText}) · ${vulnerability} · sealing: ${profile.windowSealingQuality}`;

    case 'work_from_home_on_smog_days':
      return `${aqiStr} alert · ${profile.dailyCommuteDistanceKm} km ${profile.primaryCommuteMode.replace('_', ' ')} commute · WFH eligible`;

    case 'swap_car_for_metro':
    case 'carpool_to_work':
      return `${aqiStr} alert · ${profile.dailyCommuteDistanceKm} km car commute · road emission reduction`;

    case 'swap_two_wheeler_for_metro_or_bus':
      return `${aqiStr} alert · ${profile.dailyCommuteDistanceKm} km two-wheeler ride · direct exhaust avoidance`;

    case 'swap_biomass_cookstove_to_induction':
      return `Biomass chulha cooking · high indoor PM2.5 emissions · ${profile.budget.replace('_', ' ')} budget`;

    case 'swap_biomass_or_kerosene_heating_to_electric':
      return `Solid fuel space heating · indoor carbon monoxide and smoke · ${profile.budget.replace('_', ' ')} budget`;

    case 'run_hepa_air_purifier_bedroom':
      return `${aqiStr} nighttime inversion · ${vulnerability} · bedroom sanctuary`;

    case 'diy_corsi_rosenthal_box':
      return `${aqiStr} alert · ${vulnerability} · ${profile.homeAreaSqFt} sq ft living area`;

    case 'wet_mop_instead_of_dry_sweeping':
      return `Daily dust resuspension control · ${vulnerability} · damp cleaning`;

    case 'seal_windows_during_peak_inversion':
      return `Night & morning thermal inversion · ${vulnerability} · sealing: ${profile.windowSealingQuality}`;

    case 'eliminate_incense_and_mosquito_coils':
      return `Indoor incense/coils reported · ${vulnerability} · eliminates smoldering PM2.5 source`;

    case 'stop_open_waste_burning':
      return `Backyard leaf/waste burning reported · localized smoke plume · Free (₹0)`;

    case 'post_commute_hygiene':
      return `Upper airway particulate clearance · ${vulnerability} · post-commute routine`;

    case 'combine_or_cancel_outdoor_errands':
      return `${aqiStr} alert · ${vulnerability} · non-essential trips consolidation`;

    case 'weatherstrip_doors_and_windows':
      return `Draft infiltration reduction · ${vulnerability} · sealing: ${profile.windowSealingQuality}`;

    default:
      return `${aqiStr} · tailored for ${vulnerability}`;
  }
}

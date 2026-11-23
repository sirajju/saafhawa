import { ACTION_CATALOGUE, ActionDefinition } from './catalogue';
import {
  BIOMASS_AND_OPEN_BURNING_FACTORS,
  FILTRATION_AND_INFILTRATION_FACTORS,
  INCENSE_AND_BURNING_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
  VEHICULAR_EMISSION_FACTORS,
} from './factors';
import {
  ActionImpactResult,
  AirQualityContext,
  HouseholdImpactSummary,
  HouseholdProfile,
  HouseholdProfileSchema,
} from './types';

/**
 * Calculates total volume of air inhaled by household occupants for a given activity and duration.
 */
function calculateInhaledAirVolumeM3(
  profile: HouseholdProfile,
  activity: 'resting' | 'light' | 'exercise',
  durationHours: number
): number {
  if (durationHours <= 0) return 0;

  const adultRate =
    activity === 'exercise'
      ? INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE
      : activity === 'resting'
      ? INHALATION_RATES_M3_PER_HOUR.ADULT_RESTING
      : INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY;

  const childRate = INHALATION_RATES_M3_PER_HOUR.CHILD_DAILY_AVERAGE;
  const elderlyRate = INHALATION_RATES_M3_PER_HOUR.ELDERLY_DAILY_AVERAGE;

  const totalRatePerHr =
    profile.adultsCount * adultRate +
    profile.childrenCount * childRate +
    profile.elderlyCount * elderlyRate;

  return Number((totalRatePerHr * durationHours).toFixed(3));
}

/**
 * Extracts ambient diurnal parameters (current, peak, cleanest) from air quality context.
 */
function extractAirQualityParameters(airQuality: AirQualityContext): {
  currentPm25: number;
  peakPm25: number;
  cleanestPm25: number;
} {
  const current = Math.max(0, airQuality.currentPm25 || 0);

  if (airQuality.hourlyForecast && airQuality.hourlyForecast.length > 0) {
    const validForecastValues = airQuality.hourlyForecast
      .map((p) => p.pm25?.value)
      .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v >= 0);

    if (validForecastValues.length > 0) {
      const min = Math.min(...validForecastValues);
      const max = Math.max(...validForecastValues);
      return {
        currentPm25: current,
        peakPm25: Math.max(current, max),
        cleanestPm25: Math.min(current, min),
      };
    }
  }

  // Fallback estimates based on typical diurnal boundary layer inversion
  return {
    currentPm25: current,
    peakPm25: Number((current * 1.3).toFixed(1)),
    cleanestPm25: Number((current * 0.7).toFixed(1)),
  };
}

/**
 * Evaluates the impact of a specific action for a household.
 */
export function calculateActionImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  airQuality: AirQualityContext
): ActionImpactResult {
  const { currentPm25, peakPm25, cleanestPm25 } = extractAirQualityParameters(airQuality);

  let applicable = true;
  let reasonIfNotApplicable: string | undefined;
  let concentrationReduction = 0;
  let doseAvoidedUg = 0;
  let percentageDrop = 0;
  let pm25SavedGrams = 0;
  let co2SavedGrams = 0;
  let methodologyNotes: string | undefined;

  switch (action.id) {
    // ========================================================================
    // Group 1: Daily Routine
    // ========================================================================
    case 'wear_n95_mask_outside': {
      if (profile.dailyOutdoorHoursPerPerson <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'Household profile reports 0 daily outdoor hours';
      } else {
        const outdoorVolume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          profile.dailyOutdoorHoursPerPerson
        );
        concentrationReduction =
          currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.N95_MASK_REAL_WORLD_EFFICIENCY;
        doseAvoidedUg = concentrationReduction * outdoorVolume;
        percentageDrop = FILTRATION_AND_INFILTRATION_FACTORS.N95_MASK_REAL_WORLD_EFFICIENCY * 100;
        methodologyNotes = 'Based on 85% real-world N95 fitted filtration efficiency over daily outdoor time.';
      }
      break;
    }

    case 'shift_outdoor_exercise_to_cleanest_hour': {
      if (!profile.doesOutdoorExercise || profile.exerciseHoursPerDay <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not participate in outdoor exercise';
      } else {
        const deltaC = Math.max(0, peakPm25 - cleanestPm25);
        const exerciseVolume =
          profile.adultsCount *
          INHALATION_RATES_M3_PER_HOUR.ADULT_EXERCISE *
          profile.exerciseHoursPerDay;
        concentrationReduction = deltaC;
        doseAvoidedUg = deltaC * exerciseVolume;
        percentageDrop = peakPm25 > 0 ? (deltaC / peakPm25) * 100 : 0;
        methodologyNotes = `Avoids peak diurnal inversion PM2.5 (${peakPm25} µg/m³) during high-ventilation workouts by shifting to cleanest hour (${cleanestPm25} µg/m³).`;
      }
      break;
    }

    case 'seal_windows_during_peak_inversion': {
      // Unsealed/open window infiltration ratio is ~0.80, closed is ~0.50
      const deltaInfiltration =
        FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO -
        FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      concentrationReduction = currentPm25 * deltaInfiltration;
      const restingVolume = calculateInhaledAirVolumeM3(profile, 'resting', 8);
      doseAvoidedUg = concentrationReduction * restingVolume;
      percentageDrop =
        (deltaInfiltration /
          FILTRATION_AND_INFILTRATION_FACTORS.OPEN_OR_DRAFTY_INFILTRATION_RATIO) *
        100;
      methodologyNotes = 'Reduces indoor infiltration from 80% to 50% during 8 hours of overnight thermal inversion.';
      break;
    }

    case 'wet_mop_instead_of_dry_sweeping': {
      concentrationReduction =
        FILTRATION_AND_INFILTRATION_FACTORS.WET_MOPPING_AVOIDED_RESUSPENSION_UG_M3;
      const exposedVolume = calculateInhaledAirVolumeM3(
        profile,
        'light',
        FILTRATION_AND_INFILTRATION_FACTORS.CLEANING_RESUSPENSION_DURATION_HOURS
      );
      doseAvoidedUg = concentrationReduction * exposedVolume;
      percentageDrop = 85.0; // 85% dust resuspension prevention
      methodologyNotes = 'Eliminates ~25 µg/m³ of resuspended fine domestic dust over 3 hours post-cleaning.';
      break;
    }

    case 'post_commute_hygiene': {
      if (profile.dailyOutdoorHoursPerPerson <= 0 && profile.primaryCommuteMode === 'none') {
        applicable = false;
        reasonIfNotApplicable = 'Household has no outdoor exposure or commute';
      } else {
        const outdoorVolume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          profile.dailyOutdoorHoursPerPerson
        );
        const baselineOutdoorDose = currentPm25 * outdoorVolume;
        concentrationReduction =
          currentPm25 *
          FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR;
        doseAvoidedUg =
          baselineOutdoorDose *
          FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR;
        percentageDrop =
          FILTRATION_AND_INFILTRATION_FACTORS.POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR * 100;
        methodologyNotes = 'Removes 5% of deposited upper airway and facial particulates after outdoor commutes.';
      }
      break;
    }

    case 'keep_children_indoors_morning_smog': {
      if (profile.childrenCount <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'No children in household profile';
      } else {
        // Keeps kids indoors during morning inversion (indoor is ~50% of outdoor)
        const indoorPm25 =
          peakPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
        concentrationReduction = Math.max(0, peakPm25 - indoorPm25);
        const childAssemblyVolume =
          profile.childrenCount *
          INHALATION_RATES_M3_PER_HOUR.CHILD_DAILY_AVERAGE *
          (action.defaultDurationHours || 1.5);
        doseAvoidedUg = concentrationReduction * childAssemblyVolume;
        percentageDrop = 50.0;
        methodologyNotes = 'Prevents morning assembly and sports exposure during 1.5 hours of peak inversion.';
      }
      break;
    }

    case 'combine_or_cancel_outdoor_errands': {
      const errandDurationHours = 0.75;
      const errandVolume =
        1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * errandDurationHours;
      concentrationReduction = currentPm25;
      doseAvoidedUg = currentPm25 * errandVolume;
      percentageDrop = 100.0;

      // Also saves personal driving emissions if commuting by car/bike
      if (
        profile.primaryCommuteMode === 'petrol_car' ||
        profile.primaryCommuteMode === 'diesel_car'
      ) {
        const errandDistKm = 5.0; // 5 km errand trip avoided
        pm25SavedGrams =
          errandDistKm *
          (profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM);
        co2SavedGrams =
          errandDistKm *
          (profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM);
      } else if (profile.primaryCommuteMode === 'two_wheeler') {
        const errandDistKm = 5.0;
        pm25SavedGrams = errandDistKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM;
        co2SavedGrams = errandDistKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM;
      }
      methodologyNotes = 'Avoids 45 minutes of direct transit exposure and 5 km of personal driving.';
      break;
    }

    // ========================================================================
    // Group 2: Indoor Air
    // ========================================================================
    case 'run_hepa_air_purifier_bedroom': {
      const baselineIndoor =
        currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      concentrationReduction =
        baselineIndoor *
        FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY;
      const sleepVolume = calculateInhaledAirVolumeM3(
        profile,
        'resting',
        action.defaultDurationHours || 8
      );
      doseAvoidedUg = concentrationReduction * sleepVolume;
      percentageDrop =
        FILTRATION_AND_INFILTRATION_FACTORS.HEPA_AIR_PURIFIER_ROOM_EFFICIENCY * 100;
      methodologyNotes = 'Achieves 75% steady-state particulate reduction in sleeping quarters over 8 hours.';
      break;
    }

    case 'diy_corsi_rosenthal_box': {
      const baselineIndoor =
        currentPm25 * FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
      concentrationReduction =
        baselineIndoor * FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_BOX_EFFICIENCY;
      const livingAreaVolume = calculateInhaledAirVolumeM3(
        profile,
        'light',
        action.defaultDurationHours || 8
      );
      doseAvoidedUg = concentrationReduction * livingAreaVolume;
      percentageDrop = FILTRATION_AND_INFILTRATION_FACTORS.CORSI_ROSENTHAL_BOX_EFFICIENCY * 100;
      methodologyNotes = 'Low-cost 4x MERV-13 box-fan cleaner providing 68% living room filtration over 8 hours.';
      break;
    }

    case 'use_exhaust_fan_cooking': {
      concentrationReduction =
        FILTRATION_AND_INFILTRATION_FACTORS.COOKING_INDOOR_PM25_SPIKE_UG_M3 *
        FILTRATION_AND_INFILTRATION_FACTORS.KITCHEN_EXHAUST_CAPTURE_EFFICIENCY;
      // Exposure avoided for cook (1 adult) + ambient household during 1.5 hr cooking
      const cookVolume =
        1 *
        INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY *
        FILTRATION_AND_INFILTRATION_FACTORS.COOKING_DAILY_DURATION_HOURS;
      doseAvoidedUg = concentrationReduction * cookVolume;
      percentageDrop =
        FILTRATION_AND_INFILTRATION_FACTORS.KITCHEN_EXHAUST_CAPTURE_EFFICIENCY * 100;
      methodologyNotes = 'Captures 70% of frying and tadka aerosol spikes directly at the cooktop.';
      break;
    }

    case 'ventilate_at_cleanest_afternoon_hour': {
      // Compares midday ventilation vs morning/evening ventilation
      const deltaAmbient = Math.max(0, peakPm25 - cleanestPm25);
      concentrationReduction = deltaAmbient * 0.40; // Avoids ~40% trapped inversion smoke
      const indoorAfternoonVolume = calculateInhaledAirVolumeM3(profile, 'light', 4);
      doseAvoidedUg = concentrationReduction * indoorAfternoonVolume;
      percentageDrop = peakPm25 > 0 ? (deltaAmbient / peakPm25) * 40 : 0;
      methodologyNotes = 'Airs out CO2 and indoor VOCs during afternoon solar dispersion rather than high-inversion hours.';
      break;
    }

    case 'eliminate_incense_and_mosquito_coils': {
      if (!profile.usesIncenseOrMosquitoCoils) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not use incense sticks or mosquito coils';
      } else {
        concentrationReduction = INCENSE_AND_BURNING_FACTORS.INCENSE_ROOM_PM25_ELEVATION_UG_M3;
        const volume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          INCENSE_AND_BURNING_FACTORS.INCENSE_DAILY_HOURS
        );
        doseAvoidedUg = concentrationReduction * volume;
        percentageDrop = 100.0;
        // Direct source emission reductions (assumes 2 sticks or coils daily)
        const sticksPerDay = 2;
        pm25SavedGrams =
          sticksPerDay * INCENSE_AND_BURNING_FACTORS.PM25_PER_INCENSE_STICK_OR_COIL_GRAMS;
        co2SavedGrams =
          sticksPerDay * INCENSE_AND_BURNING_FACTORS.CO2_PER_INCENSE_STICK_OR_COIL_GRAMS;
        methodologyNotes = 'Avoids burning 2 smoldering coils/sticks, eliminating 70 mg of direct PM2.5 emissions.';
      }
      break;
    }

    case 'avoid_non_hepa_vacuuming': {
      concentrationReduction =
        FILTRATION_AND_INFILTRATION_FACTORS.NON_HEPA_VACUUM_RESUSPENSION_UG_M3;
      const volume = calculateInhaledAirVolumeM3(profile, 'light', 2);
      doseAvoidedUg = concentrationReduction * volume;
      percentageDrop = 100.0;
      methodologyNotes = 'Prevents micro-particulate blowback from porous non-HEPA vacuum exhaust filters.';
      break;
    }

    case 'weatherstrip_doors_and_windows': {
      if (profile.windowSealingQuality === 'good') {
        applicable = false;
        reasonIfNotApplicable = 'Household windows and doors are already well sealed';
      } else {
        const deltaInfiltration =
          FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION *
          FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO;
        concentrationReduction = currentPm25 * deltaInfiltration;
        const dailyIndoorVolume = calculateInhaledAirVolumeM3(profile, 'light', 16);
        doseAvoidedUg = concentrationReduction * dailyIndoorVolume;
        percentageDrop =
          FILTRATION_AND_INFILTRATION_FACTORS.WEATHERSTRIPPING_INFILTRATION_REDUCTION * 100;
        methodologyNotes = 'Reduces continuous exterior ambient smog leakage through gaps by 30%.';
      }
      break;
    }

    // ========================================================================
    // Group 3: Sustainable Swaps
    // ========================================================================
    case 'swap_car_for_metro': {
      const isCar =
        profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car';
      if (!isCar || profile.dailyCommuteDistanceKm <= 0) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not commute by personal car';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;
        const carPm25Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM;

        const carCo2Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;

        pm25SavedGrams =
          distanceKm * (carPm25Factor - VEHICULAR_EMISSION_FACTORS.METRO_PM25_G_PER_PASSENGER_KM);
        co2SavedGrams =
          distanceKm * (carCo2Factor - VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM);

        // In-transit exposure difference (car cabin ~0.45 ambient, metro air conditioned ~0.30)
        concentrationReduction =
          currentPm25 *
          (VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO -
            VEHICULAR_EMISSION_FACTORS.METRO_IN_TRANSIT_EXPOSURE_RATIO);
        const transitVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * 1.0;
        doseAvoidedUg = Math.max(0, concentrationReduction * transitVolume);
        percentageDrop = 33.3; // (0.45 - 0.30) / 0.45
        methodologyNotes = `Replaces ${distanceKm} km of car driving with electric metro rail, saving tailpipe and brake emissions.`;
      }
      break;
    }

    case 'swap_two_wheeler_for_metro_or_bus': {
      if (
        profile.primaryCommuteMode !== 'two_wheeler' ||
        profile.dailyCommuteDistanceKm <= 0
      ) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not commute by motorcycle or scooter';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;
        pm25SavedGrams =
          distanceKm *
          (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM -
            VEHICULAR_EMISSION_FACTORS.METRO_PM25_G_PER_PASSENGER_KM);
        co2SavedGrams =
          distanceKm *
          (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM -
            VEHICULAR_EMISSION_FACTORS.METRO_CO2_G_PER_PASSENGER_KM);

        // Two-wheeler riders are directly in exhaust wake (1.25x ambient); Metro coach is 0.30x ambient
        concentrationReduction =
          currentPm25 *
          (VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO -
            VEHICULAR_EMISSION_FACTORS.METRO_IN_TRANSIT_EXPOSURE_RATIO);
        const transitVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * 1.0;
        doseAvoidedUg = concentrationReduction * transitVolume;
        percentageDrop = 76.0; // (1.25 - 0.30) / 1.25
        methodologyNotes = 'Eliminates dangerous direct on-road tailpipe exhaust inhalation experienced by 2-wheeler riders.';
      }
      break;
    }

    case 'carpool_to_work': {
      const isCar =
        profile.primaryCommuteMode === 'petrol_car' || profile.primaryCommuteMode === 'diesel_car';
      if (!isCar || !profile.hasCarpoolOption || profile.dailyCommuteDistanceKm <= 0) {
        applicable = false;
        reasonIfNotApplicable = isCar
          ? 'Household profile indicates no carpool option available'
          : 'Household does not commute by personal car';
      } else {
        // Halves vehicular emissions by sharing rides
        const distanceKm = profile.dailyCommuteDistanceKm;
        const carPm25Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM;

        const carCo2Factor =
          profile.primaryCommuteMode === 'diesel_car'
            ? VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM
            : VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;

        pm25SavedGrams = 0.5 * distanceKm * carPm25Factor;
        co2SavedGrams = 0.5 * distanceKm * carCo2Factor;
        concentrationReduction = 0;
        doseAvoidedUg = 0;
        percentageDrop = 0;
        methodologyNotes = 'Halves personal commute trips by sharing a 2-person carpool.';
      }
      break;
    }

    case 'work_from_home_on_smog_days': {
      if (
        !profile.canWorkFromHome ||
        profile.primaryCommuteMode === 'none' ||
        profile.dailyCommuteDistanceKm <= 0
      ) {
        applicable = false;
        reasonIfNotApplicable = !profile.canWorkFromHome
          ? 'Work from home is not feasible for household members'
          : 'Household has no regular vehicular commute';
      } else {
        const distanceKm = profile.dailyCommuteDistanceKm;

        if (profile.primaryCommuteMode === 'petrol_car') {
          pm25SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.PETROL_CAR_PM25_G_PER_KM;
          co2SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;
        } else if (profile.primaryCommuteMode === 'diesel_car') {
          pm25SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_PM25_G_PER_KM;
          co2SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.DIESEL_CAR_CO2_G_PER_KM;
        } else if (profile.primaryCommuteMode === 'two_wheeler') {
          pm25SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_PM25_G_PER_KM;
          co2SavedGrams = distanceKm * VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_CO2_G_PER_KM;
        }

        // Avoids commute exposure (1 hour transit replaced by resting indoor air)
        const inTransitRatio =
          profile.primaryCommuteMode === 'two_wheeler'
            ? VEHICULAR_EMISSION_FACTORS.TWO_WHEELER_COMMUTE_EXPOSURE_RATIO
            : VEHICULAR_EMISSION_FACTORS.CAR_CABIN_EXPOSURE_RATIO;

        concentrationReduction =
          currentPm25 *
          (inTransitRatio -
            FILTRATION_AND_INFILTRATION_FACTORS.CLOSED_WINDOW_INFILTRATION_RATIO);

        const commuterVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * 1.0;
        doseAvoidedUg = Math.max(0, concentrationReduction * commuterVolume);
        percentageDrop = inTransitRatio > 0 ? (concentrationReduction / (currentPm25 * inTransitRatio)) * 100 : 0;
        methodologyNotes = 'Completely eliminates round-trip vehicular commute emissions and roadway transit exposure.';
      }
      break;
    }

    case 'stop_open_waste_burning': {
      if (!profile.hasGardenOrOpenWasteBurning) {
        applicable = false;
        reasonIfNotApplicable = 'Household does not burn garden waste or leaves';
      } else {
        const wasteWeightKg = BIOMASS_AND_OPEN_BURNING_FACTORS.TYPICAL_GARDEN_WASTE_PILE_KG;
        pm25SavedGrams =
          wasteWeightKg *
          BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BIOMASS_BURNING_PM25_G_PER_KG;
        co2SavedGrams =
          wasteWeightKg *
          BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BIOMASS_BURNING_CO2_G_PER_KG;

        concentrationReduction =
          BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BURNING_LOCAL_PM25_SPIKE_UG_M3;
        const householdVolume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BURNING_LOCAL_DURATION_HOURS
        );
        doseAvoidedUg = concentrationReduction * householdVolume;
        percentageDrop = 100.0;
        methodologyNotes = 'Prevents open burning of a 3 kg dry leaf pile, avoiding 75 g of PM2.5 and local smoke plume.';
      }
      break;
    }

    case 'swap_biomass_cookstove_to_induction': {
      if (profile.cookingFuel !== 'biomass') {
        applicable = false;
        reasonIfNotApplicable = 'Household already uses clean cooking fuel (LPG / Induction / Piped Gas)';
      } else {
        pm25SavedGrams =
          BIOMASS_AND_OPEN_BURNING_FACTORS.TRADITIONAL_CHULHA_DAILY_PM25_EMISSIONS_GRAMS;
        co2SavedGrams =
          BIOMASS_AND_OPEN_BURNING_FACTORS.TRADITIONAL_CHULHA_DAILY_CO2_EMISSIONS_GRAMS;

        concentrationReduction =
          BIOMASS_AND_OPEN_BURNING_FACTORS.CHULHA_COOKING_INDOOR_PM25_SPIKE_UG_M3;
        const chulhaVolume = calculateInhaledAirVolumeM3(
          profile,
          'light',
          BIOMASS_AND_OPEN_BURNING_FACTORS.CHULHA_COOKING_DAILY_DURATION_HOURS
        );
        doseAvoidedUg = concentrationReduction * chulhaVolume;
        percentageDrop = 100.0;
        methodologyNotes = 'Eliminates 34 g of daily solid biomass combustion emissions and indoor smoke chulha plumes.';
      }
      break;
    }

    case 'swap_biomass_or_kerosene_heating_to_electric': {
      if (profile.heatingFuel !== 'biomass' && profile.heatingFuel !== 'kerosene') {
        applicable = false;
        reasonIfNotApplicable = 'Household does not use solid fuel or kerosene space heating';
      } else {
        pm25SavedGrams =
          BIOMASS_AND_OPEN_BURNING_FACTORS.UNVENTED_SPACE_HEATING_DAILY_PM25_GRAMS;
        co2SavedGrams =
          BIOMASS_AND_OPEN_BURNING_FACTORS.UNVENTED_SPACE_HEATING_DAILY_CO2_GRAMS;

        concentrationReduction =
          BIOMASS_AND_OPEN_BURNING_FACTORS.UNVENTED_SPACE_HEATING_INDOOR_PM25_SPIKE_UG_M3;
        const heatingVolume = calculateInhaledAirVolumeM3(
          profile,
          'resting',
          BIOMASS_AND_OPEN_BURNING_FACTORS.SPACE_HEATING_DAILY_DURATION_HOURS
        );
        doseAvoidedUg = concentrationReduction * heatingVolume;
        percentageDrop = 100.0;
        methodologyNotes = 'Replaces unvented winter space heating with zero local-emission electric heating.';
      }
      break;
    }

    default: {
      applicable = false;
      reasonIfNotApplicable = `Unknown action identifier "${action.id}"`;
    }
  }

  return {
    actionId: action.id,
    title: action.title,
    description: action.description,
    category: action.category,
    applicable,
    reasonIfNotApplicable,
    exposureReduction: {
      pm25ConcentrationReductionUgM3: Number(Math.max(0, concentrationReduction).toFixed(1)),
      pm25InhaledDoseAvoidedUg: Number(Math.max(0, doseAvoidedUg).toFixed(1)),
      percentageDrop: Number(Math.min(100, Math.max(0, percentageDrop)).toFixed(1)),
    },
    emissionReduction: {
      pm25SavedGrams: Number(Math.max(0, pm25SavedGrams).toFixed(3)),
      co2SavedGrams: Number(Math.max(0, co2SavedGrams).toFixed(1)),
    },
    methodologyNotes,
  };
}

/**
 * Main calculation entrypoint: evaluates all catalogued actions for a household profile and air quality context.
 */
export function calculateHouseholdImpact(
  rawProfile: Partial<HouseholdProfile>,
  airQuality: AirQualityContext,
  customCatalogue: ActionDefinition[] = ACTION_CATALOGUE
): HouseholdImpactSummary {
  const profile = HouseholdProfileSchema.parse(rawProfile);

  const actionResults = customCatalogue.map((action) =>
    calculateActionImpact(action, profile, airQuality)
  );

  const applicableActions = actionResults.filter((a) => a.applicable);

  const totalPm25InhaledDoseAvoidedUg = Number(
    applicableActions
      .reduce((acc, curr) => acc + curr.exposureReduction.pm25InhaledDoseAvoidedUg, 0)
      .toFixed(1)
  );

  const totalPm25EmissionsSavedGrams = Number(
    applicableActions
      .reduce((acc, curr) => acc + curr.emissionReduction.pm25SavedGrams, 0)
      .toFixed(3)
  );

  const totalCo2EmissionsSavedGrams = Number(
    applicableActions
      .reduce((acc, curr) => acc + curr.emissionReduction.co2SavedGrams, 0)
      .toFixed(1)
  );

  const totalCo2EmissionsSavedKg = Number(
    (totalCo2EmissionsSavedGrams / 1000).toFixed(2)
  );

  // Top actions ranked by inhaled dose avoided
  const topActionsByExposure = [...applicableActions]
    .sort(
      (a, b) =>
        b.exposureReduction.pm25InhaledDoseAvoidedUg -
        a.exposureReduction.pm25InhaledDoseAvoidedUg
    )
    .slice(0, 3);

  // Top actions ranked by emissions saved (PM2.5 primary, CO2 secondary)
  const topActionsByEmissions = [...applicableActions]
    .sort((a, b) => {
      if (b.emissionReduction.pm25SavedGrams !== a.emissionReduction.pm25SavedGrams) {
        return b.emissionReduction.pm25SavedGrams - a.emissionReduction.pm25SavedGrams;
      }
      return b.emissionReduction.co2SavedGrams - a.emissionReduction.co2SavedGrams;
    })
    .slice(0, 3);

  return {
    totalApplicableActions: applicableActions.length,
    totalPm25InhaledDoseAvoidedUg,
    totalPm25EmissionsSavedGrams,
    totalCo2EmissionsSavedGrams,
    totalCo2EmissionsSavedKg,
    topActionsByExposure,
    topActionsByEmissions,
    actions: actionResults,
  };
}

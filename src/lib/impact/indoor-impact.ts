import { ActionDefinition } from './catalogue';
import {
  EQUIVALENCY_FACTORS,
  FILTRATION_AND_INFILTRATION_FACTORS,
  INHALATION_RATES_M3_PER_HOUR,
} from './exposure-factors';
import { INCENSE_AND_BURNING_FACTORS } from './emission-factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { evaluateIndoorFiltrationAction } from './indoor-filtration';
import { ActionImpactEvaluation } from './routine-types';

export function evaluateIndoorImpact(
  action: ActionDefinition,
  profile: HouseholdProfile,
  currentPm25: number | null,
  peakPm25: number | null,
  cleanestPm25: number | null
): ActionImpactEvaluation | null {
  const filtrationResult = evaluateIndoorFiltrationAction(action, profile, currentPm25);
  if (filtrationResult !== null) return filtrationResult;

  switch (action.id) {
    case 'use_exhaust_fan_cooking': {
      if (profile.cookingFuel === 'induction') {
        return {
          applicable: false,
          reasonIfNotApplicable: 'Induction cooking does not generate combustion emissions; exhaust action not needed',
          concentrationReduction: 0,
          doseAvoidedUg: 0,
          percentageDrop: 0,
          pm25SavedGrams: 0,
          co2SavedGrams: 0,
        };
      }
      if (!profile.hasKitchenChimneyOrExhaust) {
        return {
          applicable: false,
          reasonIfNotApplicable: 'Household does not have a kitchen chimney or exhaust fan installed',
          concentrationReduction: 0,
          doseAvoidedUg: 0,
          percentageDrop: 0,
          pm25SavedGrams: 0,
          co2SavedGrams: 0,
        };
      }
      const conc = FILTRATION_AND_INFILTRATION_FACTORS.COOKING_INDOOR_PM25_SPIKE_UG_M3 * FILTRATION_AND_INFILTRATION_FACTORS.KITCHEN_EXHAUST_CAPTURE_EFFICIENCY;
      const cookVolume = 1 * INHALATION_RATES_M3_PER_HOUR.ADULT_LIGHT_ACTIVITY * FILTRATION_AND_INFILTRATION_FACTORS.COOKING_DAILY_DURATION_HOURS;
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * cookVolume,
        percentageDrop: FILTRATION_AND_INFILTRATION_FACTORS.KITCHEN_EXHAUST_CAPTURE_EFFICIENCY * 100,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Captures 70% of frying and tadka aerosol spikes directly at the cooktop.',
      };
    }

    case 'ventilate_at_cleanest_afternoon_hour': {
      if (peakPm25 === null || cleanestPm25 === null) {
        return {
          applicable: true,
          concentrationReduction: null,
          doseAvoidedUg: null,
          percentageDrop: null,
          isUnknown: true,
          pm25SavedGrams: 0,
          co2SavedGrams: 0,
          methodologyNotes: 'Impact unknown: forecast PM2.5 measurements missing.',
        };
      }
      const deltaAmbient = Math.max(0, peakPm25 - cleanestPm25);
      const conc = deltaAmbient * EQUIVALENCY_FACTORS.AFTERNOON_VENTILATION_EXCHANGE_FACTOR;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', EQUIVALENCY_FACTORS.AFTERNOON_VENTILATION_WINDOW_HOURS);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol,
        percentageDrop: peakPm25 > 0 ? (deltaAmbient / peakPm25) * 40 : 0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Airs out CO2 and indoor VOCs during afternoon solar dispersion rather than high-inversion hours.',
      };
    }

    case 'eliminate_incense_and_mosquito_coils': {
      if (!profile.usesIncenseOrMosquitoCoils) {
        return {
          applicable: false,
          reasonIfNotApplicable: 'Household does not use incense sticks or mosquito coils',
          concentrationReduction: 0,
          doseAvoidedUg: 0,
          percentageDrop: 0,
          pm25SavedGrams: 0,
          co2SavedGrams: 0,
        };
      }
      const areaScale = Math.min(1.5, Math.max(0.5, 1000 / profile.homeAreaSqFt));
      const conc = INCENSE_AND_BURNING_FACTORS.INCENSE_ROOM_PM25_ELEVATION_UG_M3 * areaScale;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', INCENSE_AND_BURNING_FACTORS.INCENSE_DAILY_HOURS);
      const sticks = INCENSE_AND_BURNING_FACTORS.INCENSE_STICKS_PER_DAY;
      const pm25Saved = sticks * INCENSE_AND_BURNING_FACTORS.PM25_PER_INCENSE_STICK_OR_COIL_GRAMS;
      const co2Saved = sticks * INCENSE_AND_BURNING_FACTORS.CO2_PER_INCENSE_STICK_OR_COIL_GRAMS;
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol,
        percentageDrop: 100.0,
        pm25SavedGrams: pm25Saved,
        co2SavedGrams: co2Saved,
        methodologyNotes: `Avoids burning ${sticks} smoldering coils/sticks, saving ${(pm25Saved * 1000).toFixed(0)} mg PM2.5 and ${co2Saved.toFixed(1)} g CO2.`,
      };
    }

    case 'avoid_non_hepa_vacuuming': {
      const conc = FILTRATION_AND_INFILTRATION_FACTORS.NON_HEPA_VACUUM_RESUSPENSION_UG_M3;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', FILTRATION_AND_INFILTRATION_FACTORS.NON_HEPA_VACUUM_DURATION_HOURS);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol,
        percentageDrop: 100.0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Prevents micro-particulate blowback from porous non-HEPA vacuum exhaust filters.',
      };
    }

    case 'cook_with_kitchen_cross_ventilation': {
      if (profile.cookingFuel !== 'biomass') {
        return { applicable: false, reasonIfNotApplicable: 'Household does not cook using wood or biomass chulha', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
      }
      const conc = 120.0;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', 2);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol * 0.45,
        percentageDrop: 45.0,
        pm25SavedGrams: 0,
        co2SavedGrams: 0,
        methodologyNotes: 'Flushes 45% of chulha cooking smoke directly outdoors by isolating and cross-ventilating the kitchen.',
      };
    }

    case 'use_dry_seasoned_chulha_fuel': {
      if (profile.cookingFuel !== 'biomass') {
        return { applicable: false, reasonIfNotApplicable: 'Household does not cook using wood or biomass chulha', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
      }
      const conc = 70.0;
      const vol = calculateInhaledAirVolumeM3(profile, 'light', 2);
      return {
        applicable: true,
        concentrationReduction: conc,
        doseAvoidedUg: conc * vol * 0.3,
        percentageDrop: 30.0,
        pm25SavedGrams: 12.5,
        co2SavedGrams: 0,
        methodologyNotes: 'Using dry, seasoned firewood reduces particulate emissions by 25-30% compared to wet wood.',
      };
    }

    default:
      return null;
  }
}

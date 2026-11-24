import { ActionDefinition } from './catalogue';
import { BIOMASS_AND_OPEN_BURNING_FACTORS } from './factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { ActionImpactEvaluation } from './routine-impact';

export function evaluateCombustionSwapsImpact(
  action: ActionDefinition,
  profile: HouseholdProfile
): ActionImpactEvaluation | null {
  let applicable = true;
  let reasonIfNotApplicable: string | undefined;
  let concentrationReduction = 0;
  let doseAvoidedUg = 0;
  let percentageDrop = 0;
  let pm25SavedGrams = 0;
  let co2SavedGrams = 0;
  let methodologyNotes: string | undefined;

  switch (action.id) {
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

    default:
      return null;
  }

  return {
    applicable,
    reasonIfNotApplicable,
    concentrationReduction,
    doseAvoidedUg,
    percentageDrop,
    pm25SavedGrams,
    co2SavedGrams,
    methodologyNotes,
  };
}

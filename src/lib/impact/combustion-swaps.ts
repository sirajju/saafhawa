import { ActionDefinition } from './catalogue';
import { BIOMASS_AND_OPEN_BURNING_FACTORS, INDIAN_POWER_GRID_FACTORS } from './emission-factors';
import { HouseholdProfile } from './types';
import { calculateInhaledAirVolumeM3 } from './air-volume';
import { ActionImpactEvaluation } from './routine-types';

export function evaluateCombustionSwapsImpact(
  action: ActionDefinition,
  profile: HouseholdProfile
): ActionImpactEvaluation | null {
  if (action.id === 'stop_open_waste_burning') {
    if (!profile.hasGardenOrOpenWasteBurning) {
      return { applicable: false, reasonIfNotApplicable: 'Household does not burn garden waste or leaves', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    const weightKg = BIOMASS_AND_OPEN_BURNING_FACTORS.TYPICAL_GARDEN_WASTE_PILE_KG;
    const pm25Saved = weightKg * BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BIOMASS_BURNING_PM25_G_PER_KG;
    const co2Saved = weightKg * BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BIOMASS_BURNING_CO2_G_PER_KG;
    const conc = BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BURNING_LOCAL_PM25_SPIKE_UG_M3;
    const vol = calculateInhaledAirVolumeM3(profile, 'light', BIOMASS_AND_OPEN_BURNING_FACTORS.OPEN_BURNING_LOCAL_DURATION_HOURS);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: 100.0,
      pm25SavedGrams: pm25Saved,
      co2SavedGrams: co2Saved,
      methodologyNotes: `Prevents open burning of ${weightKg} kg garden waste, avoiding ${(pm25Saved).toFixed(0)} g PM2.5 and ${(co2Saved / 1000).toFixed(1)} kg CO2.`,
    };
  }

  if (action.id === 'swap_biomass_cookstove_to_induction') {
    if (profile.cookingFuel !== 'biomass') {
      return { applicable: false, reasonIfNotApplicable: 'Household already uses clean cooking fuel (LPG / Induction / Piped Gas)', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (profile.budget === 'zero_cost') {
      return { applicable: false, reasonIfNotApplicable: 'Zero-budget preference; prioritizing free kitchen exhaust and ventilation over induction cooktop purchase', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    const directCo2 = BIOMASS_AND_OPEN_BURNING_FACTORS.TRADITIONAL_CHULHA_DAILY_CO2_EMISSIONS_GRAMS;
    const gridCo2 = INDIAN_POWER_GRID_FACTORS.INDUCTION_COOKING_DAILY_KWH * INDIAN_POWER_GRID_FACTORS.GRID_CO2_G_PER_KWH;
    const netCo2Saved = Math.max(0, directCo2 - gridCo2);
    const pm25Saved = BIOMASS_AND_OPEN_BURNING_FACTORS.TRADITIONAL_CHULHA_DAILY_PM25_EMISSIONS_GRAMS;
    const conc = BIOMASS_AND_OPEN_BURNING_FACTORS.CHULHA_COOKING_INDOOR_PM25_SPIKE_UG_M3;
    const vol = calculateInhaledAirVolumeM3(profile, 'light', BIOMASS_AND_OPEN_BURNING_FACTORS.CHULHA_COOKING_DAILY_DURATION_HOURS);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: 100.0,
      pm25SavedGrams: pm25Saved,
      co2SavedGrams: Number(netCo2Saved.toFixed(1)),
      methodologyNotes: `Replaces chulha smoke (${pm25Saved}g PM2.5). Net CO2 accounts for ${(gridCo2 / 1000).toFixed(2)} kg electric grid emissions.`,
    };
  }

  if (action.id === 'swap_biomass_or_kerosene_heating_to_electric') {
    if (profile.heatingFuel !== 'biomass' && profile.heatingFuel !== 'kerosene') {
      return { applicable: false, reasonIfNotApplicable: 'Household does not use solid fuel or kerosene space heating', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    if (profile.budget === 'zero_cost') {
      return { applicable: false, reasonIfNotApplicable: 'Zero-budget preference; prioritizing free window sealing and warm clothing over electric radiator purchase', concentrationReduction: 0, doseAvoidedUg: 0, percentageDrop: 0, pm25SavedGrams: 0, co2SavedGrams: 0 };
    }
    const directCo2 = BIOMASS_AND_OPEN_BURNING_FACTORS.UNVENTED_SPACE_HEATING_DAILY_CO2_GRAMS;
    const gridCo2 = INDIAN_POWER_GRID_FACTORS.ELECTRIC_SPACE_HEATING_DAILY_KWH * INDIAN_POWER_GRID_FACTORS.GRID_CO2_G_PER_KWH;
    const netCo2Saved = Math.max(0, directCo2 - gridCo2);
    const pm25Saved = BIOMASS_AND_OPEN_BURNING_FACTORS.UNVENTED_SPACE_HEATING_DAILY_PM25_GRAMS;
    const conc = BIOMASS_AND_OPEN_BURNING_FACTORS.UNVENTED_SPACE_HEATING_INDOOR_PM25_SPIKE_UG_M3;
    const vol = calculateInhaledAirVolumeM3(profile, 'resting', BIOMASS_AND_OPEN_BURNING_FACTORS.SPACE_HEATING_DAILY_DURATION_HOURS);
    return {
      applicable: true,
      concentrationReduction: conc,
      doseAvoidedUg: conc * vol,
      percentageDrop: 100.0,
      pm25SavedGrams: pm25Saved,
      co2SavedGrams: Number(netCo2Saved.toFixed(1)),
      methodologyNotes: `Replaces unvented winter heating (${pm25Saved}g PM2.5). Net CO2 accounts for ${(gridCo2 / 1000).toFixed(2)} kg electric grid emissions.`,
    };
  }

  return null;
}

import { ExposureReduction, EmissionReduction } from './types';
import { EQUIVALENCY_FACTORS, VEHICULAR_EMISSION_FACTORS } from './factors';

export { getCategoryBadgeDetails, getAqiCategoryDetails } from './category-details';

/**
 * Returns plain-language, relatable comparisons for scientific exposure and emission numbers.
 */
export function getExposureComparisonText(
  exposure: ExposureReduction,
  actionId: string
): string {
  if (exposure.isUnknown || exposure.pm25InhaledDoseAvoidedUg === null) {
    return 'Impact unknown — local PM2.5 measurements are currently unavailable for this area.';
  }

  const dose = exposure.pm25InhaledDoseAvoidedUg;
  const conc = exposure.pm25ConcentrationReductionUgM3;

  if (dose === 0) {
    return 'Zero particulate exposure avoided under clean ambient baseline air.';
  }

  if (actionId === 'wear_n95_mask_outside') {
    return `Filters ~85% of fine toxic particles whenever you step outside (${dose} µg inhaled dose avoided).`;
  }

  if (actionId === 'run_hepa_air_purifier_bedroom' || actionId === 'diy_corsi_rosenthal_box') {
    return `Keeps indoor air ~${Math.round(exposure.percentageDrop || 0)}% cleaner through the night (${dose} µg inhaled dose avoided).`;
  }

  if (actionId === 'eliminate_incense_and_mosquito_coils') {
    return `Eliminates an indoor smoke source (${conc} µg/m³ peak drop), saving ${dose} µg inhaled dose.`;
  }

  if (actionId === 'keep_children_indoors_morning_smog') {
    return `Shields developing lungs from peak morning temperature inversion spikes (${dose} µg inhaled dose avoided).`;
  }

  if (actionId === 'use_exhaust_fan_cooking') {
    return `Vents ~70% of frying and tadka smoke directly outside before it settles into living areas (${dose} µg avoided).`;
  }

  const cigDose = EQUIVALENCY_FACTORS.CIGARETTE_INHALED_PM25_DOSE_UG;
  if (dose >= cigDose * 2) {
    const cigs = Math.round(dose / cigDose);
    return `Avoids ${dose} µg of inhaled PM2.5 — equivalent to avoiding the smoke of ~${cigs} cigarettes.`;
  } else if (dose >= cigDose) {
    return `Significantly reduces daily particulate inhalation by ${dose} µg across your household.`;
  } else if (dose > 0) {
    return `Lowers personal particulate exposure by ${dose} µg during smog peaks.`;
  }

  return 'Reduces exposure during hazardous winter smog periods.';
}

export function getEmissionComparisonText(
  emission: EmissionReduction,
  actionId: string
): string {
  const pm25 = emission.pm25SavedGrams;
  const co2 = emission.co2SavedGrams;
  const carCo2KmFactor = VEHICULAR_EMISSION_FACTORS.PETROL_CAR_CO2_G_PER_KM;

  if (actionId === 'swap_car_for_metro' || actionId === 'work_from_home_on_smog_days') {
    const kmEquiv = Math.round(co2 / carCo2KmFactor);
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(2)} g PM₂.₅ — like taking a car off city roads for ~${kmEquiv} km.`;
  }

  if (actionId === 'swap_two_wheeler_for_metro_or_bus') {
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and eliminates direct street-level tailpipe exhaust.`;
  }

  if (actionId === 'stop_open_waste_burning') {
    return `Saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(1)} g PM₂.₅ — stops choking neighborhood smoke plumes.`;
  }

  if (actionId === 'swap_biomass_cookstove_to_induction') {
    return `Saves ${(co2 / 1000).toFixed(1)} kg net CO₂ and ${pm25.toFixed(1)} g PM₂.₅ daily — smoke-free cooking.`;
  }

  if (actionId === 'carpool_to_work') {
    return `Halves vehicle trip emissions: saves ${(co2 / 1000).toFixed(1)} kg CO₂ and ${pm25.toFixed(2)} g PM₂.₅.`;
  }

  if (co2 > 0 || pm25 > 0) {
    const co2Part = co2 >= 1000 ? `${(co2 / 1000).toFixed(1)} kg CO₂` : `${co2.toFixed(0)} g CO₂`;
    const pmPart = pm25 >= 1 ? `${pm25.toFixed(1)} g PM₂.₅` : `${(pm25 * 1000).toFixed(0)} mg PM₂.₅`;
    return `Prevents ${pmPart} and ${co2Part} from entering the atmosphere today.`;
  }

  return 'A personal protection action that directly shields health during severe air quality alerts.';
}

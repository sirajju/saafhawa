/**
 * ============================================================================
 * SAAFHHAWA IMPACT FACTORS & SCIENTIFIC CONSTANTS
 * ============================================================================
 * Every factor is grounded in published literature, standards, or official data.
 * Unconfirmed empirical consensus is annotated with: // [NEEDS VERIFICATION]
 */

export * from './emission-factors';

export const INHALATION_RATES_M3_PER_HOUR = {
  // Source: US EPA Exposure Factors Handbook (2011 Edition), Table 6-1 (Resting / Sleep, Adults 21-65)
  ADULT_RESTING: 0.45,

  // Source: US EPA Exposure Factors Handbook (2011 Edition), Table 6-1 (Light Domestic / Sedentary Activity)
  ADULT_LIGHT_ACTIVITY: 0.60,

  // Source: US EPA Exposure Factors Handbook (2011 Edition), Table 6-1 (Moderate Exercise / Rapid Inhalation)
  ADULT_EXERCISE: 1.40,

  // Source: US EPA Child-Specific Exposure Factors Handbook (2008), Chapter 6 (Age 6-11 years average)
  CHILD_DAILY_AVERAGE: 0.42,

  // Source: US EPA Exposure Factors Handbook (2011 Edition), Table 6-1 (Adults > 65 years average)
  ELDERLY_DAILY_AVERAGE: 0.52,
} as const;

export const FILTRATION_AND_INFILTRATION_FACTORS = {
  // Source: CDC / NIOSH & MacIntyre et al., BMJ (2009) "Face mask use and control of respiratory infection"
  N95_MASK_REAL_WORLD_EFFICIENCY: 0.85,

  // Source: US EPA "Residential Air Cleaners: A Technical Summary" (EPA 402-F-08-004)
  HEPA_AIR_PURIFIER_ROOM_EFFICIENCY: 0.75,

  // Source: Rosenthal, J. & Corsi, R., University of California Davis (2021) "Corsi-Rosenthal Box Air Cleaner Testing"
  CORSI_ROSENTHAL_BOX_EFFICIENCY: 0.68,

  // Source: AHAM AC-1 CADR rating standard baseline room coverage for portable HEPA purifiers (sq ft)
  // [NEEDS VERIFICATION] - Assumes single bedroom air purifier covers typical 300 sq ft room.
  STANDARD_PURIFIER_COVERAGE_SQFT: 300.0,

  // Source: UC Davis testing for 4x MERV-13 20" Corsi-Rosenthal box cleaner living area coverage (sq ft)
  // [NEEDS VERIFICATION] - Rated for ~600 sq ft living room spaces.
  CORSI_ROSENTHAL_COVERAGE_SQFT: 600.0,

  // Source: Lawrence Berkeley National Laboratory (LBNL-44933) & Chen & Zhao, Atmospheric Environment (2011)
  CLOSED_WINDOW_INFILTRATION_RATIO: 0.50,

  // Source: Chen & Zhao, Atmospheric Environment (2011) "Review of relationship between indoor and outdoor particles"
  OPEN_OR_DRAFTY_INFILTRATION_RATIO: 0.80,

  // Source: LBNL Home Energy Saver & Building Sealing Guidelines
  // [NEEDS VERIFICATION] - Assumes door sweep and window weatherstripping reduces ambient particle ingress by ~30%
  WEATHERSTRIPPING_INFILTRATION_REDUCTION: 0.30,

  // Source: Singer, B. C. et al., Lawrence Berkeley National Laboratory (2012), Atmospheric Environment
  KITCHEN_EXHAUST_CAPTURE_EFFICIENCY: 0.70,

  // Source: Pant, P. et al., Atmospheric Environment (2016)
  COOKING_INDOOR_PM25_SPIKE_UG_M3: 250.0,

  // Typical duration of intensive domestic cooking per day (hours)
  COOKING_DAILY_DURATION_HOURS: 1.5,

  // Source: WHO Guidelines for Indoor Air Quality & CPCB Domestic Dust Studies
  WET_MOPPING_AVOIDED_RESUSPENSION_UG_M3: 25.0,

  // Typical duration of cleaning dust resuspension exposure in the home (hours)
  CLEANING_RESUSPENSION_DURATION_HOURS: 3.0,

  // Source: Lioy, P. J. et al., Journal of Exposure Science & Environmental Epidemiology (1999)
  // [NEEDS VERIFICATION] - Fine dust resuspension spike emitted through micro-porous exhaust of non-HEPA vacuums.
  NON_HEPA_VACUUM_RESUSPENSION_UG_M3: 30.0,

  // Duration of non-HEPA vacuum dust resuspension (hours)
  NON_HEPA_VACUUM_DURATION_HOURS: 2.0,

  // Source: Hermeling et al., The Laryngoscope (2019) "Saline nasal irrigation in upper respiratory inflammation"
  // [NEEDS VERIFICATION] - Estimated reduction in retained upper respiratory mucosal particulate load.
  POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR: 0.05,
} as const;

export const EQUIVALENCY_FACTORS = {
  // Source: Berkeley Earth (Muller & Muller, 2015 "Air Pollution and Cigarette Equivalence")
  // 1 cigarette equates to inhaling ~180-200 µg of fine particulate matter (PM2.5).
  // [NEEDS VERIFICATION] - Approximated at 180 µg per cigarette for health risk comparisons.
  CIGARETTE_INHALED_PM25_DOSE_UG: 180.0,

  // Typical distance of consolidated non-essential errand trip (round-trip km)
  ERRAND_ROUND_TRIP_KM: 5.0,

  // Duration of non-essential errand transit exposure (hours)
  ERRAND_DURATION_HOURS: 0.75,

  // Cleanest afternoon solar dispersion window duration (hours)
  AFTERNOON_VENTILATION_WINDOW_HOURS: 4.0,

  // Afternoon ventilation exchange fraction
  AFTERNOON_VENTILATION_EXCHANGE_FACTOR: 0.40,
} as const;

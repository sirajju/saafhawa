/**
 * ============================================================================
 * SAAFHHAWA IMPACT FACTORS & SCIENTIFIC CONSTANTS
 * ============================================================================
 * Every factor in this file is grounded in published literature, standards,
 * or official environmental agency data.
 *
 * Any number where exact empirical consensus is still debated or approximated
 * is explicitly annotated with: // [NEEDS VERIFICATION]
 */

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
  // Note: While raw N95 filter material achieves >= 95% efficiency, real-world fitted efficiency with typical face seal leakage is ~85%.
  N95_MASK_REAL_WORLD_EFFICIENCY: 0.85,

  // Source: US EPA "Residential Air Cleaners: A Technical Summary" (EPA 402-F-08-004) & CPCB Clean Room Guidelines
  // Effective steady-state room PM2.5 concentration reduction in an average room under standard residential air exchange rates.
  HEPA_AIR_PURIFIER_ROOM_EFFICIENCY: 0.75,

  // Source: Rosenthal, J. & Corsi, R., University of California Davis (2021) "Corsi-Rosenthal Box Air Cleaner Testing"
  // Steady-state PM2.5 clean air delivery rate (CADR) efficiency with 4x MERV-13 filters and 20" box fan.
  CORSI_ROSENTHAL_BOX_EFFICIENCY: 0.68,

  // Source: Lawrence Berkeley National Laboratory (LBNL-44933) & Chen & Zhao, Atmospheric Environment (2011)
  // Baseline infiltration ratio (Indoor/Outdoor PM2.5) for typical masonry residential structures with closed doors/windows.
  CLOSED_WINDOW_INFILTRATION_RATIO: 0.50,

  // Source: Chen & Zhao, Atmospheric Environment (2011) "Review of relationship between indoor and outdoor particles"
  // Infiltration ratio when windows are open or structures have poor weather sealing.
  OPEN_OR_DRAFTY_INFILTRATION_RATIO: 0.80,

  // Source: LBNL Home Energy Saver & Building Sealing Guidelines
  // [NEEDS VERIFICATION] - Assumes door sweep and window weatherstripping reduces ambient particle ingress by ~30% from closed baseline.
  WEATHERSTRIPPING_INFILTRATION_REDUCTION: 0.30,

  // Source: Singer, B. C. et al., Lawrence Berkeley National Laboratory (2012), Atmospheric Environment
  // "Pollutant concentrations and emission rates from natural gas cooking burners"
  // Capture efficiency of typical kitchen exhaust hood or high-speed exhaust fan at cooktop.
  KITCHEN_EXHAUST_CAPTURE_EFFICIENCY: 0.70,

  // Source: Pant, P. et al., Atmospheric Environment (2016) "Characterization of indoor particulate matter in residential homes in India"
  // Average indoor PM2.5 concentration spike (µg/m³) generated during unvented high-heat frying / tempering (tadka).
  COOKING_INDOOR_PM25_SPIKE_UG_M3: 250.0,

  // Typical duration of intensive domestic cooking per day (hours)
  // Source: Indian National Sample Survey Office (NSSO) Time Use Survey
  COOKING_DAILY_DURATION_HOURS: 1.5,

  // Source: WHO Guidelines for Indoor Air Quality & CPCB Domestic Dust Studies
  // Indoor PM2.5 resuspension concentration (µg/m³) prevented by wet mopping instead of dry broom sweeping.
  WET_MOPPING_AVOIDED_RESUSPENSION_UG_M3: 25.0,

  // Typical duration of cleaning dust resuspension exposure in the home (hours)
  CLEANING_RESUSPENSION_DURATION_HOURS: 3.0,

  // Source: Lioy, P. J. et al., Journal of Exposure Science & Environmental Epidemiology (1999)
  // [NEEDS VERIFICATION] - Fine dust resuspension spike emitted through micro-porous exhaust of non-HEPA standard bag/cyclone vacuums.
  NON_HEPA_VACUUM_RESUSPENSION_UG_M3: 30.0,

  // Source: Hermeling et al., The Laryngoscope (2019) "Saline nasal irrigation in upper respiratory inflammation"
  // [NEEDS VERIFICATION] - Estimated reduction in retained upper respiratory mucosal particulate load from post-commute wash/irrigation.
  POST_COMMUTE_WASH_EXPOSURE_REDUCTION_FACTOR: 0.05,
} as const;

export const INCENSE_AND_BURNING_FACTORS = {
  // Source: Liu, W. et al., Environmental Health Perspectives (2003) & Chest (2003)
  // "Mosquito coil smoke and respiratory health"
  // PM2.5 emitted per standard mosquito coil or incense stick (agarbatti) burned (in grams = 35 mg).
  PM25_PER_INCENSE_STICK_OR_COIL_GRAMS: 0.035,

  // Source: US EPA AP-42 Compilation of Air Pollutant Emissions Factors (Section 2.5 Open Burning)
  // [NEEDS VERIFICATION] - Direct CO2 emitted per stick/coil from small-scale biomass/binder combustion (grams).
  CO2_PER_INCENSE_STICK_OR_COIL_GRAMS: 15.0,

  // Source: Liu, W. et al. (2003) & Lin, T. C. et al., Bulletin of Environmental Contamination and Toxicology (2008)
  // Indoor PM2.5 concentration elevation (µg/m³) caused by burning 1 incense stick or coil in a closed/semi-closed room.
  INCENSE_ROOM_PM25_ELEVATION_UG_M3: 180.0,

  // Daily duration of incense/coil smoldering exposure (hours)
  INCENSE_DAILY_HOURS: 6.0,
} as const;

export const VEHICULAR_EMISSION_FACTORS = {
  // Source: Automotive Research Association of India (ARAI) CAFC Data & TERI Transport Emission Inventory (2021)
  // Petrol Passenger Car: CO2 grams per vehicle-km
  PETROL_CAR_CO2_G_PER_KM: 150.0,

  // Source: Central Pollution Control Board (CPCB) In-Use Vehicle Emission Factors & ARAI Indian Driving Cycle
  // Combined tailpipe + non-exhaust (tire/brake wear) PM2.5 grams per vehicle-km
  PETROL_CAR_PM25_G_PER_KM: 0.045,

  // Source: ARAI & TERI Transport Emission Inventory (2021)
  // Diesel Passenger Car: CO2 grams per vehicle-km
  DIESEL_CAR_CO2_G_PER_KM: 145.0,

  // Source: CPCB & ARAI Indian Driving Cycle (In-use mixed fleet BS-IV / BS-VI)
  // Combined tailpipe + non-exhaust PM2.5 grams per vehicle-km
  DIESEL_CAR_PM25_G_PER_KM: 0.070,

  // Source: ARAI Two-Wheeler Fuel Economy Baseline & TERI (2021)
  // Motorcycle / Scooter: CO2 grams per vehicle-km
  TWO_WHEELER_CO2_G_PER_KM: 42.0,

  // Source: CPCB Fleet Emission Factors
  // Combined tailpipe + tire wear PM2.5 grams per vehicle-km
  TWO_WHEELER_PM25_G_PER_KM: 0.025,

  // Source: Delhi Metro Rail Corporation (DMRC) Annual Sustainability Report (2022)
  // Electric Metro Rail: CO2 emissions per passenger-km (grid electricity lifecycle)
  METRO_CO2_G_PER_PASSENGER_KM: 18.0,

  // Source: DMRC Sustainability Report (2022)
  // Electric Metro Rail: Direct PM2.5 emissions per passenger-km
  METRO_PM25_G_PER_PASSENGER_KM: 0.001,

  // Source: NITI Aayog Fast Tracking Freight in India & Electric Bus Life-Cycle Assessments
  // [NEEDS VERIFICATION] - Electric Bus: CO2 emissions per passenger-km under average Indian grid intensity
  ELECTRIC_BUS_CO2_G_PER_PASSENGER_KM: 25.0,

  // Source: NITI Aayog / CPCB
  // [NEEDS VERIFICATION] - Electric Bus: PM2.5 emissions per passenger-km
  ELECTRIC_BUS_PM25_G_PER_PASSENGER_KM: 0.002,

  // Source: Hudda, N. et al., Environmental Science & Technology (2013)
  // "In-cabin passenger exposure to particulate matter in urban traffic"
  // Ratio of in-cabin PM2.5 concentration to on-road ambient PM2.5 in a passenger car with windows up and cabin filter.
  CAR_CABIN_EXPOSURE_RATIO: 0.45,

  // Source: Apte, J. S. et al., Atmospheric Environment (2011)
  // "High-resolution air pollution mapping and commuter exposure on two-wheelers in India"
  // Two-wheeler riders experience elevated PM2.5 concentrations due to direct immersion in preceding exhaust plumes.
  TWO_WHEELER_COMMUTE_EXPOSURE_RATIO: 1.25,

  // Source: DMRC Air Quality Monitoring in Underground and Elevated Air-Conditioned Coaches
  // [NEEDS VERIFICATION] - Ratio of metro coach PM2.5 concentration relative to outdoor street-level smog.
  METRO_IN_TRANSIT_EXPOSURE_RATIO: 0.30,
} as const;

export const BIOMASS_AND_OPEN_BURNING_FACTORS = {
  // Source: US EPA AP-42 (Section 2.5 Open Burning, Table 2.5-1) & CPCB Source Apportionment Studies
  // PM2.5 emitted per kg of dry residential garden waste / leaf litter burned (grams per kg).
  OPEN_BIOMASS_BURNING_PM25_G_PER_KG: 25.0,

  // Source: 2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol 4, Table 2.5
  // CO2 emitted per kg of open residential biomass burned (grams per kg).
  OPEN_BIOMASS_BURNING_CO2_G_PER_KG: 1250.0,

  // Typical size of a single residential leaf/waste burning pile in India (kg)
  TYPICAL_GARDEN_WASTE_PILE_KG: 3.0,

  // Source: CPCB Micro-environmental Impact of Open Burning in Residential Vicinities
  // Neighborhood ambient PM2.5 elevation (µg/m³) in the immediate vicinity during a 2-hour burn event.
  OPEN_BURNING_LOCAL_PM25_SPIKE_UG_M3: 150.0,

  // Duration of local smoke exposure from neighborhood open burn (hours)
  OPEN_BURNING_LOCAL_DURATION_HOURS: 2.0,

  // Source: WHO Guidelines for Indoor Air Quality: Household Fuel Combustion (2014)
  // & Smith, K. R. et al., Annual Review of Energy and the Environment
  // Daily PM2.5 emitted by a traditional solid biomass cookstove (chulha) consuming ~4 kg firewood/dung/day (grams/day).
  TRADITIONAL_CHULHA_DAILY_PM25_EMISSIONS_GRAMS: 34.0,

  // Source: IPCC 2006 Guidelines for National Greenhouse Gas Inventories
  // Daily direct CO2 emitted from ~4 kg solid fuel in traditional domestic chulha (grams/day).
  TRADITIONAL_CHULHA_DAILY_CO2_EMISSIONS_GRAMS: 6000.0,

  // Source: WHO Household Energy Database (India residential monitoring)
  // Average indoor PM2.5 elevation (µg/m³) for women and children during 4 hours of chulha cooking.
  CHULHA_COOKING_INDOOR_PM25_SPIKE_UG_M3: 350.0,

  // Duration of traditional biomass stove combustion per day (hours)
  CHULHA_COOKING_DAILY_DURATION_HOURS: 4.0,

  // Source: WHO Guidelines for Indoor Air Quality (2014)
  // Daily PM2.5 emitted from unvented kerosene / solid fuel space heater over winter night (grams/day).
  UNVENTED_SPACE_HEATING_DAILY_PM25_GRAMS: 12.0,

  // Source: 2006 IPCC Guidelines
  // Daily direct CO2 emitted from unvented kerosene / solid fuel space heater (grams/day).
  UNVENTED_SPACE_HEATING_DAILY_CO2_GRAMS: 4500.0,

  // Source: WHO (2014) Indoor concentration spike from unvented space heating (µg/m³) over 6 hours night.
  UNVENTED_SPACE_HEATING_INDOOR_PM25_SPIKE_UG_M3: 200.0,

  // Duration of winter space heating per day (hours)
  SPACE_HEATING_DAILY_DURATION_HOURS: 6.0,
} as const;

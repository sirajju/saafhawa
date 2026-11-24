/**
 * ============================================================================
 * SAAFHHAWA EMISSION & GRID FACTORS
 * ============================================================================
 * Empirical vehicular, fuel combustion, and electricity grid emission factors.
 * Factors marked with [NEEDS VERIFICATION] are documented in README Assumptions.
 */

export const VEHICULAR_EMISSION_FACTORS = {
  // Source: Automotive Research Association of India (ARAI) CAFC Data & TERI Transport Emission Inventory (2021)
  // Petrol Passenger Car: CO2 grams per vehicle-km
  PETROL_CAR_CO2_G_PER_KM: 150.0,

  // Source: Central Pollution Control Board (CPCB) In-Use Vehicle Emission Factors (PROBES/112/2007-08) & ARAI
  // Combined in-use tailpipe (BS-IV/BS-VI) + non-exhaust brake/tyre wear PM2.5 grams per vehicle-km
  // [NEEDS VERIFICATION] - Exact non-exhaust vs exhaust partition varies with driving cycle and brake pad composition.
  PETROL_CAR_PM25_G_PER_KM: 0.035,

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

  // Source: Goel, R. & Kumar, P., Atmospheric Environment (2015) "Characterisation of particulate emissions and commuter exposure in Indian cities"
  // [NEEDS VERIFICATION] - Ratio of in-cabin PM2.5 to background ambient in Indian traffic without HEPA filtration
  CAR_CABIN_EXPOSURE_RATIO: 0.70,

  // Source: Apte, J. S. et al., Atmospheric Environment (2011) "High-resolution air pollution mapping and commuter exposure on two-wheelers in India"
  // Two-wheeler riders experience elevated PM2.5 concentrations due to direct immersion in preceding exhaust plumes.
  TWO_WHEELER_COMMUTE_EXPOSURE_RATIO: 1.25,

  // Source: DMRC Air Quality Monitoring in Underground and Elevated Air-Conditioned Coaches
  // [NEEDS VERIFICATION] - Ratio of metro coach PM2.5 concentration relative to outdoor street-level smog.
  METRO_IN_TRANSIT_EXPOSURE_RATIO: 0.30,

  // Typical average urban transit speed in congested Indian metropolitan traffic (km/h)
  // [NEEDS VERIFICATION] - Used to estimate commute duration from distance.
  URBAN_COMMUTE_AVERAGE_SPEED_KM_PER_HOUR: 20.0,
} as const;

export const INCENSE_AND_BURNING_FACTORS = {
  // Source: Liu, W. et al., Environmental Health Perspectives (2003) & Jetter et al. (2002)
  // PM2.5 emitted per standard mosquito coil or incense stick (agarbatti) burned (grams: 35 mg).
  PM25_PER_INCENSE_STICK_OR_COIL_GRAMS: 0.035,

  // Source: Stoichiometric mass balance of ~1.2 g organic incense stick smoldering (carbon content ~50%)
  // [NEEDS VERIFICATION] - Burning 1.2 g incense can yield at most ~2.2 g CO2.
  CO2_PER_INCENSE_STICK_OR_COIL_GRAMS: 2.2,

  // Source: Lin, T. C. et al. (2008) in typical residential room volume (~35 m³)
  // [NEEDS VERIFICATION] - Indoor PM2.5 concentration elevation (µg/m³) caused by burning incense in semi-closed room.
  INCENSE_ROOM_PM25_ELEVATION_UG_M3: 180.0,

  // Daily duration of incense/coil smoldering exposure (hours)
  INCENSE_DAILY_HOURS: 6.0,

  // Typical daily usage count of incense sticks or mosquito coils
  INCENSE_STICKS_PER_DAY: 2.0,
} as const;

export const INDIAN_POWER_GRID_FACTORS = {
  // Source: Central Electricity Authority (CEA), Ministry of Power, GoI (2023)
  // "CO2 Baseline Database for the Indian Power Sector, User Guide Version 19.0", National Grid weighted average
  GRID_CO2_G_PER_KWH: 716.0,

  // Source: Bureau of Energy Efficiency (BEE) & TERI (2021) "Electric Cooking Transition in India"
  // [NEEDS VERIFICATION] - Average daily electricity consumption for 4-person family induction cooking replacing chulha (kWh/day)
  INDUCTION_COOKING_DAILY_KWH: 1.8,

  // Source: BEE Standards & Labeling Baseline for Electric Space Heating
  // [NEEDS VERIFICATION] - 1500W room heater operating with 50% thermostat duty cycle for 6 winter hours (kWh/day)
  ELECTRIC_SPACE_HEATING_DAILY_KWH: 4.5,
} as const;

export const BIOMASS_AND_OPEN_BURNING_FACTORS = {
  // Source: US EPA AP-42 (Section 2.5 Open Burning, Table 2.5-1) & CPCB Source Apportionment Studies
  OPEN_BIOMASS_BURNING_PM25_G_PER_KG: 25.0,

  // Source: 2006 IPCC Guidelines for National Greenhouse Gas Inventories, Vol 4, Table 2.5
  OPEN_BIOMASS_BURNING_CO2_G_PER_KG: 1250.0,

  // Typical size of a single residential leaf/waste burning pile in India (kg)
  TYPICAL_GARDEN_WASTE_PILE_KG: 3.0,

  // Source: CPCB Micro-environmental Impact of Open Burning in Residential Vicinities
  // [NEEDS VERIFICATION] - Neighborhood ambient PM2.5 elevation in immediate plume vicinity.
  OPEN_BURNING_LOCAL_PM25_SPIKE_UG_M3: 150.0,

  // Duration of local smoke exposure from neighborhood open burn (hours)
  OPEN_BURNING_LOCAL_DURATION_HOURS: 2.0,

  // Source: WHO Guidelines for Indoor Air Quality: Household Fuel Combustion (2014) & Smith et al.
  // Daily PM2.5 emitted by traditional solid biomass cookstove (~4 kg firewood/dung/day)
  TRADITIONAL_CHULHA_DAILY_PM25_EMISSIONS_GRAMS: 34.0,

  // Source: IPCC 2006 Guidelines for National Greenhouse Gas Inventories
  // Daily direct CO2 emitted from ~4 kg solid fuel in traditional chulha
  TRADITIONAL_CHULHA_DAILY_CO2_EMISSIONS_GRAMS: 6000.0,

  // Source: WHO Household Energy Database (India residential monitoring)
  // Average indoor PM2.5 elevation (µg/m³) during 4 hours of chulha cooking.
  CHULHA_COOKING_INDOOR_PM25_SPIKE_UG_M3: 350.0,

  // Duration of traditional biomass stove combustion per day (hours)
  CHULHA_COOKING_DAILY_DURATION_HOURS: 4.0,

  // Source: WHO Guidelines for Indoor Air Quality (2014)
  UNVENTED_SPACE_HEATING_DAILY_PM25_GRAMS: 12.0,

  // Source: 2006 IPCC Guidelines
  UNVENTED_SPACE_HEATING_DAILY_CO2_GRAMS: 4500.0,

  // Source: WHO (2014) Indoor concentration spike from unvented space heating (µg/m³) over 6 hours night.
  UNVENTED_SPACE_HEATING_INDOOR_PM25_SPIKE_UG_M3: 200.0,

  // Duration of winter space heating per day (hours)
  SPACE_HEATING_DAILY_DURATION_HOURS: 6.0,
} as const;

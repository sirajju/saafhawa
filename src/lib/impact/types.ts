import { z } from 'zod';

export type ActionCategory = 'daily_routine' | 'indoor_air' | 'sustainable_swaps';

export type CommuteMode =
  | 'petrol_car'
  | 'diesel_car'
  | 'two_wheeler'
  | 'public_transit'
  | 'walking_cycling'
  | 'none';

export type CookingFuel = 'biomass' | 'lpg' | 'induction' | 'piped_gas';
export type HeatingFuel = 'biomass' | 'kerosene' | 'electric' | 'none';
export type WindowSealingQuality = 'poor' | 'average' | 'good';

// ============================================================================
// Household Profile Schema & Types
// ============================================================================

export const HouseholdProfileSchema = z.object({
  // Household demographics
  adultsCount: z.number().int().min(1).default(2),
  childrenCount: z.number().int().min(0).default(0),
  elderlyCount: z.number().int().min(0).default(0),

  // Daily commute habits
  primaryCommuteMode: z
    .enum(['petrol_car', 'diesel_car', 'two_wheeler', 'public_transit', 'walking_cycling', 'none'])
    .default('petrol_car'),
  dailyCommuteDistanceKm: z.number().min(0).default(20), // Total round-trip km
  hasCarpoolOption: z.boolean().default(true),
  canWorkFromHome: z.boolean().default(true),

  // Outdoor habits
  dailyOutdoorHoursPerPerson: z.number().min(0).max(24).default(1.5),
  doesOutdoorExercise: z.boolean().default(false),
  exerciseHoursPerDay: z.number().min(0).max(12).default(1),

  // Indoor setup & habits
  homeAreaSqFt: z.number().min(100).default(1000),
  hasAirPurifier: z.boolean().default(false),
  hasKitchenChimneyOrExhaust: z.boolean().default(false),
  usesIncenseOrMosquitoCoils: z.boolean().default(true),
  cookingFuel: z.enum(['biomass', 'lpg', 'induction', 'piped_gas']).default('lpg'),
  heatingFuel: z.enum(['biomass', 'kerosene', 'electric', 'none']).default('none'),
  hasGardenOrOpenWasteBurning: z.boolean().default(false),
  windowSealingQuality: z.enum(['poor', 'average', 'good']).default('average'),
});

export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;

// Input air quality context required for arithmetic
export interface AirQualityContext {
  currentPm25: number; // Current outdoor PM2.5 in µg/m³
  hourlyForecast?: Array<{
    dateTime: string;
    pm25?: { value: number; units: string } | null;
  }>;
}

// ============================================================================
// Action & Impact Result Schemas & Types
// ============================================================================

export interface ExposureReduction {
  /** Average PM2.5 concentration reduction in µg/m³ in the affected microenvironment */
  pm25ConcentrationReductionUgM3: number;
  /** Total daily inhaled PM2.5 dose avoided across all affected household members in µg */
  pm25InhaledDoseAvoidedUg: number;
  /** Percentage reduction in exposure for that activity/room */
  percentageDrop: number;
}

export interface EmissionReduction {
  /** Direct daily PM2.5 emissions prevented at source in grams */
  pm25SavedGrams: number;
  /** Direct daily CO2 equivalent emissions prevented in grams */
  co2SavedGrams: number;
}

export interface ActionImpactResult {
  actionId: string;
  title: string;
  description: string;
  category: ActionCategory;
  applicable: boolean;
  reasonIfNotApplicable?: string;
  exposureReduction: ExposureReduction;
  emissionReduction: EmissionReduction;
  methodologyNotes?: string;
}

export interface HouseholdImpactSummary {
  totalApplicableActions: number;
  totalPm25InhaledDoseAvoidedUg: number;
  totalPm25EmissionsSavedGrams: number;
  totalCo2EmissionsSavedGrams: number;
  totalCo2EmissionsSavedKg: number;
  topActionsByExposure: ActionImpactResult[];
  topActionsByEmissions: ActionImpactResult[];
  actions: ActionImpactResult[];
}

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
  // Household demographics (bounded to prevent absurd inputs)
  adultsCount: z
    .number()
    .int()
    .min(1, 'At least 1 adult is required')
    .max(30, 'Cannot exceed 30 adults')
    .default(2),
  childrenCount: z.number().int().min(0).max(30, 'Cannot exceed 30 children').default(0),
  elderlyCount: z.number().int().min(0).max(30, 'Cannot exceed 30 seniors').default(0),

  // Daily commute habits
  primaryCommuteMode: z
    .enum(['petrol_car', 'diesel_car', 'two_wheeler', 'public_transit', 'walking_cycling', 'none'])
    .default('petrol_car'),
  commutersCount: z.number().int().min(0).max(30, 'Cannot exceed 30 commuters').default(1),
  dailyCommuteDistanceKm: z
    .number()
    .min(0)
    .max(300, 'Daily commute distance cannot exceed 300 km')
    .default(20),
  hasCarpoolOption: z.boolean().default(true),
  canWorkFromHome: z.boolean().default(true),

  // Vulnerability & budget
  hasAsthmaOrRespiratoryCondition: z.boolean().default(false).optional(),
  budget: z.enum(['zero_cost', 'low', 'moderate', 'flexible']).default('low').optional(),

  // Outdoor habits
  dailyOutdoorHoursPerPerson: z
    .number()
    .min(0)
    .max(24, 'Outdoor hours cannot exceed 24')
    .default(1.5),
  doesOutdoorExercise: z.boolean().default(false),
  exerciseHoursPerDay: z.number().min(0).max(12, 'Exercise hours cannot exceed 12').default(1),

  // Indoor setup & habits
  homeAreaSqFt: z
    .number()
    .min(50, 'Home area must be at least 50 sq ft')
    .max(25000, 'Home area cannot exceed 25,000 sq ft')
    .default(1000),
  hasAirPurifier: z.boolean().default(false),
  hasKitchenChimneyOrExhaust: z.boolean().default(false),
  usesIncenseOrMosquitoCoils: z.boolean().default(true),
  cookingFuel: z.enum(['biomass', 'lpg', 'induction', 'piped_gas']).default('lpg'),
  heatingFuel: z.enum(['biomass', 'kerosene', 'electric', 'none']).default('none'),
  hasGardenOrOpenWasteBurning: z.boolean().default(false),
  windowSealingQuality: z.enum(['poor', 'average', 'good']).default('average'),
});

export type HouseholdProfile = z.infer<typeof HouseholdProfileSchema>;

// Input air quality context required for arithmetic (null when missing)
export interface AirQualityContext {
  currentPm25: number | null;
  hourlyForecast?: Array<{
    dateTime: string;
    pm25?: { value: number; units: string } | null;
  }>;
}

// ============================================================================
// Action & Impact Result Schemas & Types
// ============================================================================

export interface ExposureReduction {
  /** Average PM2.5 concentration reduction in µg/m³ (null if PM2.5 missing) */
  pm25ConcentrationReductionUgM3: number | null;
  /** Total daily inhaled PM2.5 dose avoided in µg (null if PM2.5 missing) */
  pm25InhaledDoseAvoidedUg: number | null;
  /** Percentage reduction in exposure for that activity/room (null if missing) */
  percentageDrop: number | null;
  /** True when exposure benefit cannot be calculated due to missing PM2.5 */
  isUnknown?: boolean;
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
  totalPm25InhaledDoseAvoidedUg: number | null;
  isExposureUnknown?: boolean;
  totalPm25EmissionsSavedGrams: number;
  totalCo2EmissionsSavedGrams: number;
  totalCo2EmissionsSavedKg: number;
  topActionsByExposure: ActionImpactResult[];
  topActionsByEmissions: ActionImpactResult[];
  actions: ActionImpactResult[];
}

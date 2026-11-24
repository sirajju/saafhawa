import { z } from 'zod';
import { ActionCategory, ExposureReduction, EmissionReduction } from '../impact/types';
import { CleanLocation, CurrentAirQuality, HourlyForecastPoint } from '../air-quality/types';

// ============================================================================
// Plan Request Schema
// ============================================================================

export const PlanRequestSchema = z.object({
  place: z
    .string()
    .trim()
    .min(2, 'Place name or pincode must be at least 2 characters')
    .max(120, 'Place name or pincode cannot exceed 120 characters'),
  adultsCount: z.number().int().min(1, 'At least 1 adult is required').default(2),
  childrenCount: z.number().int().min(0).default(0),
  elderlyCount: z.number().int().min(0).default(0),
  hasAsthmaOrRespiratoryCondition: z.boolean().default(false),
  primaryCommuteMode: z
    .enum(['petrol_car', 'diesel_car', 'two_wheeler', 'public_transit', 'walking_cycling', 'none'])
    .default('petrol_car'),
  dailyCommuteDistanceKm: z.number().min(0).default(20),
  cookingFuel: z.enum(['biomass', 'lpg', 'induction', 'piped_gas']).default('lpg'),
  heatingFuel: z.enum(['biomass', 'kerosene', 'electric', 'none']).default('none'),
  hasAirPurifier: z.boolean().default(false),
  hasKitchenChimneyOrExhaust: z.boolean().default(false),
  usesIncenseOrMosquitoCoils: z.boolean().default(true),
  hasGardenOrOpenWasteBurning: z.boolean().default(false),
  windowSealingQuality: z.enum(['poor', 'average', 'good']).default('average'),
  dailyOutdoorHoursPerPerson: z.number().min(0).max(24).default(1.5),
  doesOutdoorExercise: z.boolean().default(false),
  exerciseHoursPerDay: z.number().min(0).max(12).default(1),
  homeAreaSqFt: z.number().min(100).default(1000),
  canWorkFromHome: z.boolean().default(true),
  hasCarpoolOption: z.boolean().default(true),
  budget: z.enum(['zero_cost', 'low', 'moderate', 'flexible']).default('low'),
});

export type PlanRequest = z.infer<typeof PlanRequestSchema>;

// ============================================================================
// Gemini Output Schema
// ============================================================================

export const GeminiSelectedActionSchema = z.object({
  actionId: z.string().trim(),
  suggestedTimeOfDay: z.string().trim(),
  reason: z.string().trim(),
});

export type GeminiSelectedAction = z.infer<typeof GeminiSelectedActionSchema>;

export const GeminiPlanOutputSchema = z.object({
  selectedActions: z.array(GeminiSelectedActionSchema),
});

export type GeminiPlanOutput = z.infer<typeof GeminiPlanOutputSchema>;

// ============================================================================
// Planned Action & Complete Response Schema
// ============================================================================

export interface PlannedAction {
  actionId: string;
  title: string;
  description: string;
  category: ActionCategory;
  suggestedTimeOfDay: string;
  reason: string;
  exposureReduction: ExposureReduction;
  emissionReduction: EmissionReduction;
  methodologyNotes?: string;
}

export interface PlanSummary {
  totalActionsCount: number;
  totalPm25InhaledDoseAvoidedUg: number;
  totalPm25EmissionsSavedGrams: number;
  totalCo2EmissionsSavedGrams: number;
  totalCo2EmissionsSavedKg: number;
}

export interface PlanResponse {
  location: CleanLocation;
  currentAirQuality: CurrentAirQuality;
  hourlyForecast?: HourlyForecastPoint[];
  householdProfile: PlanRequest;
  actions: PlannedAction[];
  summary: PlanSummary;
  generationMethod: 'gemini' | 'rule_based_fallback';
  isSampleData?: boolean;
}

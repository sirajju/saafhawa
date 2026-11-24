import { z } from 'zod';

// ============================================================================
// Custom Domain Errors
// ============================================================================

export class AirQualityError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AirQualityError';
    this.statusCode = statusCode;
  }
}

export class LocationNotFoundError extends AirQualityError {
  constructor(query: string) {
    super(`Location not found for "${query}". Please check the place name or pincode.`, 404);
    this.name = 'LocationNotFoundError';
  }
}

export class QuotaExceededError extends AirQualityError {
  constructor() {
    super('Air quality service quota or rate limit exceeded. Please try again later.', 429);
    this.name = 'QuotaExceededError';
  }
}

export class ProviderUnavailableError extends AirQualityError {
  constructor(reason = 'Air quality service is temporarily unavailable. Please try again shortly.') {
    super(reason, 503);
    this.name = 'ProviderUnavailableError';
  }
}

export class InvalidInputError extends AirQualityError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'InvalidInputError';
  }
}

// ============================================================================
// Google Geocoding API Schemas
// ============================================================================

export const GoogleGeocodingLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const GoogleGeocodingResultSchema = z.object({
  formatted_address: z.string(),
  geometry: z.object({
    location: GoogleGeocodingLocationSchema,
  }),
  place_id: z.string().optional(),
});

export const GoogleGeocodingResponseSchema = z.object({
  status: z.string(),
  results: z.array(GoogleGeocodingResultSchema).default([]),
  error_message: z.string().optional(),
});

export type GoogleGeocodingResponse = z.infer<typeof GoogleGeocodingResponseSchema>;

// ============================================================================
// Google Air Quality API Schemas (Current Conditions & Forecast)
// ============================================================================

export const AirQualityColorSchema = z.object({
  red: z.number().optional(),
  green: z.number().optional(),
  blue: z.number().optional(),
  alpha: z.number().optional(),
});

export const AirQualityIndexSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  aqi: z.number().nullable().optional(),
  aqiDisplay: z.string().optional(),
  color: AirQualityColorSchema.optional(),
  category: z.string().optional(),
  dominantPollutant: z.string().optional(),
});

export const PollutantConcentrationSchema = z.object({
  value: z.number(),
  units: z.string(),
});

export const PollutantItemSchema = z.object({
  code: z.string(),
  displayName: z.string().optional(),
  fullName: z.string().optional(),
  concentration: PollutantConcentrationSchema.optional(),
  additionalInfo: z
    .object({
      sources: z.string().optional(),
      effects: z.string().optional(),
    })
    .optional(),
});

export const GoogleCurrentConditionsResponseSchema = z.object({
  dateTime: z.string(),
  regionCode: z.string().optional(),
  indexes: z.array(AirQualityIndexSchema).default([]),
  pollutants: z.array(PollutantItemSchema).default([]),
  healthRecommendations: z.record(z.string(), z.unknown()).optional(),
});

export type GoogleCurrentConditionsResponse = z.infer<typeof GoogleCurrentConditionsResponseSchema>;

export const HourlyForecastItemSchema = z.object({
  dateTime: z.string(),
  indexes: z.array(AirQualityIndexSchema).default([]),
  pollutants: z.array(PollutantItemSchema).default([]),
  healthRecommendations: z.record(z.string(), z.unknown()).optional(),
});

export const GoogleForecastResponseSchema = z.object({
  regionCode: z.string().optional(),
  hourlyForecasts: z.array(HourlyForecastItemSchema).default([]),
  nextPageToken: z.string().optional(),
});

export type GoogleForecastResponse = z.infer<typeof GoogleForecastResponseSchema>;

// ============================================================================
// Clean Output Application Schemas
// ============================================================================

export const PollutantMeasurementSchema = z.object({
  value: z.number(),
  units: z.string(),
});

export type PollutantMeasurement = z.infer<typeof PollutantMeasurementSchema>;

export const CleanLocationSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type CleanLocation = z.infer<typeof CleanLocationSchema>;

export const CurrentAirQualitySchema = z.object({
  dateTime: z.string(),
  aqi: z.number().nullable(),
  category: z.string().nullable(),
  dominantPollutant: z.string().nullable(),
  indexCode: z.string().nullable(),
  indexDisplayName: z.string().nullable(),
  pm25: PollutantMeasurementSchema.nullable(),
  pm10: PollutantMeasurementSchema.nullable(),
  isSampleData: z.boolean().optional(),
});

export type CurrentAirQuality = z.infer<typeof CurrentAirQualitySchema>;

export const HourlyForecastPointSchema = z.object({
  dateTime: z.string(),
  aqi: z.number().nullable(),
  category: z.string().nullable(),
  dominantPollutant: z.string().nullable(),
  indexCode: z.string().nullable(),
  indexDisplayName: z.string().nullable(),
  pm25: PollutantMeasurementSchema.nullable(),
  pm10: PollutantMeasurementSchema.nullable(),
});

export type HourlyForecastPoint = z.infer<typeof HourlyForecastPointSchema>;

export const AirQualityReportSchema = z.object({
  location: CleanLocationSchema,
  current: CurrentAirQualitySchema,
  hourlyForecast: z.array(HourlyForecastPointSchema),
  cachedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  isSampleData: z.boolean().optional(),
});

export type AirQualityReport = z.infer<typeof AirQualityReportSchema>;

export const AirQualityQuerySchema = z.object({
  place: z
    .string()
    .trim()
    .min(2, 'Place name or pincode must be at least 2 characters long')
    .max(120, 'Place name or pincode cannot exceed 120 characters'),
});

export type AirQualityQuery = z.infer<typeof AirQualityQuerySchema>;

/**
 * Core validation limits and user-facing messages.
 */
export const VALIDATION_LIMITS = {
  PLACE_MIN_LENGTH: 2,
  PLACE_MAX_LENGTH: 120,
  CHAT_MAX_LENGTH: 500,
  COORDINATES_MAX_LENGTH: 50,
} as const;

export const VALIDATION_MESSAGES = {
  PLACE_REQUIRED: 'Enter your city, area or pincode to continue.',
  PLACE_LENGTH: 'Place must be between 2 and 120 characters',
  INVALID_PROFILE:
    'Please provide a valid household profile including a place (between 2 and 120 characters) and at least 1 adult.',
  INVALID_CHAT_QUERY: 'Please provide a valid question under 500 characters.',
} as const;

/**
 * Standard fallback text when AQI or category is missing from sensors.
 */
export const AQI_UNAVAILABLE = 'unavailable';

/**
 * Gemini execution and fallback reasons.
 */
export const FALLBACK_REASONS = {
  NO_KEY: 'no_key',
  GEMINI_BUSY: 'gemini_busy',
  DAILY_QUOTA_EXHAUSTED: 'daily_quota_exhausted',
  MODEL_ERROR: 'model_error',
} as const;

export type FallbackReason = (typeof FALLBACK_REASONS)[keyof typeof FALLBACK_REASONS];

/**
 * SVG dimensions for 24-hour forecast chart.
 */
export const CHART_SVG_DIMENSIONS = {
  DEFAULT_WIDTH: 720,
  TOTAL_HEIGHT: 200,
  TOP_OFFSET: 10,
  BASE_Y: 138,
  MAX_AQI_SCALE: 400,
} as const;

/**
 * Client and API timers (in milliseconds).
 */
export const TIMERS = {
  LOCATION_LOOKUP_TIMEOUT_MS: 10000,
  REVERSE_GEOCODE_TIMEOUT_MS: 4000,
  CHAT_BUDGET_MS: 20000,
  LOADING_INTERVAL_MS: 1800,
} as const;

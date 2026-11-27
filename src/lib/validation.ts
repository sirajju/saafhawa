import { z } from 'zod';
import { VALIDATION_LIMITS, VALIDATION_MESSAGES } from './constants';

/**
 * Shared schema for a user-entered place: a city, locality, pincode or "lat, lon" pair.
 * Used by every API request schema so the limits stay identical across routes.
 */
export const PlaceSchema = z
  .string()
  .trim()
  .min(VALIDATION_LIMITS.PLACE_MIN_LENGTH, VALIDATION_MESSAGES.PLACE_LENGTH)
  .max(VALIDATION_LIMITS.PLACE_MAX_LENGTH, VALIDATION_MESSAGES.PLACE_LENGTH);

/**
 * Numeric coordinate query parameter (as received in a URL) within the given bounds.
 */
const CoordinateParamSchema = (name: string, min: number, max: number) =>
  z
    .string()
    .min(1, `${name} parameter is required.`)
    .max(40, `${name} parameter must be at most 40 characters.`)
    .refine((val) => /^[+-]?\d+(\.\d+)?$/.test(val.trim()), {
      message: `${name} must be a valid numeric string.`,
    })
    .transform((val) => Number(val))
    .refine((num) => Number.isFinite(num) && num >= min && num <= max, {
      message: `${name} must be a finite number between ${min} and ${max}.`,
    });

export const ReverseGeocodeQuerySchema = z.object({
  lat: CoordinateParamSchema('Latitude', -90, 90),
  lon: CoordinateParamSchema('Longitude', -180, 180),
});

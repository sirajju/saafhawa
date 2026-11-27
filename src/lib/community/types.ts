import { z } from 'zod';
import { type FallbackReason } from '../constants';

export const AdvisoryAudienceSchema = z.enum(['housing_society', 'school_group']);
export const AdvisoryLanguageSchema = z.enum(['en', 'hi']);
export type AdvisoryAudience = z.infer<typeof AdvisoryAudienceSchema>;
export type AdvisoryLanguage = z.infer<typeof AdvisoryLanguageSchema>;

export const AdvisoryRequestSchema = z.object({
  place: z
    .string()
    .trim()
    .min(2, 'Place must be at least 2 characters')
    .max(120, 'Place cannot exceed 120 characters'),
  audience: AdvisoryAudienceSchema.default('housing_society'),
  language: AdvisoryLanguageSchema.default('en'),
});

export type AdvisoryRequest = z.infer<typeof AdvisoryRequestSchema>;

export interface AdvisoryResponse {
  headline: string;
  advisoryText: string;
  audience: AdvisoryAudience;
  language: AdvisoryLanguage;
  airQualitySnapshot: {
    locationName: string;
    aqi: number | null;
    category: string;
    pm25UgM3: number | null;
  };
  modelUsed?: string;
  generationMethod?: 'gemini' | 'template';
  fallbackReason?: FallbackReason;
}

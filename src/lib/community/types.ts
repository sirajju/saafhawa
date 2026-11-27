import { z } from 'zod';
import { type FallbackReason } from '../constants';

export const AdvisoryRequestSchema = z.object({
  place: z
    .string()
    .trim()
    .min(2, 'Place must be at least 2 characters')
    .max(120, 'Place cannot exceed 120 characters'),
  audience: z.enum(['housing_society', 'school_group']).default('housing_society'),
  language: z.enum(['en', 'hi']).default('en'),
});

export type AdvisoryRequest = z.infer<typeof AdvisoryRequestSchema>;

export interface AdvisoryResponse {
  headline: string;
  advisoryText: string;
  audience: 'housing_society' | 'school_group';
  language: 'en' | 'hi';
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

export type AdvisoryAudience = 'housing_society' | 'school' | 'informal_settlement' | 'workplace';
export type AdvisoryLanguage = 'en' | 'hi' | 'ml';

export const AUDIENCES: { id: AdvisoryAudience; label: string }[] = [
  { id: 'housing_society', label: 'RWA & Housing Society' },
  { id: 'school', label: 'Schools & Parents' },
  { id: 'informal_settlement', label: 'Community & Slums' },
  { id: 'workplace', label: 'Workplaces & Offices' },
];

export const LANGUAGES: { id: AdvisoryLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi (हिंदी)' },
  { id: 'ml', label: 'Malayalam (മലയാളം)' },
];

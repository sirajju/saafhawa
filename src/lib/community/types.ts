import { z } from 'zod';

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
  isSampleData?: boolean;
  airQualitySnapshot: {
    locationName: string;
    aqi: number | null;
    category: string;
    pm25UgM3: number | null;
  };
  modelUsed?: string;
}

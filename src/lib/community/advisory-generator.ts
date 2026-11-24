import { GoogleGenAI } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { capTextLength, withTimeout } from '../gemini-utils';
import { logServerError } from '../logger';
import { AdvisoryRequest, AdvisoryResponse } from './types';
import { generateTemplateAdvisory } from './advisory-templates';

export { generateTemplateAdvisory } from './advisory-templates';

export interface AdvisoryGeneratorOptions {
  model?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
}

function resolveModel(customModel?: string): string {
  return customModel || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}

function resolveApiKey(customApiKey?: string): string | undefined {
  return customApiKey || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
}

/**
 * Generates an advisory for WhatsApp sharing via Gemini (or localized template fallback).
 */
export async function generateCommunityAdvisory(
  request: AdvisoryRequest,
  options: AdvisoryGeneratorOptions = {}
): Promise<AdvisoryResponse> {
  const fetcher = options.airQualityFetcher ?? getAirQualityByLocation;
  const report = await fetcher(request.place);

  const model = resolveModel(options.model);
  const apiKey = resolveApiKey(options.apiKey);

  const snapshot = {
    locationName: report.location.name,
    aqi: report.current.aqi,
    category: report.current.category || 'Severe',
    pm25UgM3: report.current.pm25 ? report.current.pm25.value : null,
  };

  const isSample = Boolean(report.isSampleData || report.current.isSampleData);

  if (!apiKey) {
    const template = generateTemplateAdvisory(report, request.audience, request.language);
    return {
      headline: template.headline,
      advisoryText: template.advisoryText,
      audience: request.audience,
      language: request.language,
      isSampleData: isSample,
      airQualitySnapshot: snapshot,
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const isSample = Boolean(report.isSampleData || report.current.isSampleData);

    const prompt = `You are a public health and air quality communication specialist in India.
Write a concise, impactful WhatsApp broadcast advisory in ${request.language === 'hi' ? 'Hindi (Devanagari script)' : 'English'} for a ${request.audience === 'school_group' ? 'School / Parent Teacher Group' : 'Housing Society / Resident Welfare Association (RWA)'}.

LOCATION & AIR QUALITY:
- Location: ${report.location.name}
- Air Quality: AQI ${report.current.aqi ?? 'Severe'} (${report.current.category ?? 'Unhealthy'})
- PM2.5 Level: ${report.current.pm25?.value ?? 'Elevated'} µg/m³
- Dominant Pollutant: ${report.current.dominantPollutant ?? 'PM2.5'}
${isSample ? '- DATA NOTE: This advisory is based on sample reference conditions for New Delhi, not live sensor data. State clearly that this is sample reference data for planning, and do NOT use words like "live" or "real-time".' : ''}

REQUIREMENTS:
1. Format for WhatsApp: use bold headers (*Title*), numbered points (1️⃣, 2️⃣), and clean bullet points with relevant emojis.
2. Provide 4 to 5 highly practical, low-emission actions specific to ${request.audience === 'school_group' ? 'schools (cancel morning outdoor assemblies, N95 masking on buses, inhalers for asthma kids, indoor recess)' : 'housing societies (no leaf burning, wet mopping corridors instead of dry sweeping, no vehicle idling at gates, shift elderly walks to midday, carpooling)'}.
3. Keep it brief (under 250 words) so it fits in a single mobile screen and is ready to copy-paste.
4. Output ONLY the raw WhatsApp text with no conversational preamble or markdown code fences.`;

    const generatePromise = ai.models.generateContent({
      model,
      contents: prompt,
    });

    const response = await withTimeout(generatePromise, 15000, 'Gemini Advisory Generation');
    const rawText = capTextLength(response.text?.trim(), 2500);

    if (rawText && rawText.length > 50) {
      const headline = request.language === 'hi'
        ? (request.audience === 'school_group' ? `🏫 स्कूल परामर्श: ${report.location.name}` : `🏘️ सोसायटी परामर्श: ${report.location.name}`)
        : (request.audience === 'school_group' ? `🏫 School Smog Advisory: ${report.location.name}` : `🏘️ Community Clean Air Advisory: ${report.location.name}`);

      return {
        headline,
        advisoryText: rawText,
        audience: request.audience,
        language: request.language,
        isSampleData: isSample,
        airQualitySnapshot: snapshot,
      };
    }

    return {
      ...generateTemplateAdvisory(report, request.audience, request.language),
      audience: request.audience,
      language: request.language,
      isSampleData: isSample,
      airQualitySnapshot: snapshot,
    };
  } catch (err: unknown) {
    logServerError('AdvisoryGenerator', err);
    return {
      ...generateTemplateAdvisory(report, request.audience, request.language),
      audience: request.audience,
      language: request.language,
      isSampleData: isSample,
      airQualitySnapshot: snapshot,
    };
  }
}

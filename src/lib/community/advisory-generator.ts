import { createGeminiClient, resolveGeminiModels } from '../gemini/client';
import { resolveGeminiApiKey } from '../env';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { formatMeasurementTime } from '../air-quality/time-utils';
import { capTextLength, withTimeout } from '../gemini/utils';
import { executeWithGeminiRetry } from '../gemini/executor';
import { logServerError } from '../logger';
import { AdvisoryRequest, AdvisoryResponse } from './types';
import { generateTemplateAdvisory } from './advisory-templates';
import { buildAdvisoryCacheKey, getCachedAdvisory, setCachedAdvisory } from '../gemini/cache';

export interface AdvisoryGeneratorOptions {
  models?: string[];
  model?: string;
  fallbackModel?: string;
  apiKey?: string;
  airQualityFetcher?: (place: string) => Promise<AirQualityReport>;
}

/**
 * Generates tailored community air quality advisories for WhatsApp groups, RWAs, schools, and outdoor workers.
 */
export async function generateCommunityAdvisory(
  request: AdvisoryRequest,
  options: AdvisoryGeneratorOptions = {}
): Promise<AdvisoryResponse> {
  const cacheKey = buildAdvisoryCacheKey(request.place, request.audience, request.language);
  const cached = getCachedAdvisory(cacheKey);
  if (cached) return cached;

  const fetcher = options.airQualityFetcher ?? getAirQualityByLocation;
  const report = await fetcher(request.place);

  const models = resolveGeminiModels({
    models: options.models,
    model: options.model,
    fallbackModel: options.fallbackModel,
  });
  const apiKey = resolveGeminiApiKey(options.apiKey);

  const snapshot = {
    locationName: report.location.name,
    aqi: report.current.aqi,
    category: report.current.category || 'unavailable',
    pm25UgM3: report.current.pm25 ? report.current.pm25.value : null,
  };

  if (!apiKey) {
    const template = generateTemplateAdvisory(report, request.audience, request.language);
    return {
      headline: template.headline,
      advisoryText: template.advisoryText,
      audience: request.audience,
      language: request.language,
      airQualitySnapshot: snapshot,
      generationMethod: 'template',
      fallbackReason: 'no_key',
    };
  }

  try {
    const ai = createGeminiClient(apiKey);
    const prompt = `You are a public health and air quality communication specialist in India.
Write a concise, impactful WhatsApp broadcast advisory in ${request.language === 'hi' ? 'Hindi (Devanagari script)' : 'English'} for a ${request.audience === 'school_group' ? 'School / Parent Teacher Group' : 'Housing Society / Resident Welfare Association (RWA)'}.

LOCATION & AIR QUALITY:
- Location: ${report.location.name}
- Data Source: ${report.current.dataSource || 'Open-Meteo (CAMS model)'}
- Measured At: ${formatMeasurementTime(report.current.dateTime, report.location.timeZone)}
- Air Quality: AQI ${report.current.aqi ?? 'unavailable'} (${report.current.category ?? 'unavailable'})
- PM2.5 Level: ${report.current.pm25?.value !== null && report.current.pm25?.value !== undefined ? `${report.current.pm25.value} µg/m³` : 'unavailable'}
- Dominant Pollutant: ${report.current.dominantPollutant ?? 'unavailable'}

REQUIREMENTS:
1. Format for WhatsApp: use bold headers (*Title*), numbered points (1️⃣, 2️⃣), and clean bullet points with relevant emojis.
2. Near the top, clearly state the data source (${report.current.dataSource || 'Open-Meteo (CAMS model)'}) and local measurement time (${formatMeasurementTime(report.current.dateTime, report.location.timeZone)}).
3. Provide 4 to 5 highly practical, low-emission actions specific to ${request.audience === 'school_group' ? 'schools (cancel morning outdoor assemblies, N95 masking on buses, inhalers for asthma kids, indoor recess)' : 'housing societies (no leaf burning, wet mopping corridors instead of dry sweeping, no vehicle idling at gates, shift elderly walks to midday, carpooling)'}.
4. Keep it brief (under 250 words) so it fits in a single mobile screen and is ready to copy-paste.
5. Output ONLY the raw WhatsApp text with no conversational preamble or markdown code fences.`;

    const execResult = await executeWithGeminiRetry<string>({
      models,
      apiKey,
      label: 'AdvisoryGenerator',
      fn: async (activeModel, timeoutMs) => {
        const response = await withTimeout(
          ai.models.generateContent({ model: activeModel, contents: prompt }),
          timeoutMs,
          'Gemini Advisory Generation'
        );
        return capTextLength(response.text?.trim(), 2500) || '';
      },
    });

    if (execResult.data && execResult.data.length > 50) {
      const headline = request.language === 'hi'
        ? (request.audience === 'school_group' ? `🏫 स्कूल परामर्श: ${report.location.name}` : `🏘️ सोसायटी परामर्श: ${report.location.name}`)
        : (request.audience === 'school_group' ? `🏫 School Smog Advisory: ${report.location.name}` : `🏘️ Community Clean Air Advisory: ${report.location.name}`);

      const responseToReturn: AdvisoryResponse = {
        headline,
        advisoryText: execResult.data,
        audience: request.audience,
        language: request.language,
        airQualitySnapshot: snapshot,
        modelUsed: execResult.modelUsed,
        generationMethod: 'gemini',
      };
      setCachedAdvisory(cacheKey, responseToReturn);
      return responseToReturn;
    }

    let fallbackReason: AdvisoryResponse['fallbackReason'] = 'model_error';
    if (execResult.failedDueToDailyQuota) {
      fallbackReason = 'daily_quota_exhausted';
    } else if (execResult.failedDueToBusy) {
      fallbackReason = 'gemini_busy';
    }

    return {
      ...generateTemplateAdvisory(report, request.audience, request.language),
      audience: request.audience,
      language: request.language,
      airQualitySnapshot: snapshot,
      generationMethod: 'template',
      fallbackReason,
    };
  } catch (err: unknown) {
    logServerError('AdvisoryGenerator', err);
    return {
      ...generateTemplateAdvisory(report, request.audience, request.language),
      audience: request.audience,
      language: request.language,
      airQualitySnapshot: snapshot,
      generationMethod: 'template',
      fallbackReason: 'model_error',
    };
  }
}

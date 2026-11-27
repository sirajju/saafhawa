import { type AirQualityReport } from '../air-quality/types';
import { formatMeasurementTime } from '../air-quality/time-utils';
import { type ChatRequest, type ChatResponse, type ExecutedToolRecord } from './types';
import { buildLiveDataReply, buildNoDataReply, type ChatIntent } from './fallback-replies';

const MEDICAL_KEYWORDS = ['doctor', 'cough', 'chest', 'breath', 'medicine', 'inhaler'];
const OUTDOOR_KEYWORDS = ['play', 'outside', 'run', 'exercise', 'walk'];
const PURIFIER_KEYWORDS = ['purifier', 'filter', 'box fan'];

type KeywordIntent = { intent: Exclude<ChatIntent, 'general'>; keywords: string[] };

/** With live data, outdoor questions are answered first; without it, medical safety comes first. */
const INTENT_ORDER_WITH_REPORT: KeywordIntent[] = [
  { intent: 'outdoor', keywords: OUTDOOR_KEYWORDS },
  { intent: 'medical', keywords: MEDICAL_KEYWORDS },
  { intent: 'purifier', keywords: PURIFIER_KEYWORDS },
];
const INTENT_ORDER_WITHOUT_REPORT: KeywordIntent[] = [
  { intent: 'medical', keywords: MEDICAL_KEYWORDS },
  { intent: 'outdoor', keywords: OUTDOOR_KEYWORDS },
  { intent: 'purifier', keywords: PURIFIER_KEYWORDS },
];

export function detectIntent(query: string, hasReport: boolean = false): ChatIntent {
  const lower = query.toLowerCase();
  const order = hasReport ? INTENT_ORDER_WITH_REPORT : INTENT_ORDER_WITHOUT_REPORT;
  const match = order.find(({ keywords }) => keywords.some((k) => lower.includes(k)));
  return match?.intent ?? 'general';
}

/** Looks up live air quality; a failed lookup yields null instead of invented values. */
async function fetchReportSafely(
  place: string | undefined,
  fetcher: (place: string) => Promise<AirQualityReport>,
  toolsExecuted: ExecutedToolRecord[]
): Promise<AirQualityReport | null> {
  if (!place) return null;
  try {
    const report = await fetcher(place);
    if (typeof report.current.aqi === 'number') {
      toolsExecuted.push({
        toolName: 'getAirQualityAndForecast',
        args: { place },
        resultSummary: `Fetched AQI: ${report.current.aqi} (${report.current.category}), PM2.5: ${report.current.pm25?.value} µg/m³`,
      });
    }
    return report;
  } catch {
    return null;
  }
}

function categoryFor(aqi: number, reported?: string | null): string {
  if (reported) return reported;
  if (aqi <= 50) return 'Good';
  return aqi <= 100 ? 'Satisfactory' : 'Moderate';
}

function sourceFootnote(report: AirQualityReport): string {
  if (!report.current.dataSource) return '';
  return `\n\n*(Source: ${report.current.dataSource} · Measured at: ${formatMeasurementTime(report.current.dateTime, report.location.timeZone)})*`;
}

/**
 * Fallback answer generator when Gemini API is unavailable.
 * Answers honestly without inventing fake numbers or defaults.
 */
export async function generateFallbackChatResponse(
  request: ChatRequest,
  airQualityFetcher: (place: string) => Promise<AirQualityReport>
): Promise<ChatResponse> {
  const place = request.place || request.householdProfile?.place;
  const toolsExecuted: ExecutedToolRecord[] = [];
  const report = await fetchReportSafely(place, airQualityFetcher, toolsExecuted);
  const aqi = report?.current.aqi;
  const hasAsthma = Boolean(request.householdProfile?.hasAsthmaOrRespiratoryCondition);

  if (!report || aqi === null || aqi === undefined) {
    const intent = detectIntent(request.message, false);
    return { reply: buildNoDataReply(intent, hasAsthma), toolsExecuted };
  }

  const pm25 = report.current.pm25?.value;
  const reply = buildLiveDataReply(detectIntent(request.message, true), {
    locName: report.location.name || place || '',
    aqi,
    category: categoryFor(aqi, report.current.category),
    pm25,
    pm25Text: typeof pm25 === 'number' ? `PM2.5: ${pm25} µg/m³` : '',
    hasAsthma,
  });

  return { reply: reply + sourceFootnote(report), toolsExecuted };
}

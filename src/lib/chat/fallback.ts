import { AirQualityReport } from '../air-quality/types';
import { ChatRequest, ChatResponse, ExecutedToolRecord } from './types';

/**
 * Fallback answer generator when Gemini API is unavailable.
 */
export async function generateFallbackChatResponse(
  request: ChatRequest,
  airQualityFetcher: (place: string) => Promise<AirQualityReport>
): Promise<ChatResponse> {
  const place = request.place || request.householdProfile?.place || '110001';
  let report: AirQualityReport | null = null;
  const toolsExecuted: ExecutedToolRecord[] = [];

  try {
    report = await airQualityFetcher(place);
    const isSample = Boolean(report.isSampleData || report.current.isSampleData);
    toolsExecuted.push({
      toolName: 'getAirQualityAndForecast',
      args: { place },
      resultSummary: isSample
        ? `Fetched sample reference AQI: ${report.current.aqi} (${report.current.category}), PM2.5: ${report.current.pm25?.value} µg/m³`
        : `Fetched AQI: ${report.current.aqi} (${report.current.category}), PM2.5: ${report.current.pm25?.value} µg/m³`,
    });
  } catch {
    // fallback continues with defaults
  }

  const isSample = Boolean(report?.isSampleData || report?.current.isSampleData);
  const sampleNotice = isSample ? '⚠️ *(Note: Based on New Delhi reference sample data)*\n\n' : '';

  const query = request.message.toLowerCase();
  const aqi = report?.current.aqi ?? 250;
  const category = report?.current.category ?? 'Unhealthy';
  const pm25 = report?.current.pm25?.value;
  const pm25Text = typeof pm25 === 'number' ? `PM2.5: ${pm25} µg/m³` : 'PM2.5: unavailable';
  const hasAsthma = request.householdProfile?.hasAsthmaOrRespiratoryCondition ?? false;

  let reply = '';

  if (query.includes('play') || query.includes('outside') || query.includes('run') || query.includes('exercise') || query.includes('walk')) {
    if (aqi > 250 || (typeof pm25 === 'number' && pm25 > 120)) {
      reply = `${sampleNotice}In **${report?.location.name || place}**, air quality is in the **${category}** category with an AQI of **${aqi}** (${pm25Text}).\n\n` +
        `🚫 **Recommendation:** Strenuous outdoor play or exercise is **not safe** today, especially for children${hasAsthma ? ' and anyone with asthma' : ''}. Cold winter temperature inversions concentrate toxic particulates near the ground.\n\n` +
        `💡 **What to do instead:** Keep activities indoors in a sealed room. If stepping out is unavoidable, wear a fitted N95 mask and aim for early afternoon (1 PM - 3 PM) when sunlight slightly disperses surface pollution.`;
    } else {
      reply = `${sampleNotice}The AQI reading for **${report?.location.name || place}** is **${aqi}** (${category}). While lighter outdoor activities are possible, sensitive groups${hasAsthma ? ' (including asthma sufferers)' : ''} should limit prolonged exertion and wear an N95 mask.`;
    }
  } else if (query.includes('doctor') || query.includes('cough') || query.includes('chest') || query.includes('breath') || query.includes('medicine') || query.includes('inhaler')) {
    reply = `⚠️ **Health & Medical Note:** If you or a family member is experiencing persistent coughing, wheezing, or difficulty breathing, **please consult a qualified medical doctor immediately**.\n\n` +
      `🛡️ **Immediate Environmental Precautions:**\n` +
      `• Move to an enclosed room with a HEPA air purifier or DIY Corsi-Rosenthal box running.\n` +
      `• Keep doors, windows, and draft gaps tightly sealed.\n` +
      `• Avoid dry sweeping, incense sticks, or frying food indoors.\n` +
      `• Keep all prescribed emergency inhalers and medications readily accessible.`;
  } else if (query.includes('purifier') || query.includes('filter') || query.includes('box fan')) {
    reply = `${sampleNotice}Under smog conditions (AQI ${aqi}), indoor air filtration is essential.\n\n` +
      `• **HEPA Air Purifier:** Running a HEPA purifier in sleeping areas reduces indoor PM2.5 by ~75% over 8 hours.\n` +
      `• **DIY Box-Fan Filter:** If purifiers are too costly, a 20-inch box fan taped to four MERV-13 filters (Corsi-Rosenthal box) provides up to 68% living area particulate reduction at a fraction of the cost.\n` +
      `• **Kitchen Exhaust:** Always run kitchen exhaust fans while cooking to vent frying aerosol spikes directly outside.`;
  } else {
    reply = `${sampleNotice}In **${report?.location.name || place}**, today's AQI reading is **${aqi}** (${category}, PM2.5: ${pm25} µg/m³).\n\n` +
      `Key daily recommendations for your household:\n` +
      `1. **Wear an N95/FFP2 Mask** whenever stepping outside for commutes or errands.\n` +
      `2. **Keep Windows Sealed** during morning and night temperature inversion hours.\n` +
      `3. **Eliminate Indoor Smoke**: Avoid incense sticks, dhoop, and mosquito coils, which create severe indoor particulate spikes.\n` +
      `4. **Wet Mop** floors instead of dry sweeping to stop settled dust from getting kicked back up.`;
  }

  return { reply, toolsExecuted };
}

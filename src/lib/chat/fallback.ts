import { AirQualityReport } from '../air-quality/types';
import { formatMeasurementTime } from '../air-quality/cpcb-aqi';
import { ChatRequest, ChatResponse, ExecutedToolRecord } from './types';

/**
 * Fallback answer generator when Gemini API is unavailable.
 * Answers honestly without inventing fake numbers or defaults.
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
    if (typeof report.current.aqi === 'number') {
      toolsExecuted.push({
        toolName: 'getAirQualityAndForecast',
        args: { place },
        resultSummary: isSample
          ? `Fetched sample reference AQI: ${report.current.aqi} (${report.current.category}), PM2.5: ${report.current.pm25?.value} µg/m³`
          : `Fetched AQI: ${report.current.aqi} (${report.current.category}), PM2.5: ${report.current.pm25?.value} µg/m³`,
      });
    }
  } catch {
    // Lookup failed - report remains null
  }

  const query = request.message.toLowerCase();
  const hasAsthma = Boolean(request.householdProfile?.hasAsthmaOrRespiratoryCondition);

  // 1. Honesty on failed air quality lookup: never invent AQI numbers or categories
  if (!report || report.current.aqi === null || report.current.aqi === undefined) {
    let reply = "I couldn't get air quality for this place right now. Here is general guidance for your household:\n\n";

    if (query.includes('doctor') || query.includes('cough') || query.includes('chest') || query.includes('breath') || query.includes('medicine') || query.includes('inhaler')) {
      reply += `⚠️ **Health & Medical Note:** If you or a family member is experiencing persistent coughing, wheezing, or difficulty breathing, **please consult a qualified medical doctor immediately**.\n\n` +
        `🛡️ **Immediate Environmental Precautions:**\n` +
        `• Rest in an enclosed room with an air purifier running if available.\n` +
        `• Keep doors, windows, and draft gaps closed.\n` +
        `• Avoid indoor smoke, incense sticks, or frying food.\n` +
        `• Keep prescribed emergency inhalers and medications readily accessible.`;
    } else if (query.includes('play') || query.includes('outside') || query.includes('run') || query.includes('exercise') || query.includes('walk')) {
      reply += `• **Outdoor Activities:** Check official local monitors or visual smog conditions before strenuous outdoor exercise${hasAsthma ? ', especially for sensitive family members with asthma' : ''}.\n` +
        `• If haze or smoke is visible outside, keep workouts and active play indoors, or schedule them for midday when sunlight helps disperse surface pollution.`;
    } else {
      reply += `1. **Watch Local Visibility:** If haze or smoke is noticeable outside, wear a fitted N95 mask for commutes and errands.\n` +
        `2. **Natural Ventilation vs Sealing:** Open windows during bright midday hours if the outdoor air smells clean; keep windows closed during cold morning and night temperature inversions.\n` +
        `3. **Eliminate Indoor Smoke:** Avoid incense sticks, dhoop, and mosquito coils, which create high indoor particulate levels.\n` +
        `4. **Dust Control:** Wet mop floors instead of dry sweeping to keep settled dust from becoming airborne.`;
    }

    return { reply, toolsExecuted };
  }

  const isSample = Boolean(report.isSampleData || report.current.isSampleData);
  const sampleNotice = isSample ? '⚠️ *(Note: Based on New Delhi reference sample data)*\n\n' : '';
  const aqi = report.current.aqi;
  const category = report.current.category || (aqi <= 50 ? 'Good' : aqi <= 100 ? 'Satisfactory' : 'Moderate');
  const pm25 = report.current.pm25?.value;
  const pm25Text = typeof pm25 === 'number' ? `PM2.5: ${pm25} µg/m³` : '';
  const locName = report.location.name || place;

  let reply = '';

  // 2. Air quality scaling: Good (<=50) and Satisfactory (51-100)
  if (aqi <= 100) {
    if (query.includes('play') || query.includes('outside') || query.includes('run') || query.includes('exercise') || query.includes('walk')) {
      if (aqi <= 50) {
        reply = `${sampleNotice}In **${locName}**, air quality is **${category}** with an AQI of **${aqi}**${pm25Text ? ` (${pm25Text})` : ''}.\n\n` +
          `✅ **Recommendation:** Outdoor play, walking, and exercise are **safe and encouraged** for everyone today.\n\n` +
          `The air is clean; no masks or timing restrictions are needed.`;
      } else {
        reply = `${sampleNotice}In **${locName}**, air quality is in the **${category}** category with an AQI of **${aqi}**${pm25Text ? ` (${pm25Text})` : ''}.\n\n` +
          `✅ **Recommendation:** Air quality is satisfactory and fine for normal outdoor activities.${hasAsthma ? ' Sensitive family members with asthma should take it easy during heavy or prolonged exertion.' : ''}\n\n` +
          `No special masks or window sealing are required today.`;
      }
    } else if (query.includes('doctor') || query.includes('cough') || query.includes('chest') || query.includes('breath') || query.includes('medicine') || query.includes('inhaler')) {
      reply = `⚠️ **Health & Medical Note:** If you or a family member is experiencing persistent coughing, wheezing, or difficulty breathing, **please consult a qualified medical doctor immediately**.\n\n` +
        `Even in satisfactory air (AQI ${aqi}), individual triggers can cause irritation. Keep prescribed rescue medications handy.`;
    } else if (query.includes('purifier') || query.includes('filter') || query.includes('box fan')) {
      reply = `${sampleNotice}In **${locName}**, outdoor air quality is **${category}** (AQI **${aqi}**).\n\n` +
        `• **Ventilation:** Outdoor air is safe today, so you can open windows for natural airflow.\n` +
        `• **Air Purifiers:** While purifiers are valuable during winter inversions, they are not urgently required when AQI is satisfactory.\n` +
        `• **Kitchen Exhaust:** Keep kitchen exhausts running while cooking to vent frying aerosols directly outside.`;
    } else {
      reply = `${sampleNotice}In **${locName}**, today's AQI reading is **${aqi}** (${category}${pm25Text ? `, ${pm25Text}` : ''}). Air quality is satisfactory for normal daily routines.\n\n` +
        `General healthy recommendations for your home:\n` +
        `1. **Natural Airflow:** Keep windows open during daytime to let in fresh air.\n` +
        `2. **Keep Indoor Air Clean:** Avoid incense sticks and mosquito coils to maintain great indoor air quality.\n` +
        `3. **Clean Commuting:** Walking, cycling, and public transit are great choices today.\n` +
        `4. **Dust Control:** Wet mop floors instead of dry sweeping.`;
    }
  } else {
    // 3. Elevated pollution (AQI > 100): Moderate, Poor, Very Poor, Severe
    if (query.includes('play') || query.includes('outside') || query.includes('run') || query.includes('exercise') || query.includes('walk')) {
      if (aqi > 250 || (typeof pm25 === 'number' && pm25 > 120)) {
        reply = `${sampleNotice}In **${locName}**, air quality is in the **${category}** category with an AQI of **${aqi}** (${pm25Text}).\n\n` +
          `🚫 **Recommendation:** Strenuous outdoor play or exercise is **not safe** today, especially for children${hasAsthma ? ' and anyone with asthma' : ''}. Cold winter temperature inversions concentrate toxic particulates near the ground.\n\n` +
          `💡 **What to do instead:** Keep activities indoors in a sealed room. If stepping out is unavoidable, wear a fitted N95 mask and aim for early afternoon (1 PM - 3 PM) when sunlight slightly disperses surface pollution.`;
      } else {
        reply = `${sampleNotice}The AQI reading for **${locName}** is **${aqi}** (${category}). While lighter outdoor activities are possible, sensitive groups${hasAsthma ? ' (including asthma sufferers)' : ''} should limit prolonged exertion and wear an N95 mask.`;
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
      reply = `${sampleNotice}In **${locName}**, today's AQI reading is **${aqi}** (${category}${pm25Text ? `, ${pm25Text}` : ''}).\n\n` +
        `Key daily recommendations for your household:\n` +
        `1. **Wear an N95/FFP2 Mask** whenever stepping outside for commutes or errands.\n` +
        `2. **Keep Windows Sealed** during morning and night temperature inversion hours.\n` +
        `3. **Eliminate Indoor Smoke**: Avoid incense sticks, dhoop, and mosquito coils, which create severe indoor particulate spikes.\n` +
        `4. **Wet Mop** floors instead of dry sweeping to stop settled dust from getting kicked back up.`;
    }
  }

  if (report.current.dataSource) {
    reply += `\n\n*(Source: ${report.current.dataSource} · Measured at: ${formatMeasurementTime(report.current.dateTime, report.location.timeZone)})*`;
  }

  return { reply, toolsExecuted };
}

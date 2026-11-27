/**
 * Rule-based chat replies used when Gemini is unavailable.
 * One builder per (air-quality band, intent); numbers come only from the live report.
 */

export type ChatIntent = 'medical' | 'outdoor' | 'purifier' | 'general';

export interface ReplyContext {
  locName: string;
  aqi: number;
  category: string;
  pm25?: number | null;
  pm25Text: string;
  hasAsthma: boolean;
}

type ReplyBuilder = (ctx: ReplyContext) => string;

const MEDICAL_NOTE = `⚠️ **Health & Medical Note:** If you or a family member is experiencing persistent coughing, wheezing, or difficulty breathing, **please consult a qualified medical doctor immediately**.\n\n`;

/** Severe outdoor threshold: AQI above 250 or PM2.5 above 120 µg/m³. */
const isSevereForOutdoor = (ctx: ReplyContext) =>
  ctx.aqi > 250 || (typeof ctx.pm25 === 'number' && ctx.pm25 > 120);

const withPm = (ctx: ReplyContext, wrap: (t: string) => string) =>
  ctx.pm25Text ? wrap(ctx.pm25Text) : '';

/** Guidance when no live AQI is available: never invents numbers or categories. */
export function buildNoDataReply(intent: ChatIntent, hasAsthma: boolean): string {
  const intro =
    "I couldn't get air quality for this place right now. Here is general guidance for your household:\n\n";
  if (intent === 'medical') {
    return (
      intro +
      MEDICAL_NOTE +
      `🛡️ **Immediate Environmental Precautions:**\n` +
      `• Rest in an enclosed room with an air purifier running if available.\n` +
      `• Keep doors, windows, and draft gaps closed.\n` +
      `• Avoid indoor smoke, incense sticks, or frying food.\n` +
      `• Keep prescribed emergency inhalers and medications readily accessible.`
    );
  }
  if (intent === 'outdoor') {
    return (
      intro +
      `• **Outdoor Activities:** Check official local monitors or visual smog conditions before strenuous outdoor exercise${hasAsthma ? ', especially for sensitive family members with asthma' : ''}.\n` +
      `• If haze or smoke is visible outside, keep workouts and active play indoors, or schedule them for midday when sunlight helps disperse surface pollution.`
    );
  }
  return (
    intro +
    `1. **Watch Local Visibility:** If haze or smoke is noticeable outside, wear a fitted N95 mask for commutes and errands.\n` +
    `2. **Natural Ventilation vs Sealing:** Open windows during bright midday hours if the outdoor air smells clean; keep windows closed during cold morning and night temperature inversions.\n` +
    `3. **Eliminate Indoor Smoke:** Avoid incense sticks, dhoop, and mosquito coils, which create high indoor particulate levels.\n` +
    `4. **Dust Control:** Wet mop floors instead of dry sweeping to keep settled dust from becoming airborne.`
  );
}

/** AQI 0-100 (Good or Satisfactory). */
const CLEAN_AIR_REPLIES: Record<ChatIntent, ReplyBuilder> = {
  outdoor: (ctx) =>
    ctx.aqi <= 50
      ? `In **${ctx.locName}**, air quality is **${ctx.category}** with an AQI of **${ctx.aqi}**${withPm(ctx, (t) => ` (${t})`)}.\n\n` +
        `✅ **Recommendation:** Outdoor play, walking, and exercise are **safe and encouraged** for everyone today.\n\n` +
        `The air is clean; no masks or timing restrictions are needed.`
      : `In **${ctx.locName}**, air quality is in the **${ctx.category}** category with an AQI of **${ctx.aqi}**${withPm(ctx, (t) => ` (${t})`)}.\n\n` +
        `✅ **Recommendation:** Air quality is satisfactory and fine for normal outdoor activities.${ctx.hasAsthma ? ' Sensitive family members with asthma should take it easy during heavy or prolonged exertion.' : ''}\n\n` +
        `No special masks or window sealing are required today.`,
  medical: (ctx) =>
    MEDICAL_NOTE +
    `Even in satisfactory air (AQI ${ctx.aqi}), individual triggers can cause irritation. Keep prescribed rescue medications handy.`,
  purifier: (ctx) =>
    `In **${ctx.locName}**, outdoor air quality is **${ctx.category}** (AQI **${ctx.aqi}**).\n\n` +
    `• **Ventilation:** Outdoor air is safe today, so you can open windows for natural airflow.\n` +
    `• **Air Purifiers:** While purifiers are valuable during winter inversions, they are not urgently required when AQI is satisfactory.\n` +
    `• **Kitchen Exhaust:** Keep kitchen exhausts running while cooking to vent frying aerosols directly outside.`,
  general: (ctx) =>
    `In **${ctx.locName}**, today's AQI reading is **${ctx.aqi}** (${ctx.category}${withPm(ctx, (t) => `, ${t}`)}). Air quality is satisfactory for normal daily routines.\n\n` +
    `General healthy recommendations for your home:\n` +
    `1. **Natural Airflow:** Keep windows open during daytime to let in fresh air.\n` +
    `2. **Keep Indoor Air Clean:** Avoid incense sticks and mosquito coils to maintain great indoor air quality.\n` +
    `3. **Clean Commuting:** Walking, cycling, and public transit are great choices today.\n` +
    `4. **Dust Control:** Wet mop floors instead of dry sweeping.`,
};

/** AQI above 100 (Moderate to Severe). */
const POLLUTED_AIR_REPLIES: Record<ChatIntent, ReplyBuilder> = {
  outdoor: (ctx) =>
    isSevereForOutdoor(ctx)
      ? `In **${ctx.locName}**, air quality is in the **${ctx.category}** category with an AQI of **${ctx.aqi}** (${ctx.pm25Text}).\n\n` +
        `🚫 **Recommendation:** Strenuous outdoor play or exercise is **not safe** today, especially for children${ctx.hasAsthma ? ' and anyone with asthma' : ''}. Cold winter temperature inversions concentrate toxic particulates near the ground.\n\n` +
        `💡 **What to do instead:** Keep activities indoors in a sealed room. If stepping out is unavoidable, wear a fitted N95 mask and aim for early afternoon (1 PM - 3 PM) when sunlight slightly disperses surface pollution.`
      : `The AQI reading for **${ctx.locName}** is **${ctx.aqi}** (${ctx.category}). While lighter outdoor activities are possible, sensitive groups${ctx.hasAsthma ? ' (including asthma sufferers)' : ''} should limit prolonged exertion and wear an N95 mask.`,
  medical: () =>
    MEDICAL_NOTE +
    `🛡️ **Immediate Environmental Precautions:**\n` +
    `• Move to an enclosed room with a HEPA air purifier or DIY Corsi-Rosenthal box running.\n` +
    `• Keep doors, windows, and draft gaps tightly sealed.\n` +
    `• Avoid dry sweeping, incense sticks, or frying food indoors.\n` +
    `• Keep all prescribed emergency inhalers and medications readily accessible.`,
  purifier: (ctx) =>
    `Under smog conditions (AQI ${ctx.aqi}), indoor air filtration is essential.\n\n` +
    `• **HEPA Air Purifier:** Running a HEPA purifier in sleeping areas reduces indoor PM2.5 by ~75% over 8 hours.\n` +
    `• **DIY Box-Fan Filter:** If purifiers are too costly, a 20-inch box fan taped to four MERV-13 filters (Corsi-Rosenthal box) provides up to 68% living area particulate reduction at a fraction of the cost.\n` +
    `• **Kitchen Exhaust:** Always run kitchen exhaust fans while cooking to vent frying aerosol spikes directly outside.`,
  general: (ctx) =>
    `In **${ctx.locName}**, today's AQI reading is **${ctx.aqi}** (${ctx.category}${withPm(ctx, (t) => `, ${t}`)}).\n\n` +
    `Key daily recommendations for your household:\n` +
    `1. **Wear an N95/FFP2 Mask** whenever stepping outside for commutes or errands.\n` +
    `2. **Keep Windows Sealed** during morning and night temperature inversion hours.\n` +
    `3. **Eliminate Indoor Smoke**: Avoid incense sticks, dhoop, and mosquito coils, which create severe indoor particulate spikes.\n` +
    `4. **Wet Mop** floors instead of dry sweeping to stop settled dust from getting kicked back up.`,
};

/** Picks the reply for the live AQI band and the detected intent. */
export function buildLiveDataReply(intent: ChatIntent, ctx: ReplyContext): string {
  const replies = ctx.aqi <= 100 ? CLEAN_AIR_REPLIES : POLLUTED_AIR_REPLIES;
  return replies[intent](ctx);
}

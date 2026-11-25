import { formatHourInPlaceLocalTime } from '../chat/tools';
import {
  ForecastAdvicePoint,
  ForecastAdviceHousehold,
  ForecastAdviceResult,
  LocalTimeDetails,
  getLocalTimeDetails,
} from './forecast-advice-types';

export type { ForecastAdvicePoint, ForecastAdviceHousehold, ForecastAdviceResult };
export { getLocalTimeDetails };

interface WindowCandidate {
  startIndex: number;
  length: number;
  avgAqi: number;
  startPoint: ForecastAdvicePoint;
  endPoint: ForecastAdvicePoint;
  isTomorrow: boolean;
  startHour: number;
}

/**
 * Builds actionable family advice from future hours in waking periods (6 AM to 10 PM local time).
 */
export function buildForecastAdvice(
  currentAqi: number,
  hourlyForecast: ForecastAdvicePoint[] = [],
  household?: ForecastAdviceHousehold | null,
  timeZone = 'Asia/Kolkata',
  referenceNow: Date = new Date()
): ForecastAdviceResult {
  const nowDetails = getLocalTimeDetails(referenceNow.toISOString(), timeZone);
  // Allow points within the current hour (up to 30 mins past)
  const currentHourFloorMs = referenceNow.getTime() - 30 * 60 * 1000;
  const validPoints = hourlyForecast.filter(
    (p): p is ForecastAdvicePoint & { aqi: number } =>
      typeof p.aqi === 'number' && !isNaN(p.aqi) && new Date(p.dateTime).getTime() >= currentHourFloorMs
  );

  if (validPoints.length === 0) return buildFallbackAdvice(household);

  const candidates = findWakingWindowCandidates(validPoints, timeZone, nowDetails);
  if (candidates.length === 0) return buildFallbackAdvice(household);

  // Pick candidate with lowest average AQI
  candidates.sort((a, b) => a.avgAqi - b.avgAqi);
  const best = candidates[0];

  const startTimeStr = formatHourInPlaceLocalTime(best.startPoint.dateTime, timeZone);
  const endIso = new Date(new Date(best.endPoint.dateTime).getTime() + 3600 * 1000).toISOString();
  const endTimeStr = formatHourInPlaceLocalTime(endIso, timeZone);

  const windowTimeSpan = `${startTimeStr} to ${endTimeStr}`;
  const cleanestWindowText = best.isTomorrow ? `tomorrow ${windowTimeSpan}` : `today ${windowTimeSpan}`;

  const advicePrefix = getAdvicePrefix(currentAqi, startTimeStr, best.isTomorrow, nowDetails.hour, household);
  const adviceCleanestSuffix = best.isTomorrow
    ? `Cleanest window: tomorrow ${windowTimeSpan}.`
    : `Cleanest window today: ${windowTimeSpan}.`;

  return {
    plainAdvice: `${advicePrefix} ${adviceCleanestSuffix}`,
    cleanestWindowText,
    cleanestWindowStart: best.isTomorrow ? `tomorrow ${startTimeStr}` : startTimeStr,
    cleanestWindowEnd: endTimeStr,
    isTomorrow: best.isTomorrow,
    minAqi: Math.round(best.avgAqi),
  };
}

function findWakingWindowCandidates(
  points: (ForecastAdvicePoint & { aqi: number })[],
  timeZone: string,
  nowDetails: LocalTimeDetails
): WindowCandidate[] {
  const candidates: WindowCandidate[] = [];
  const pointDetails = points.map((p) => ({
    point: p,
    local: getLocalTimeDetails(p.dateTime, timeZone),
  }));

  for (let i = 0; i < pointDetails.length; i++) {
    const start = pointDetails[i];
    // Waking hours: 6 AM (6) to 10 PM (22)
    if (start.local.hour < 6 || start.local.hour >= 22) continue;

    const isTomorrow =
      start.local.day !== nowDetails.day ||
      start.local.month !== nowDetails.month ||
      start.local.year !== nowDetails.year;

    // Try a 3-hour or 2-hour window
    for (const winSize of [3, 2]) {
      if (i + winSize <= pointDetails.length) {
        const slice = pointDetails.slice(i, i + winSize);
        const end = slice[slice.length - 1];
        if (end.local.hour <= 21 && end.local.day === start.local.day) {
          const avg = slice.reduce((acc, curr) => acc + curr.point.aqi, 0) / winSize;
          candidates.push({
            startIndex: i,
            length: winSize,
            avgAqi: avg,
            startPoint: start.point,
            endPoint: end.point,
            isTomorrow,
            startHour: start.local.hour,
          });
          break;
        }
      }
    }
  }

  return candidates;
}

function getAdvicePrefix(
  currentAqi: number,
  startTimeStr: string,
  isTomorrow: boolean,
  currentHour: number,
  household?: ForecastAdviceHousehold | null
): string {
  const hasKids = (household?.childrenCount || 0) > 0;
  const hasSeniors = (household?.elderlyCount || 0) > 0;
  const hasResp = Boolean(household?.hasAsthmaOrRespiratoryCondition);
  const doesExercise = Boolean(household?.doesOutdoorExercise);

  if (currentAqi <= 100 && !isTomorrow) {
    return 'Air quality is favorable today.';
  }

  if (isTomorrow || currentHour >= 19 || currentHour < 6) {
    if (hasResp) return 'Keep members with respiratory sensitivity indoors tonight.';
    if (hasKids) return 'Keep the children indoors tonight.';
    if (hasSeniors) return 'Keep seniors indoors tonight.';
    return 'Avoid strenuous outdoor activities tonight.';
  }

  if (hasResp) return `Keep members with respiratory sensitivity indoors until ${startTimeStr}.`;
  if (hasKids) return `Keep the children indoors until ${startTimeStr}.`;
  if (hasSeniors) return `Keep seniors indoors until ${startTimeStr}.`;
  if (doesExercise) return `Shift outdoor exercise to the afternoon after ${startTimeStr}.`;
  return `Avoid strenuous outdoor activities until ${startTimeStr}.`;
}

function buildFallbackAdvice(household?: ForecastAdviceHousehold | null): ForecastAdviceResult {
  const hasKids = (household?.childrenCount || 0) > 0;
  const hasSeniors = (household?.elderlyCount || 0) > 0;
  const hasResp = Boolean(household?.hasAsthmaOrRespiratoryCondition);

  let prefix = 'Avoid strenuous outdoor activities during peak morning smog.';
  if (hasResp) prefix = 'Keep members with respiratory sensitivity indoors during high smog hours.';
  else if (hasKids) prefix = 'Keep the children indoors during peak morning hours.';
  else if (hasSeniors) prefix = 'Keep seniors indoors during peak morning hours.';

  return {
    plainAdvice: `${prefix} Cleanest window today: 1 PM to 4 PM.`,
    cleanestWindowText: 'today 1 PM to 4 PM',
    cleanestWindowStart: '1 PM',
    cleanestWindowEnd: '4 PM',
    isTomorrow: false,
    minAqi: null,
  };
}

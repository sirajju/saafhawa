import { formatHourInPlaceLocalTime } from '../chat/tools';
import {
  type ForecastAdvicePoint,
  type ForecastAdviceHousehold,
  type ForecastAdviceResult,
  getLocalTimeDetails,
} from './forecast-advice-types';
import { findWakingWindowCandidates } from './forecast-window-search';
import { MS_PER_HOUR } from '@/lib/constants';

export type { ForecastAdvicePoint, ForecastAdviceHousehold, ForecastAdviceResult };
export { getLocalTimeDetails };

/**
 * Builds actionable family advice from future hours in waking periods (6 AM to 10 PM local time).
 */
export function buildForecastAdvice(
  currentAqi: number | null | undefined,
  hourlyForecast: ForecastAdvicePoint[] = [],
  household?: ForecastAdviceHousehold | null,
  timeZone = 'Asia/Kolkata',
  referenceNow: Date = new Date()
): ForecastAdviceResult {
  const nowDetails = getLocalTimeDetails(referenceNow.toISOString(), timeZone);
  const currentHourFloorMs = referenceNow.getTime() - 30 * 60 * 1000;
  const validPoints = hourlyForecast.filter(
    (p): p is ForecastAdvicePoint & { aqi: number } =>
      typeof p.aqi === 'number' &&
      !isNaN(p.aqi) &&
      new Date(p.dateTime).getTime() >= currentHourFloorMs
  );

  if (validPoints.length === 0) return buildFallbackAdvice(household);

  const candidates = findWakingWindowCandidates(validPoints, timeZone, nowDetails);
  if (candidates.length === 0) return buildFallbackAdvice(household);

  candidates.sort((a, b) => a.avgAqi - b.avgAqi);
  const best = candidates[0];

  const aqiNum = typeof currentAqi === 'number' && !isNaN(currentAqi) ? currentAqi : null;
  const maxForecastAqi =
    validPoints.length > 0 ? Math.max(...validPoints.map((p) => p.aqi)) : aqiNum;
  const isCurrentlyClean = aqiNum !== null && aqiNum <= 100;
  const staysClean = isCurrentlyClean && maxForecastAqi !== null && maxForecastAqi <= 100;

  if (staysClean && aqiNum !== null) {
    const hasAsthma = Boolean(household?.hasAsthmaOrRespiratoryCondition);
    let plainAdvice = '';
    if (aqiNum <= 50) {
      plainAdvice = 'Air quality is clean and fine for normal outdoor activities.';
    } else if (hasAsthma) {
      plainAdvice =
        'Air quality is satisfactory and fine for normal activity, though sensitive family members with asthma should take it easy during heavy exertion.';
    } else {
      plainAdvice = 'Air quality is satisfactory and fine for normal outdoor activities.';
    }

    return {
      plainAdvice,
      cleanestWindowText: '',
      cleanestWindowStart: '',
      cleanestWindowEnd: '',
      cleanestWindowStartIndex: -1,
      cleanestWindowLength: 0,
      isTomorrow: false,
      minAqi: Math.round(best.avgAqi),
    };
  }

  const startTimeStr = formatHourInPlaceLocalTime(best.startPoint.dateTime, timeZone);
  const endIso = new Date(new Date(best.endPoint.dateTime).getTime() + MS_PER_HOUR).toISOString();
  const endTimeStr = formatHourInPlaceLocalTime(endIso, timeZone);

  const windowTimeSpan = `${startTimeStr} to ${endTimeStr}`;
  const cleanestWindowText = best.isTomorrow
    ? `tomorrow ${windowTimeSpan}`
    : `today ${windowTimeSpan}`;

  const advicePrefix = isCurrentlyClean
    ? 'Air quality is currently favorable, but deteriorates later.'
    : getAdvicePrefix(aqiNum, startTimeStr, best.isTomorrow, nowDetails.hour, household);
  const adviceCleanestSuffix = best.isTomorrow
    ? `Cleanest window: tomorrow ${windowTimeSpan}.`
    : `Cleanest window today: ${windowTimeSpan}.`;

  const forecastStartIndex = hourlyForecast.findIndex(
    (p) => p.dateTime === best.startPoint.dateTime
  );

  return {
    plainAdvice: `${advicePrefix} ${adviceCleanestSuffix}`,
    cleanestWindowText,
    cleanestWindowStart: best.isTomorrow ? `tomorrow ${startTimeStr}` : startTimeStr,
    cleanestWindowEnd: endTimeStr,
    cleanestWindowStartIndex: forecastStartIndex >= 0 ? forecastStartIndex : best.startIndex,
    cleanestWindowLength: best.length,
    isTomorrow: best.isTomorrow,
    minAqi: Math.round(best.avgAqi),
  };
}

function getAdvicePrefix(
  currentAqi: number | null,
  startTimeStr: string,
  isTomorrow: boolean,
  currentHour: number,
  household?: ForecastAdviceHousehold | null
): string {
  const hasKids = (household?.childrenCount || 0) > 0;
  const hasSeniors = (household?.elderlyCount || 0) > 0;
  const hasResp = Boolean(household?.hasAsthmaOrRespiratoryCondition);
  const doesExercise = Boolean(household?.doesOutdoorExercise);

  if (currentAqi !== null && currentAqi <= 100 && !isTomorrow) {
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
    plainAdvice: `${prefix} Cleanest window today: 1\u00A0PM to 4\u00A0PM.`,
    cleanestWindowText: 'today 1\u00A0PM to 4\u00A0PM',
    cleanestWindowStart: '1\u00A0PM',
    cleanestWindowEnd: '4\u00A0PM',
    cleanestWindowStartIndex: 0,
    cleanestWindowLength: 3,
    isTomorrow: false,
    minAqi: null,
  };
}

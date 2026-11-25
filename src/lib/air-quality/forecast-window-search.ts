import {
  ForecastAdvicePoint,
  LocalTimeDetails,
  getLocalTimeDetails,
} from './forecast-advice-types';

export interface WindowCandidate {
  startIndex: number;
  length: number;
  avgAqi: number;
  startPoint: ForecastAdvicePoint;
  endPoint: ForecastAdvicePoint;
  isTomorrow: boolean;
  startHour: number;
}

export function findWakingWindowCandidates(
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

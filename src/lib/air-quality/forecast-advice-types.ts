export interface ForecastAdvicePoint {
  dateTime: string;
  aqi: number | null;
  category?: string | null;
}

export interface ForecastAdviceHousehold {
  childrenCount?: number;
  elderlyCount?: number;
  hasAsthmaOrRespiratoryCondition?: boolean;
  doesOutdoorExercise?: boolean;
}

export interface ForecastAdviceResult {
  plainAdvice: string;
  cleanestWindowText: string;
  cleanestWindowStart: string;
  cleanestWindowEnd: string;
  cleanestWindowStartIndex?: number;
  cleanestWindowLength?: number;
  isTomorrow: boolean;
  minAqi: number | null;
}

export interface LocalTimeDetails {
  hour: number;
  day: number;
  month: number;
  year: number;
  ms: number;
}

export function getLocalTimeDetails(dateTimeIso: string, timeZone: string): LocalTimeDetails {
  const d = new Date(dateTimeIso);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'Asia/Kolkata',
    hour: 'numeric',
    hourCycle: 'h23',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(d);
  let hour = 0;
  let day = 0;
  let month = 0;
  let year = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'year') year = parseInt(p.value, 10);
  }
  return { hour, day, month, year, ms: d.getTime() };
}

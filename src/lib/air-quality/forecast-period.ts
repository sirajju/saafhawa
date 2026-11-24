/**
 * Computes an explicit 24-hour time period starting from the current UTC hour.
 */
export function computeForecastPeriod(hours = 24, fromDate = new Date()): {
  startTime: string;
  endTime: string;
} {
  const start = new Date(
    Date.UTC(
      fromDate.getUTCFullYear(),
      fromDate.getUTCMonth(),
      fromDate.getUTCDate(),
      fromDate.getUTCHours(),
      0,
      0,
      0
    )
  );
  // endTime is inclusive in Google Air Quality API
  const end = new Date(start.getTime() + (hours - 1) * 3600 * 1000);

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

/**
 * Time Zone and Measurement Timestamp Formatting Utilities
 *
 * Ensures air quality timestamps from Open-Meteo and ground stations are safely
 * anchored in real UTC milliseconds before formatting, preventing timezone skew
 * when running in UTC server environments (such as Vercel where process.env.TZ = 'UTC').
 */

/**
 * Calculates the UTC offset in seconds for a given IANA time zone (default Asia/Kolkata).
 * e.g. "Asia/Kolkata" -> +19800 (+5:30), "America/New_York" -> -18000 (-5:00).
 */
export function getTimeZoneOffsetSeconds(timeZone = 'Asia/Kolkata', date = new Date()): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Kolkata',
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (tzPart) {
      const match = tzPart.match(/GMT([+-])(\d{2}):?(\d{2})?/);
      if (match) {
        const sign = match[1] === '+' ? 1 : -1;
        const h = parseInt(match[2], 10);
        const m = match[3] ? parseInt(match[3], 10) : 0;
        return sign * (h * 3600 + m * 60);
      }
    }
  } catch {
    // Unsupported or invalid timeZone
  }
  return 19800; // Asia/Kolkata default (+5:30)
}

/**
 * Converts a raw date-time string into an exact UTC ISO-8601 string ("...Z").
 * If the string already has timezone information ('Z' or offset), it is preserved.
 * If the string lacks timezone information (e.g. Open-Meteo's "2026-11-25T22:30"),
 * it applies the specified timezone offset so it is NOT incorrectly parsed as UTC by
 * runtime servers running in UTC (such as Vercel).
 */
export function parseDateTimeToIso(
  rawTime?: string,
  timeZoneOrOffset: string | number = 'Asia/Kolkata'
): string {
  if (!rawTime) return new Date().toISOString();
  const trimmed = rawTime.trim();
  if (trimmed.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
  }

  const offsetSec =
    typeof timeZoneOrOffset === 'number'
      ? timeZoneOrOffset
      : getTimeZoneOffsetSeconds(timeZoneOrOffset);

  const sign = offsetSec >= 0 ? '+' : '-';
  const absSec = Math.abs(offsetSec);
  const hours = String(Math.floor(absSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((absSec % 3600) / 60)).padStart(2, '0');
  const baseTime = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const isoWithOffset = `${baseTime}${sign}${hours}:${minutes}`;

  const d = new Date(isoWithOffset);
  return !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
}

/**
 * Formats a measurement ISO timestamp in the given time zone (default Asia/Kolkata)
 * into a human-readable local time (e.g. "11:00 pm" or "8:30 am").
 * Safe against UTC server runtimes (Vercel) by ensuring the ISO timestamp is correctly
 * anchored before converting to the target local timezone.
 */
export function formatMeasurementTime(dateTimeIso?: string, timeZone = 'Asia/Kolkata'): string {
  if (!dateTimeIso) return 'Recent';
  try {
    const targetTz = timeZone || 'Asia/Kolkata';
    const iso = parseDateTimeToIso(dateTimeIso, targetTz);
    const d = new Date(iso);
    if (isNaN(d.getTime())) return dateTimeIso;
    return d.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: targetTz,
    });
  } catch {
    return dateTimeIso;
  }
}

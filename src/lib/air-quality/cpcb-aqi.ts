/**
 * Official Indian National Air Quality Index (CPCB) Breakpoints & Sub-Index Calculator.
 *
 * Implements the official piecewise linear interpolation standard defined by the
 * Central Pollution Control Board (CPCB), Ministry of Environment, Forest & Climate Change,
 * Government of India.
 *
 * Reference: CPCB National Air Quality Index report, Annexure I (Breakpoint concentrations for AQI scale 0-500).
 */

export interface CpcbAqiResult {
  aqi: number | null;
  category: 'Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe' | null;
  dominantPollutant: 'pm25' | 'pm10' | null;
  pm25SubIndex: number | null;
  pm10SubIndex: number | null;
}

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 30, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 60, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 90, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 250, cHigh: 380, iLow: 401, iHigh: 500 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 50, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 430, cHigh: 510, iLow: 401, iHigh: 500 },
];

/**
 * Computes sub-index for a single pollutant concentration using CPCB piecewise linear interpolation.
 */
function computeSubIndex(
  concentration: number | null | undefined,
  breakpoints: Breakpoint[]
): number | null {
  if (
    concentration === null ||
    concentration === undefined ||
    isNaN(concentration) ||
    concentration < 0
  ) {
    return null;
  }

  // Handle zero
  if (concentration === 0) {
    return 0;
  }

  // Above highest breakpoint: cap at 500 per CPCB scale
  const maxBreakpoint = breakpoints[breakpoints.length - 1];
  if (concentration >= maxBreakpoint.cHigh) {
    return 500;
  }

  for (const bp of breakpoints) {
    if (concentration > bp.cLow && concentration <= bp.cHigh) {
      const subIndex =
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow;
      return Math.round(subIndex);
    }
  }

  // If concentration is within [0, first.cLow]
  if (concentration <= breakpoints[0].cHigh) {
    const bp = breakpoints[0];
    const subIndex = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * concentration;
    return Math.round(subIndex);
  }

  return 500;
}

/**
 * Maps an AQI numeric score to its official CPCB health category.
 */
export function getCpcbCategory(aqi: number | null): CpcbAqiResult['category'] {
  if (aqi === null || aqi === undefined || isNaN(aqi)) {
    return null;
  }
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

/**
 * Pure function: Computes Indian National AQI (CPCB) and category from PM2.5 and PM10 concentrations.
 *
 * Worst-pollutant rule: Overall AQI = max(I_PM2.5, I_PM10).
 * Dominant pollutant is the one resulting in the higher sub-index.
 *
 * @param pm25 Concentration in µg/m³
 * @param pm10 Concentration in µg/m³
 */
export function calculateCpcbAqi(
  pm25: number | null | undefined,
  pm10: number | null | undefined
): CpcbAqiResult {
  const pm25SubIndex = computeSubIndex(pm25, PM25_BREAKPOINTS);
  const pm10SubIndex = computeSubIndex(pm10, PM10_BREAKPOINTS);

  if (pm25SubIndex === null && pm10SubIndex === null) {
    return {
      aqi: null,
      category: null,
      dominantPollutant: null,
      pm25SubIndex: null,
      pm10SubIndex: null,
    };
  }

  if (pm25SubIndex !== null && pm10SubIndex === null) {
    return {
      aqi: pm25SubIndex,
      category: getCpcbCategory(pm25SubIndex),
      dominantPollutant: 'pm25',
      pm25SubIndex,
      pm10SubIndex: null,
    };
  }

  if (pm25SubIndex === null && pm10SubIndex !== null) {
    return {
      aqi: pm10SubIndex,
      category: getCpcbCategory(pm10SubIndex),
      dominantPollutant: 'pm10',
      pm25SubIndex: null,
      pm10SubIndex,
    };
  }

  // Both are available: overall AQI is the maximum
  const validPm25 = pm25SubIndex as number;
  const validPm10 = pm10SubIndex as number;

  const aqi = Math.max(validPm25, validPm10);
  const dominantPollutant = validPm25 >= validPm10 ? 'pm25' : 'pm10';

  return {
    aqi,
    category: getCpcbCategory(aqi),
    dominantPollutant,
    pm25SubIndex: validPm25,
    pm10SubIndex: validPm10,
  };
}

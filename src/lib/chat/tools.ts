import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { ACTION_CATALOGUE } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { HouseholdProfile, HouseholdProfileSchema } from '../impact/types';
import { getEmissionComparisonText, getExposureComparisonText } from '../impact/comparisons';

export * from './tool-declarations';

export function formatHourInPlaceLocalTime(
  dateTimeIso: string,
  timeZone = 'Asia/Kolkata'
): string {
  try {
    const d = new Date(dateTimeIso);
    return d
      .toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone,
      })
      .replace(':00', '');
  } catch {
    return dateTimeIso;
  }
}

export interface AirQualityToolResult {
  locationName: string;
  isSampleData?: boolean;
  currentAqi: number | null;
  category: string | null;
  dominantPollutant: string | null;
  pm25UgM3: number | null;
  pm10UgM3: number | null;
  forecastHours: Array<{
    hour: string;
    aqi: number | null;
    category: string | null;
    pm25UgM3: number | null;
  }>;
}

export async function executeGetAirQualityTool(
  args: { place?: string },
  defaultPlace: string,
  fetcher: (place: string) => Promise<AirQualityReport> = getAirQualityByLocation
): Promise<AirQualityToolResult> {
  const queryPlace = args.place && args.place.trim().length >= 2 ? args.place.trim() : defaultPlace;
  const report = await fetcher(queryPlace);

  const forecastSummary = (report.hourlyForecast || []).slice(0, 24).map((f) => ({
    hour: formatHourInPlaceLocalTime(f.dateTime),
    aqi: f.aqi,
    category: f.category,
    pm25UgM3: f.pm25 ? f.pm25.value : null,
  }));

  return {
    locationName: report.location.name,
    isSampleData: Boolean(report.isSampleData || report.current.isSampleData),
    currentAqi: report.current.aqi,
    category: report.current.category,
    dominantPollutant: report.current.dominantPollutant,
    pm25UgM3: report.current.pm25 ? report.current.pm25.value : null,
    pm10UgM3: report.current.pm10 ? report.current.pm10.value : null,
    forecastHours: forecastSummary,
  };
}

export interface ImpactToolResult {
  actionId: string;
  actionTitle: string;
  applicable: boolean;
  reasonIfNotApplicable?: string;
  pm25InhaledDoseAvoidedUg: number | null;
  pm25ConcentrationReductionUgM3: number | null;
  percentageDrop: number | null;
  pm25SavedGrams: number;
  co2SavedGrams: number;
  exposureSummaryText: string;
  emissionSummaryText: string;
}

export function executeCalculateImpactTool(
  args: { actionId?: string },
  profile: Partial<HouseholdProfile>,
  currentPm25: number | null
): ImpactToolResult {
  const targetId = (args.actionId || '').trim();
  const actionDef = ACTION_CATALOGUE.find(
    (a) => a.id.toLowerCase() === targetId.toLowerCase()
  );

  if (!actionDef) {
    throw new Error(
      `Unknown action ID "${targetId}". Available IDs include: ${ACTION_CATALOGUE.map((a) => a.id).join(', ')}`
    );
  }

  const validatedProfile = HouseholdProfileSchema.parse(profile);
  const airContext = { currentPm25 };

  const impact = calculateActionImpact(actionDef, validatedProfile, airContext);
  const exposureText = getExposureComparisonText(impact.exposureReduction, actionDef.id);
  const emissionText = getEmissionComparisonText(impact.emissionReduction, actionDef.id);

  return {
    actionId: actionDef.id,
    actionTitle: actionDef.title,
    applicable: impact.applicable,
    reasonIfNotApplicable: impact.reasonIfNotApplicable,
    pm25InhaledDoseAvoidedUg: impact.exposureReduction.pm25InhaledDoseAvoidedUg,
    pm25ConcentrationReductionUgM3: impact.exposureReduction.pm25ConcentrationReductionUgM3,
    percentageDrop: impact.exposureReduction.percentageDrop,
    pm25SavedGrams: impact.emissionReduction.pm25SavedGrams,
    co2SavedGrams: impact.emissionReduction.co2SavedGrams,
    exposureSummaryText: exposureText,
    emissionSummaryText: emissionText,
  };
}

export function executeListActionsTool(args: { category?: string }): Array<{
  id: string;
  title: string;
  category: string;
  description: string;
}> {
  let actions = ACTION_CATALOGUE;
  if (args.category) {
    const norm = args.category.toLowerCase().trim();
    actions = actions.filter((a) => a.category === norm);
  }

  return actions.map((a) => ({
    id: a.id,
    title: a.title,
    category: a.category,
    description: a.description,
  }));
}

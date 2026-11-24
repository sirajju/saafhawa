import { FunctionDeclaration, Type } from '@google/genai';
import { getAirQualityByLocation } from '../air-quality/service';
import { AirQualityReport } from '../air-quality/types';
import { ACTION_CATALOGUE } from '../impact/catalogue';
import { calculateActionImpact } from '../impact/calculator';
import { HouseholdProfile, HouseholdProfileSchema } from '../impact/types';
import { getEmissionComparisonText, getExposureComparisonText } from '../impact/comparisons';

// ============================================================================
// Tool Declarations for Google Gen AI SDK
// ============================================================================

export const AIR_QUALITY_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'getAirQualityAndForecast',
  description:
    'Retrieves the real-time Air Quality Index (AQI), PM2.5, PM10, dominant pollutant, and 24-hour hourly forecast for a place name or pincode. Always call this when the user asks about current conditions, specific hours (e.g. 5 PM), or upcoming forecast.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      place: {
        type: Type.STRING,
        description: 'The location name, landmark, city, or pincode (e.g. "Connaught Place", "110001", "Lahore").',
      },
    },
    required: ['place'],
  },
};

export const CALCULATE_IMPACT_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'calculateActionImpact',
  description:
    'Runs the scientific arithmetic engine to calculate exact PM2.5 inhaled dose avoided (in µg) and emissions saved (PM2.5 and CO2 in grams) for a specific action from the catalogue.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      actionId: {
        type: Type.STRING,
        description:
          'The ID of the action from the catalogue (e.g. "wear_n95_mask_outside", "run_hepa_air_purifier_bedroom", "swap_car_for_metro", "eliminate_incense_and_mosquito_coils", "diy_corsi_rosenthal_box").',
      },
    },
    required: ['actionId'],
  },
};

export const LIST_ACTIONS_TOOL_DECLARATION: FunctionDeclaration = {
  name: 'listCatalogueActions',
  description:
    'Lists the verified clean-air actions available in the SaafHawa catalogue grouped by daily routine, indoor air, and sustainable swaps.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        description:
          'Optional category filter: "daily_routine", "indoor_air", or "sustainable_swaps".',
      },
    },
  },
};

export const CHAT_TOOLS = [
  {
    functionDeclarations: [
      AIR_QUALITY_TOOL_DECLARATION,
      CALCULATE_IMPACT_TOOL_DECLARATION,
      LIST_ACTIONS_TOOL_DECLARATION,
    ],
  },
];

// ============================================================================
// Tool Execution Handlers
// ============================================================================

export interface AirQualityToolResult {
  locationName: string;
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

/**
 * Handler for getAirQualityAndForecast tool.
 */
export async function executeGetAirQualityTool(
  args: { place?: string },
  defaultPlace: string,
  fetcher: (place: string) => Promise<AirQualityReport> = getAirQualityByLocation
): Promise<AirQualityToolResult> {
  const queryPlace = args.place && args.place.trim().length >= 2 ? args.place.trim() : defaultPlace;
  const report = await fetcher(queryPlace);

  const forecastSummary = (report.hourlyForecast || []).slice(0, 24).map((f) => {
    let hourFormatted = f.dateTime;
    try {
      const d = new Date(f.dateTime);
      hourFormatted = d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    } catch {
      // ignore
    }

    return {
      hour: hourFormatted,
      aqi: f.aqi,
      category: f.category,
      pm25UgM3: f.pm25 ? f.pm25.value : null,
    };
  });

  return {
    locationName: report.location.name,
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
  pm25InhaledDoseAvoidedUg: number;
  pm25ConcentrationReductionUgM3: number;
  percentageDrop: number;
  pm25SavedGrams: number;
  co2SavedGrams: number;
  exposureSummaryText: string;
  emissionSummaryText: string;
}

/**
 * Handler for calculateActionImpact tool.
 */
export function executeCalculateImpactTool(
  args: { actionId?: string },
  profile: Partial<HouseholdProfile>,
  currentPm25: number
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

/**
 * Handler for listCatalogueActions tool.
 */
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

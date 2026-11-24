import { FunctionCall } from '@google/genai';
import { AirQualityReport } from '../air-quality/types';
import {
  executeCalculateImpactTool,
  executeGetAirQualityTool,
  executeListActionsTool,
} from './tools';
import { ChatRequest, ExecutedToolRecord } from './types';

export async function executeSingleToolCall(
  fc: FunctionCall,
  request: ChatRequest,
  fetcher: (place: string) => Promise<AirQualityReport>,
  toolsExecuted: ExecutedToolRecord[]
): Promise<Record<string, unknown>> {
  if (fc.name === 'getAirQualityAndForecast') {
    const placeArg =
      typeof fc.args?.place === 'string' && fc.args.place.trim()
        ? fc.args.place.trim()
        : request.place || '110001';
    const airResult = await executeGetAirQualityTool({ place: placeArg }, request.place, fetcher);
    const isSample = Boolean(airResult.isSampleData);
    toolsExecuted.push({
      toolName: fc.name,
      args: (fc.args as Record<string, unknown>) || {},
      resultSummary: isSample
        ? `Retrieved reference sample AQI ${airResult.currentAqi} (${airResult.category}) for ${airResult.locationName}`
        : `Retrieved AQI ${airResult.currentAqi} (${airResult.category}) for ${airResult.locationName}`,
    });
    return airResult as unknown as Record<string, unknown>;
  }

  if (fc.name === 'calculateActionImpact') {
    const actionId =
      typeof fc.args?.actionId === 'string' && fc.args.actionId.trim()
        ? fc.args.actionId.trim()
        : 'wear_n95_mask_outside';
    const targetPlace = request.place || request.householdProfile?.place || '110001';
    let currentPm25: number | null = null;
    let isSample = false;
    try {
      const airReport = await fetcher(targetPlace);
      currentPm25 = airReport.current.pm25?.value ?? null;
      isSample = Boolean(airReport.isSampleData || airReport.current.isSampleData);
    } catch {
      currentPm25 = null;
    }
    const impactResult = executeCalculateImpactTool(
      { actionId },
      request.householdProfile || {},
      currentPm25
    );
    toolsExecuted.push({
      toolName: fc.name,
      args: (fc.args as Record<string, unknown>) || {},
      resultSummary: `Calculated impact for ${impactResult.actionTitle} (${isSample ? 'sample data' : 'measured data'}, PM2.5: ${currentPm25 ?? 'unknown'} µg/m³): ${impactResult.pm25InhaledDoseAvoidedUg ?? 'unknown'} µg dose avoided`,
    });
    return impactResult as unknown as Record<string, unknown>;
  }

  if (fc.name === 'listCatalogueActions') {
    const categoryArg =
      typeof fc.args?.category === 'string' ? fc.args.category : undefined;
    const listResult = executeListActionsTool({ category: categoryArg });
    toolsExecuted.push({
      toolName: fc.name,
      args: (fc.args as Record<string, unknown>) || {},
      resultSummary: `Listed ${listResult.length} catalogue actions`,
    });
    return { actions: listResult };
  }

  return { error: `Unrecognized tool function: ${fc.name}` };
}

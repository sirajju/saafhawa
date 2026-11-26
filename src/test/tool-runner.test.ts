import { describe, it, expect, vi } from 'vitest';
import { executeSingleToolCall } from '@/lib/chat/tool-runner';
import { ChatRequest, ExecutedToolRecord } from '@/lib/chat/types';
import { MOCK_PROFILE } from './plan-fixtures';

describe('Chat Tool Runner Dispatcher', () => {
  const mockFetcher = vi.fn().mockResolvedValue({
    location: { name: 'Delhi', latitude: 28.6, longitude: 77.2, timeZone: 'Asia/Kolkata' },
    current: {
      dateTime: '2026-11-26T10:00:00Z',
      aqi: 180,
      category: 'Moderate',
      dominantPollutant: 'pm25',
      pm25: { value: 75, units: 'µg/m³' },
      pm10: { value: 120, units: 'µg/m³' },
    },
    forecast: [],
  });

  const baseRequest: ChatRequest = {
    message: 'What actions can I take?',
    place: 'Delhi',
    householdProfile: MOCK_PROFILE,
  };

  it('executes getAirQualityAndForecast and records execution', async () => {
    const toolsExecuted: ExecutedToolRecord[] = [];
    const result = await executeSingleToolCall(
      { name: 'getAirQualityAndForecast', args: { place: 'Delhi' } },
      baseRequest,
      mockFetcher,
      toolsExecuted
    );

    expect(result.locationName).toBe('Delhi');
    expect(result.currentAqi).toBe(180);
    expect(toolsExecuted).toHaveLength(1);
    expect(toolsExecuted[0].resultSummary).toContain('Retrieved AQI 180');
  });

  it('executes calculateActionImpact and records execution', async () => {
    const toolsExecuted: ExecutedToolRecord[] = [];
    const result = await executeSingleToolCall(
      { name: 'calculateActionImpact', args: { actionId: 'wear_n95_mask_outside' } },
      baseRequest,
      mockFetcher,
      toolsExecuted
    );

    expect(result.actionTitle).toBeDefined();
    expect(toolsExecuted).toHaveLength(1);
    expect(toolsExecuted[0].resultSummary).toContain('Calculated impact');
  });

  it('executes listCatalogueActions and records execution', async () => {
    const toolsExecuted: ExecutedToolRecord[] = [];
    const result = await executeSingleToolCall(
      { name: 'listCatalogueActions', args: { category: 'commute' } },
      baseRequest,
      mockFetcher,
      toolsExecuted
    );

    expect(Array.isArray(result.actions)).toBe(true);
    expect(toolsExecuted).toHaveLength(1);
    expect(toolsExecuted[0].resultSummary).toContain('Listed');
  });

  it('returns error object for unrecognized tool function', async () => {
    const toolsExecuted: ExecutedToolRecord[] = [];
    const result = await executeSingleToolCall(
      { name: 'nonExistentTool', args: {} },
      baseRequest,
      mockFetcher,
      toolsExecuted
    );

    expect(result.error).toContain('Unrecognized tool function');
    expect(toolsExecuted).toHaveLength(0);
  });
});

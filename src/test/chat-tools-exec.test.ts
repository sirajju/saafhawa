import { describe, it, expect } from 'vitest';
import {
  executeGetAirQualityTool,
  executeCalculateImpactTool,
  executeListActionsTool,
  AIR_QUALITY_TOOL_DECLARATION,
  CALCULATE_IMPACT_TOOL_DECLARATION,
  LIST_ACTIONS_TOOL_DECLARATION,
} from '@/lib/chat/tools';
import { ChatRequestSchema } from '@/lib/chat/types';
import { AdvisoryRequestSchema } from '@/lib/community/types';
import { MOCK_AIR_QUALITY, MOCK_PROFILE } from './chat-fixtures';

describe('Chat Function-Calling Tools', () => {
  describe('executeGetAirQualityTool', () => {
    it('fetches and formats current air quality and 24h hourly forecast', async () => {
      const mockFetcher = async () => MOCK_AIR_QUALITY;
      const result = await executeGetAirQualityTool({ place: 'Noida' }, '110001', mockFetcher);

      expect(result.locationName).toBe('Sector 62, Noida, Uttar Pradesh, India');
      expect(result.currentAqi).toBe(385);
      expect(result.category).toBe('Very Poor');
      expect(result.dominantPollutant).toBe('pm25');
      expect(result.pm25UgM3).toBe(245.5);
      expect(result.pm10UgM3).toBe(390.0);
      expect(result.forecastHours).toHaveLength(2);
      expect(result.forecastHours[0].aqi).toBe(370);
      expect(result.forecastHours[1].aqi).toBe(420);
    });

    it('falls back to defaultPlace if place query is missing or too short', async () => {
      let queriedPlace = '';
      const mockFetcher = async (place: string) => {
        queriedPlace = place;
        return MOCK_AIR_QUALITY;
      };

      await executeGetAirQualityTool({}, 'Delhi 110001', mockFetcher);
      expect(queriedPlace).toBe('Delhi 110001');

      await executeGetAirQualityTool({ place: ' ' }, 'Delhi 110001', mockFetcher);
      expect(queriedPlace).toBe('Delhi 110001');
    });
  });

  describe('executeCalculateImpactTool', () => {
    it('calculates deterministic exposure and emissions metrics for a valid catalogue action', () => {
      const result = executeCalculateImpactTool(
        { actionId: 'wear_n95_mask_outside' },
        MOCK_PROFILE,
        250
      );

      expect(result.actionId).toBe('wear_n95_mask_outside');
      expect(result.applicable).toBe(true);
      expect(result.pm25InhaledDoseAvoidedUg).toBeGreaterThan(0);
      expect(result.percentageDrop).toBeGreaterThan(0);
      expect(result.exposureSummaryText).toBeTruthy();
    });

    it('throws a helpful descriptive error for unknown action IDs', () => {
      expect(() =>
        executeCalculateImpactTool({ actionId: 'invalid_action_xyz' }, MOCK_PROFILE, 250)
      ).toThrowError(/Unknown action ID/);
    });
  });

  describe('executeListActionsTool', () => {
    it('returns all catalogue actions when no category filter is specified', () => {
      const actions = executeListActionsTool({});
      expect(actions.length).toBeGreaterThanOrEqual(18);
      expect(actions.some((a) => a.id === 'wear_n95_mask_outside')).toBe(true);
      expect(actions.some((a) => a.id === 'run_hepa_air_purifier_bedroom')).toBe(true);
    });

    it('filters actions by category correctly', () => {
      const indoorActions = executeListActionsTool({ category: 'indoor_air' });
      expect(indoorActions.length).toBeGreaterThan(0);
      expect(indoorActions.every((a) => a.category === 'indoor_air')).toBe(true);

      const routineActions = executeListActionsTool({ category: 'daily_routine' });
      expect(routineActions.length).toBeGreaterThan(0);
      expect(routineActions.every((a) => a.category === 'daily_routine')).toBe(true);

      const swapActions = executeListActionsTool({ category: 'sustainable_swaps' });
      expect(swapActions.length).toBeGreaterThan(0);
      expect(swapActions.every((a) => a.category === 'sustainable_swaps')).toBe(true);
    });
  });

  describe('Tool Declarations', () => {
    it('has properly structured parameter schemas for Google Gen AI', () => {
      expect(AIR_QUALITY_TOOL_DECLARATION.name).toBe('getAirQualityAndForecast');
      expect(AIR_QUALITY_TOOL_DECLARATION.parameters?.required).toContain('place');

      expect(CALCULATE_IMPACT_TOOL_DECLARATION.name).toBe('calculateActionImpact');
      expect(CALCULATE_IMPACT_TOOL_DECLARATION.parameters?.required).toContain('actionId');

      expect(LIST_ACTIONS_TOOL_DECLARATION.name).toBe('listCatalogueActions');
    });
  });

  describe('Validation Schemas', () => {
    it('accepts valid chat request under 500 characters', () => {
      const valid = ChatRequestSchema.parse({
        message: 'Can my daughter play outside at 5pm today?',
        place: '110001',
      });
      expect(valid.message).toBe('Can my daughter play outside at 5pm today?');
    });

    it('rejects message exceeding 500 characters', () => {
      const longMessage = 'a'.repeat(501);
      expect(() =>
        ChatRequestSchema.parse({
          message: longMessage,
        })
      ).toThrow();
    });

    it('rejects empty or whitespace-only messages', () => {
      expect(() =>
        ChatRequestSchema.parse({
          message: '   ',
        })
      ).toThrow();
    });

    it('accepts valid advisory request for housing society and school group in en and hi', () => {
      const valid1 = AdvisoryRequestSchema.parse({
        place: 'Dwarka Sector 10',
        audience: 'housing_society',
        language: 'en',
      });
      expect(valid1.audience).toBe('housing_society');

      const valid2 = AdvisoryRequestSchema.parse({
        place: 'Dwarka Sector 10',
        audience: 'school_group',
        language: 'hi',
      });
      expect(valid2.language).toBe('hi');
    });

    it('rejects invalid audience or unsupported language', () => {
      expect(() =>
        AdvisoryRequestSchema.parse({
          place: 'Delhi',
          audience: 'corporate_office',
          language: 'en',
        })
      ).toThrow();

      expect(() =>
        AdvisoryRequestSchema.parse({
          place: 'Delhi',
          audience: 'school_group',
          language: 'fr',
        })
      ).toThrow();
    });
  });
});

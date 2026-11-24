import { describe, it, expect } from 'vitest';
import {
  executeGetAirQualityTool,
  executeCalculateImpactTool,
  executeListActionsTool,
  AIR_QUALITY_TOOL_DECLARATION,
  CALCULATE_IMPACT_TOOL_DECLARATION,
  LIST_ACTIONS_TOOL_DECLARATION,
} from '@/lib/chat/tools';
import {
  ChatRequestSchema,
} from '@/lib/chat/types';
import {
  buildChatSystemInstruction,
  handleChatQuery,
} from '@/lib/chat/service';
import {
  SlidingWindowRateLimiter,
  getClientIp,
  chatRateLimiter,
  advisoryRateLimiter,
} from '@/lib/rate-limit';
import {
  AdvisoryRequestSchema,
} from '@/lib/community/types';
import {
  generateCommunityAdvisory,
} from '@/lib/community/advisory-generator';
import { AirQualityReport } from '@/lib/air-quality/types';
import { HouseholdProfile } from '@/lib/impact/types';
import { PlanRequest } from '@/lib/plan/types';
import { NextRequest } from 'next/server';

const MOCK_AIR_QUALITY: AirQualityReport = {
  location: {
    name: 'Sector 62, Noida, Uttar Pradesh, India',
    latitude: 28.62,
    longitude: 77.36,
  },
  current: {
    dateTime: '2026-11-24T10:00:00Z',
    aqi: 385,
    category: 'Very Poor',
    dominantPollutant: 'pm25',
    indexCode: 'ind_cpcb',
    indexDisplayName: 'India National AQI (CPCB)',
    pm25: { value: 245.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
    pm10: { value: 390.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
  },
  hourlyForecast: [
    {
      dateTime: '2026-11-24T11:00:00Z',
      aqi: 370,
      category: 'Very Poor',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: { value: 230.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
      pm10: { value: 375.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
    },
    {
      dateTime: '2026-11-24T17:00:00Z',
      aqi: 420,
      category: 'Severe',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: { value: 310.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
      pm10: { value: 480.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
    },
  ],
};

const MOCK_PROFILE: HouseholdProfile = {
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 1,
  primaryCommuteMode: 'petrol_car',
  dailyCommuteDistanceKm: 20,
  cookingFuel: 'lpg',
  heatingFuel: 'none',
  hasAirPurifier: false,
  hasKitchenChimneyOrExhaust: true,
  usesIncenseOrMosquitoCoils: true,
  hasGardenOrOpenWasteBurning: false,
  windowSealingQuality: 'average',
  dailyOutdoorHoursPerPerson: 2,
  doesOutdoorExercise: false,
  exerciseHoursPerDay: 0,
  homeAreaSqFt: 1100,
  canWorkFromHome: true,
  hasCarpoolOption: true,
};

const MOCK_PLAN_PROFILE: PlanRequest = {
  ...MOCK_PROFILE,
  place: 'Noida',
  hasAsthmaOrRespiratoryCondition: true,
  budget: 'low',
};

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
});

describe('Rate Limiter', () => {
  it('allows requests within limit and rejects once limit is exceeded', () => {
    const limiter = new SlidingWindowRateLimiter(3, 60);
    const testKey = 'test-ip-1';

    // First 3 requests should succeed
    const res1 = limiter.check(testKey);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check(testKey);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check(testKey);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request should fail
    const res4 = limiter.check(testKey);
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.resetSeconds).toBeGreaterThan(0);

    // Reset clears state
    limiter.reset();
    const resAfterReset = limiter.check(testKey);
    expect(resAfterReset.success).toBe(true);
  });

  it('correctly extracts client IP from request headers', () => {
    const reqWithForwarded = new NextRequest('http://localhost:3000/api/chat', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' },
    });
    expect(getClientIp(reqWithForwarded)).toBe('203.0.113.195');

    const reqWithRealIp = new NextRequest('http://localhost:3000/api/chat', {
      headers: { 'x-real-ip': '198.51.100.22' },
    });
    expect(getClientIp(reqWithRealIp)).toBe('198.51.100.22');

    const reqWithNoHeaders = new NextRequest('http://localhost:3000/api/chat');
    expect(getClientIp(reqWithNoHeaders)).toBe('127.0.0.1');
  });

  it('exports singleton rate limiters for chat and advisory', () => {
    expect(chatRateLimiter).toBeDefined();
    expect(advisoryRateLimiter).toBeDefined();
  });
});

describe('Validation Schemas', () => {
  describe('ChatRequestSchema', () => {
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
  });

  describe('AdvisoryRequestSchema', () => {
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

describe('Chat Service & Medical Policy', () => {
  it('builds system instruction containing topic boundaries, zero-hallucination rules, and medical doctor advice', () => {
    const prompt = buildChatSystemInstruction(MOCK_PLAN_PROFILE, 'Noida');

    // Context included
    expect(prompt).toContain('Asthma');
    expect(prompt).toContain('Noida');

    // Strict requirements
    expect(prompt).toContain('TOPIC BOUNDARIES');
    expect(prompt).toContain('NO NUMERICAL GUESSING');
    expect(prompt).toContain('MEDICAL DISCLAIMER');
    expect(prompt).toContain('doctor');
  });

  it('handles medical questions in fallback mode by advising consulting a doctor alongside precautions', async () => {
    const response = await handleChatQuery(
      {
        message: 'My child has a bad cough and difficulty breathing in this smog, what should I do?',
        place: 'Noida',
        householdProfile: MOCK_PLAN_PROFILE,
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined, // triggers fallback
      }
    );

    expect(response.reply).toContain('doctor');
    expect(response.reply).toContain('medical');
    expect(response.reply).toMatch(/(HEPA|inhaler|indoors|sealed)/i);
  });

  it('handles outdoor play timing questions with hourly forecast analysis in fallback mode', async () => {
    const response = await handleChatQuery(
      {
        message: 'Can my daughter play outside at 5pm today?',
        place: 'Noida',
        householdProfile: MOCK_PLAN_PROFILE,
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined, // triggers fallback
      }
    );

    expect(response.reply.length).toBeGreaterThan(50);
    expect(response.toolsExecuted.length).toBeGreaterThan(0);
    expect(response.toolsExecuted[0].toolName).toBe('getAirQualityAndForecast');
  });
});

describe('Community Advisory Generator', () => {
  it('generates English advisory for school group with WhatsApp emojis and bullet points', async () => {
    const advisory = await generateCommunityAdvisory(
      {
        place: 'Sector 62, Noida',
        audience: 'school_group',
        language: 'en',
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined, // triggers template fallback
      }
    );

    expect(advisory.headline).toContain('School');
    expect(advisory.advisoryText).toContain('School & Parent Smog Advisory');
    expect(advisory.advisoryText).toContain('*Current AQI:* 385');
    expect(advisory.advisoryText).toContain('Very Poor');
    expect(advisory.advisoryText).toContain('N95');
    expect(advisory.advisoryText).toContain('1️⃣');
    expect(advisory.advisoryText).toContain('SaafHawa');
  });

  it('generates Hindi advisory for housing society with proper Devnagari WhatsApp formatting', async () => {
    const advisory = await generateCommunityAdvisory(
      {
        place: 'Sector 62, Noida',
        audience: 'housing_society',
        language: 'hi',
      },
      {
        airQualityFetcher: async () => MOCK_AIR_QUALITY,
        apiKey: undefined, // triggers template fallback
      }
    );

    expect(advisory.headline).toContain('आवासीय सोसायटी');
    expect(advisory.advisoryText).toContain('AQI:* 385');
    expect(advisory.advisoryText).toContain('कचरा या सूखे पत्ते बिल्कुल न जलाएं');
    expect(advisory.advisoryText).toContain('N95');
    expect(advisory.advisoryText).toContain('साफ़ हवा');
  });
});

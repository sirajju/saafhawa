import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { createGeminiClient, DEFAULT_GEMINI_API_VERSION } from '@/lib/gemini/client';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { PlanRequest } from '@/lib/plan/types';
import { AirQualityReport } from '@/lib/air-quality/types';

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  const MockGoogleGenAI = vi.fn().mockImplementation(function (
    this: { apiKey?: string; apiVersion?: string; models?: unknown },
    config: { apiKey: string; apiVersion?: string }
  ) {
    this.apiKey = config.apiKey;
    this.apiVersion = config.apiVersion;
    this.models = { generateContent: vi.fn() };
  });
  return {
    ...actual,
    GoogleGenAI: MockGoogleGenAI,
  };
});

const mockProfile: PlanRequest = {
  place: 'New Delhi',
  coordinates: '28.6139, 77.2090',
  adultsCount: 2,
  childrenCount: 0,
  elderlyCount: 0,
  commutersCount: 1,
  hasAsthmaOrRespiratoryCondition: false,
  primaryCommuteMode: 'public_transit',
  dailyCommuteDistanceKm: 15,
  cookingFuel: 'lpg',
  heatingFuel: 'none',
  hasAirPurifier: false,
  hasKitchenChimneyOrExhaust: true,
  usesIncenseOrMosquitoCoils: false,
  hasGardenOrOpenWasteBurning: false,
  windowSealingQuality: 'average',
  dailyOutdoorHoursPerPerson: 1,
  doesOutdoorExercise: false,
  exerciseHoursPerDay: 0,
  homeAreaSqFt: 900,
  canWorkFromHome: true,
  hasCarpoolOption: false,
  budget: 'low',
};

const mockAirQuality: AirQualityReport = {
  location: { name: 'New Delhi', latitude: 28.6139, longitude: 77.209, timeZone: 'Asia/Kolkata' },
  current: {
    aqi: 320,
    category: 'Very Poor',
    indexCode: 'cpcb_aqi',
    indexDisplayName: 'CPCB AQI',
    pm25: { value: 145, units: 'µg/m³' },
    pm10: { value: 210, units: 'µg/m³' },
    dominantPollutant: 'pm25',
    dateTime: '2026-11-26T08:30:00.000Z',
    dataSource: 'Open-Meteo (CAMS model)',
  },
  hourlyForecast: [],
};

describe('Gemini Client Version & Plan Service Logging', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('instantiates GoogleGenAI with apiVersion v1beta behaviorally by default', () => {
    expect(DEFAULT_GEMINI_API_VERSION).toBe('v1beta');

    const client = createGeminiClient('dummy-api-key');
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'dummy-api-key',
      apiVersion: 'v1beta',
    });
    expect((client as unknown as { apiVersion: string }).apiVersion).toBe('v1beta');
  });

  it('honors custom apiVersion option passed to createGeminiClient', () => {
    const client = createGeminiClient('custom-key', { apiVersion: 'v2alpha' });
    expect(GoogleGenAI).toHaveBeenCalledWith({
      apiKey: 'custom-key',
      apiVersion: 'v2alpha',
    });
    expect((client as unknown as { apiVersion: string }).apiVersion).toBe('v2alpha');
  });

  it('plan service logs real error when Gemini generator throws (without exposing API key)', async () => {
    const testSecretKey = 'AIzaSyD-TEST-SECRET-KEY-1234567890';
    const fakeError = new Error(`404 Not Found: models/gemini-flash-lite-latest not found on v1 for key=${testSecretKey}`);

    const failingGenerator = vi.fn().mockRejectedValue(fakeError);

    const plan = await generateHouseholdPlan(mockProfile, {
      apiKey: testSecretKey,
      airQualityFetcher: async () => mockAirQuality,
      geminiGenerator: failingGenerator,
    });

    expect(plan.generationMethod).toBe('rule_based_fallback');
    expect(plan.fallbackReason).toBe('model_error');

    // Verify error was logged to server console
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedCalls = consoleErrorSpy.mock.calls.map((c: unknown[]) => c.join(' '));
    const planServiceLog = loggedCalls.find((call: string) => call.includes('[PlanService]'));

    expect(planServiceLog).toBeTruthy();
    expect(planServiceLog).toContain('404 Not Found');
    // Ensure API key was redacted
    expect(planServiceLog).not.toContain(testSecretKey);
  });

  it('plan service logs when Gemini returns invalid JSON structure', async () => {
    const malformedGenerator = vi.fn().mockResolvedValue('{"not_valid_schema": true}');

    const plan = await generateHouseholdPlan(mockProfile, {
      apiKey: 'test-key',
      airQualityFetcher: async () => mockAirQuality,
      geminiGenerator: malformedGenerator,
    });

    expect(plan.generationMethod).toBe('rule_based_fallback');
    expect(plan.fallbackReason).toBe('model_error');

    const loggedCalls = consoleErrorSpy.mock.calls.map((c: unknown[]) => c.join(' '));
    const planServiceLog = loggedCalls.find((call: string) => call.includes('[PlanService]'));
    expect(planServiceLog).toBeTruthy();
  });
});

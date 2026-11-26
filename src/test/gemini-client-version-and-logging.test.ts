import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createGeminiClient, DEFAULT_GEMINI_API_VERSION } from '@/lib/gemini-client';
import { generateHouseholdPlan } from '@/lib/plan/service';
import { PlanRequest } from '@/lib/plan/types';
import { AirQualityReport } from '@/lib/air-quality/types';

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

  it('creates GoogleGenAI client with apiVersion v1beta by default', () => {
    expect(DEFAULT_GEMINI_API_VERSION).toBe('v1beta');

    const client = createGeminiClient('dummy-api-key');
    expect(client).toBeInstanceOf(GoogleGenAI);
    expect((client as unknown as { apiVersion?: string }).apiVersion).toBe('v1beta');
  });

  it('fails if any client in src/ creates GoogleGenAI without apiVersion v1beta', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const tsFiles: string[] = [];

    function collectFiles(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'test' && entry.name !== '__tests__') {
            collectFiles(fullPath);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          tsFiles.push(fullPath);
        }
      }
    }

    collectFiles(srcDir);

    for (const filePath of tsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('new GoogleGenAI(')) {
        // Only gemini-client.ts should instantiate GoogleGenAI directly
        expect(filePath.replace(/\\/g, '/')).toContain('src/lib/gemini-client.ts');
        expect(content).toContain("apiVersion: options?.apiVersion || DEFAULT_GEMINI_API_VERSION");
      }
    }
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

    expect(planServiceLog).toBeDefined();
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
    expect(planServiceLog).toBeDefined();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { detectIntent, generateFallbackChatResponse } from '@/lib/chat/fallback';
import { MOCK_PROFILE } from '@/test/plan-fixtures';

describe('Chat Fallback Air Quality Guidance', () => {
  it('detects outdoor intent first when air quality report is available for mixed queries', () => {
    // "breathless exercise" contains "breath" (medical) and "exercise" (outdoor)
    expect(detectIntent('breathless exercise', true)).toBe('outdoor');
    expect(detectIntent('breathless exercise', false)).toBe('medical');
  });

  it('does not invent AQI or print undefined when lookup fails', async () => {
    const failingFetcher = vi.fn().mockRejectedValue(new Error('Network lookup failed'));
    const res = await generateFallbackChatResponse(
      {
        message: 'Can my kids play outside today?',
        place: 'UnknownPlaceXYZ',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      failingFetcher
    );

    expect(res.reply).toContain("I couldn't get air quality for this place right now");
    expect(res.reply).not.toContain('250');
    expect(res.reply).not.toContain('Unhealthy');
    expect(res.reply).not.toContain('undefined');
    expect(res.reply).not.toContain('null');
  });

  it('gives medical note first on mixed query when air quality lookup fails', async () => {
    const failingFetcher = vi.fn().mockRejectedValue(new Error('Network lookup failed'));
    const res = await generateFallbackChatResponse(
      {
        message: 'I feel breathless during exercise',
        place: 'UnknownPlaceXYZ',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      failingFetcher
    );

    expect(res.reply).toContain('Health & Medical Note');
    expect(res.reply).toContain('consult a qualified medical doctor');
  });

  it('gives outdoor guidance first on mixed query when air quality report is available', async () => {
    const moderateFetcher = vi.fn().mockResolvedValue({
      location: { name: 'Delhi', latitude: 28.6139, longitude: 77.209 },
      current: {
        dateTime: new Date().toISOString(),
        aqi: 180,
        category: 'Moderate',
        dominantPollutant: 'pm25',
        pm25: { value: 75, units: 'µg/m³' },
        pm10: { value: 120, units: 'µg/m³' },
      },
      hourlyForecast: [],
    });

    const res = await generateFallbackChatResponse(
      {
        message: 'breathless exercise',
        place: 'Delhi',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      moderateFetcher
    );

    expect(res.reply).toContain('The AQI reading for **Delhi** is **180**');
    expect(res.reply).toContain('outdoor activities');
  });

  it('does not recommend N95 mask or staying indoors when AQI is satisfactory', async () => {
    const failingFetcher = vi.fn().mockRejectedValue(new Error('Network lookup failed'));
    const res = await generateFallbackChatResponse(
      {
        message: 'Can my kids play outside today?',
        place: 'UnknownPlaceXYZ',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      failingFetcher
    );

    expect(res.reply).toContain("I couldn't get air quality for this place right now");
    expect(res.reply).not.toContain('250');
    expect(res.reply).not.toContain('Unhealthy');
    expect(res.reply).not.toContain('undefined');
    expect(res.reply).not.toContain('null');
  });

  it('does not recommend N95 mask or staying indoors when AQI is satisfactory', async () => {
    const cleanFetcher = vi.fn().mockResolvedValue({
      location: { name: 'Kozhikode, Kerala', latitude: 11.2551, longitude: 75.8287 },
      current: {
        dateTime: new Date().toISOString(),
        aqi: 54,
        category: 'Satisfactory',
        dominantPollutant: 'pm25',
        pm25: { value: 16, units: 'µg/m³' },
        pm10: { value: 35, units: 'µg/m³' },
      },
      hourlyForecast: [],
    });

    const res = await generateFallbackChatResponse(
      {
        message: 'Can the kids play outside in Kozhikode?',
        place: 'Kozhikode',
        householdProfile: MOCK_PROFILE,
        conversationHistory: [],
      },
      cleanFetcher
    );

    expect(res.reply.toLowerCase()).toContain('satisfactory');
    expect(res.reply.toLowerCase()).not.toContain('not safe');
    expect(res.reply.toLowerCase()).not.toContain('wear an n95 mask');
  });
});

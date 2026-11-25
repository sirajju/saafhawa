import { AirQualityReport } from '@/lib/air-quality/types';
import { PlanRequest } from '@/lib/plan/types';

export const MOCK_AIR_QUALITY: AirQualityReport = {
  location: {
    name: 'Connaught Place, New Delhi, Delhi 110001, India',
    latitude: 28.6315,
    longitude: 77.2167,
    timeZone: 'Asia/Kolkata',
  },
  current: {
    dateTime: '2026-11-23T08:00:00Z',
    aqi: 342,
    category: 'Very Poor',
    dominantPollutant: 'pm25',
    indexCode: 'ind_cpcb',
    indexDisplayName: 'India National AQI (CPCB)',
    pm25: { value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
    pm10: { value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
  },
  hourlyForecast: [
    {
      dateTime: '2026-11-23T09:00:00Z',
      aqi: 350,
      category: 'Very Poor',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'India National AQI (CPCB)',
      pm25: { value: 190.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
      pm10: { value: 330.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
    },
  ],
};

export const MOCK_PROFILE: PlanRequest = {
  place: '110001',
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 1,
  hasAsthmaOrRespiratoryCondition: true,
  primaryCommuteMode: 'petrol_car',
  dailyCommuteDistanceKm: 25,
  commutersCount: 1,
  cookingFuel: 'lpg',
  heatingFuel: 'none',
  hasAirPurifier: false,
  hasKitchenChimneyOrExhaust: false,
  usesIncenseOrMosquitoCoils: true,
  hasGardenOrOpenWasteBurning: false,
  windowSealingQuality: 'average',
  dailyOutdoorHoursPerPerson: 1.5,
  doesOutdoorExercise: false,
  exerciseHoursPerDay: 0,
  homeAreaSqFt: 1000,
  canWorkFromHome: true,
  hasCarpoolOption: true,
  budget: 'low',
};

export const TEST_PROFILE_CAR: PlanRequest = {
  ...MOCK_PROFILE,
  place: 'Connaught Place, New Delhi',
  elderlyCount: 0,
  hasAirPurifier: true,
  hasKitchenChimneyOrExhaust: true,
  homeAreaSqFt: 1200,
  budget: 'moderate',
};

export const TEST_PROFILE_TWO_WHEELER: PlanRequest = {
  ...TEST_PROFILE_CAR,
  primaryCommuteMode: 'two_wheeler',
};

export const MOCK_GEMINI_OUTPUT = JSON.stringify({
  selectedActions: [
    {
      actionId: 'wear_n95_mask_outside',
      suggestedTimeOfDay: 'Morning Commute',
      reason: 'Protects the family and asthma patient from dense outdoor particulate smog.',
    },
    {
      actionId: 'keep_children_indoors_morning_smog',
      suggestedTimeOfDay: 'Morning',
      reason: 'Protects your child from hazardous early morning temperature inversion peaks.',
    },
    {
      actionId: 'diy_corsi_rosenthal_box',
      suggestedTimeOfDay: 'All Day',
      reason: 'An affordable DIY cleaner providing high air filtration without buying expensive purifiers.',
    },
    {
      actionId: 'eliminate_incense_and_mosquito_coils',
      suggestedTimeOfDay: 'All Day',
      reason: 'Avoids heavy indoor particulate accumulation in a home with asthma sufferers.',
    },
    {
      actionId: 'swap_car_for_metro',
      suggestedTimeOfDay: 'Commute Hours',
      reason: 'Replaces daily road traffic with clean electric transit to reduce tailpipe emissions.',
    },
    {
      actionId: 'unknown_hallucinated_action_123',
      suggestedTimeOfDay: 'Afternoon',
      reason: 'This should be ignored.',
    },
    {
      actionId: 'use_exhaust_fan_cooking',
      suggestedTimeOfDay: 'Meal Preparation',
      reason: 'Vents intense cooking and tadka aerosols directly outside.',
    },
  ],
});

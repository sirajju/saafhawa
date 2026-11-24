import { AirQualityReport } from '@/lib/air-quality/types';
import { HouseholdProfile } from '@/lib/impact/types';
import { PlanRequest } from '@/lib/plan/types';

export const MOCK_AIR_QUALITY: AirQualityReport = {
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

export const MOCK_PROFILE: HouseholdProfile = {
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

export const MOCK_PLAN_PROFILE: PlanRequest = {
  ...MOCK_PROFILE,
  place: 'Noida',
  hasAsthmaOrRespiratoryCondition: true,
  budget: 'low',
};

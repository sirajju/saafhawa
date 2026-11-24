import { AirQualityReport } from '@/lib/air-quality/types';
import { PlanRequest } from '@/lib/plan/types';

export const MOCK_AIR_QUALITY: AirQualityReport = {
  location: {
    name: 'Connaught Place, New Delhi, Delhi 110001, India',
    latitude: 28.6315,
    longitude: 77.2167,
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

import { type PlannedAction } from '@/lib/plan/types';
import { type CleanLocation, type CurrentAirQuality } from '@/lib/air-quality/types';

export const MOCK_LOCATION: CleanLocation = {
  name: 'Connaught Place, New Delhi, Delhi 110001, India',
  latitude: 28.6315,
  longitude: 77.2167,
};

export const MOCK_CURRENT: CurrentAirQuality = {
  dateTime: '2026-11-24T10:00:00Z',
  aqi: 342,
  category: 'Very Poor',
  dominantPollutant: 'pm25',
  indexCode: 'ind_cpcb',
  indexDisplayName: 'India National AQI (CPCB)',
  pm25: { value: 185.5, units: 'MICROGRAMS_PER_CUBIC_METER' },
  pm10: { value: 320.0, units: 'MICROGRAMS_PER_CUBIC_METER' },
};

export const MOCK_ACTION: PlannedAction = {
  actionId: 'wear_n95_mask_outside',
  title: 'Wear Certified N95 Mask During Outdoor Commutes',
  description: 'Blocks >= 85% of respirable PM2.5 particles from reaching deep lung tissue.',
  category: 'daily_routine',
  suggestedTimeOfDay: 'Morning Commute',
  reason: 'Protects children and adults during heavy morning temperature inversion.',
  exposureReduction: {
    pm25InhaledDoseAvoidedUg: 157.25,
    pm25ConcentrationReductionUgM3: 176.22,
    percentageDrop: 95.0,
  },
  emissionReduction: {
    pm25SavedGrams: 0,
    co2SavedGrams: 0,
  },
  methodologyNotes: 'US EPA / CDC inhalation rates',
};

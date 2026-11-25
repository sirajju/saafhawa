import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlanDashboard } from '@/components/PlanDashboard';
import { PlanResponse } from '@/lib/plan/types';

describe('Mobile Guidance Visibility and Safe Bottom Padding', () => {
  const mockPlan: PlanResponse = {
    location: {
      name: 'Delhi, DL',
      latitude: 28.6139,
      longitude: 77.209,
      timeZone: 'Asia/Kolkata',
    },
    currentAirQuality: {
      dateTime: '2026-11-25T08:00:00Z',
      aqi: 280,
      category: 'Poor',
      dominantPollutant: 'pm25',
      indexCode: 'ind_cpcb',
      indexDisplayName: 'CPCB AQI',
      pm25: { value: 130, units: 'ug/m3' },
      pm10: { value: 210, units: 'ug/m3' },
      dataSource: 'Open-Meteo (CAMS model)',
    },
    hourlyForecast: [
      {
        dateTime: '2026-11-25T08:00:00Z',
        aqi: 280,
        category: 'Poor',
        dominantPollutant: 'pm25',
        indexCode: 'ind_cpcb',
        indexDisplayName: 'CPCB AQI',
        pm25: { value: 130, units: 'ug/m3' },
        pm10: { value: 210, units: 'ug/m3' },
      },
      {
        dateTime: '2026-11-25T09:00:00Z',
        aqi: 250,
        category: 'Poor',
        dominantPollutant: 'pm25',
        indexCode: 'ind_cpcb',
        indexDisplayName: 'CPCB AQI',
        pm25: { value: 110, units: 'ug/m3' },
        pm10: { value: 190, units: 'ug/m3' },
      },
    ],
    householdProfile: {
      place: '110001',
      adultsCount: 2,
      childrenCount: 0,
      elderlyCount: 0,
      commutersCount: 1,
      hasAsthmaOrRespiratoryCondition: false,
      primaryCommuteMode: 'petrol_car',
      dailyCommuteDistanceKm: 20,
      cookingFuel: 'lpg',
      heatingFuel: 'none',
      hasAirPurifier: false,
      hasKitchenChimneyOrExhaust: false,
      usesIncenseOrMosquitoCoils: false,
      hasGardenOrOpenWasteBurning: false,
      windowSealingQuality: 'average',
      dailyOutdoorHoursPerPerson: 1.5,
      doesOutdoorExercise: false,
      exerciseHoursPerDay: 1,
      homeAreaSqFt: 1000,
      canWorkFromHome: true,
      hasCarpoolOption: true,
      budget: 'low',
    },
    generationMethod: 'gemini',
    actions: [
      {
        actionId: 'action-1',
        title: 'Run Bedroom HEPA Purifier',
        description: 'Keep air clean inside bedrooms while outdoor smog peaks.',
        reason: 'Protects children sleeping in bedroom.',
        suggestedTimeOfDay: 'Any time today',
        category: 'indoor_air',
        exposureReduction: {
          pm25InhaledDoseAvoidedUg: 120,
          pm25ConcentrationReductionUgM3: 50,
          percentageDrop: 70,
        },
        emissionReduction: {
          pm25SavedGrams: 0,
          co2SavedGrams: 0,
        },
      },
    ],
    summary: {
      totalActionsCount: 1,
      totalPm25InhaledDoseAvoidedUg: 120,
      totalPm25EmissionsSavedGrams: 0,
      totalCo2EmissionsSavedGrams: 0,
      totalCo2EmissionsSavedKg: 0,
    },
    isSampleData: false,
  };

  it('renders family guidance prominently with reassuring plain advice', () => {
    render(
      <PlanDashboard
        plan={mockPlan}
        profile={mockPlan.householdProfile}
        currentPlaceName="Delhi, DL"
        onOpenAdvisoryModal={() => {}}
      />
    );

    // Heading for guidance section is present
    expect(screen.getByText(/Today's Air Quality & Family Guidance/i)).toBeTruthy();
    expect(screen.getByText(/Today's Family Guidance:/i)).toBeTruthy();

    // Guidance text is rendered
    expect(screen.getAllByText(/Cleanest window/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders floating Ask Assistant button on mobile layout with distinct z-index', () => {
    render(
      <PlanDashboard
        plan={mockPlan}
        profile={mockPlan.householdProfile}
        currentPlaceName="Delhi, DL"
        onOpenAdvisoryModal={() => {}}
      />
    );

    const askButton = screen.getByRole('button', { name: /Ask SaafHawa Assistant/i });
    expect(askButton).toBeTruthy();
    expect(askButton.closest('div')?.className).toContain('fixed');
    expect(askButton.closest('div')?.className).toContain('bottom-6');
  });
});

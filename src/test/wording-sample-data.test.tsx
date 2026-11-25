import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatMessageList } from '@/components/ChatMessageList';
import { LoadingState } from '@/components/LoadingState';
import { AirQualityCard } from '@/components/AirQualityCard';
import { TotalSavingsBanner } from '@/components/TotalSavingsBanner';
import { getSampleDelhiAirQualityReport } from '@/lib/air-quality/sample-data';

describe('Wording - Strict Neutrality and Absence of "Live" During Sample Data Mode', () => {
  it('renders neutral wording and sample data badge in ChatHeader when isSampleData is true', () => {
    const { container, rerender } = render(<ChatHeader isSampleData={true} />);

    // Must NOT contain the word "live" (case-insensitive) anywhere in rendered content
    const textContent = container.textContent || '';
    expect(textContent.toLowerCase()).not.toContain('live');

    // Must show neutral wording and sample data label
    expect(screen.getByText(/Connected to reference AQI data/i)).toBeTruthy();
    expect(screen.getByText(/Sample Data Mode/i)).toBeTruthy();
    expect(screen.queryByText(/Live Tools Active/i)).toBeNull();
    expect(screen.queryByText(/Connected to live AQI sensors/i)).toBeNull();

    // In live mode (isSampleData: false), it can say "Live Tools Active"
    rerender(<ChatHeader isSampleData={false} />);
    expect(screen.getByText(/Live Tools Active/i)).toBeTruthy();
  });

  it('renders neutral loading message in ChatMessageList when isSampleData is true', () => {
    const ref = { current: null };
    const { container } = render(
      <ChatMessageList
        messages={[]}
        isLoading={true}
        messagesEndRef={ref}
        isSampleData={true}
      />
    );

    const textContent = container.textContent || '';
    expect(textContent.toLowerCase()).not.toContain('live');
    expect(screen.getByText(/Checking forecast & calculating guidance/i)).toBeTruthy();
    expect(screen.queryByText(/Checking live forecast/i)).toBeNull();
  });

  it('renders neutral messages and sample data notice in LoadingState when isSampleData is true', () => {
    const { container } = render(<LoadingState isSampleData={true} />);

    const textContent = container.textContent || '';
    expect(textContent.toLowerCase()).not.toContain('live');
    expect(screen.getByText(/Connecting to reference air quality data/i)).toBeTruthy();
    expect(screen.getByText(/Sample Data Mode/i)).toBeTruthy();
    expect(screen.queryByText(/Connecting to live air quality sensors/i)).toBeNull();
  });

  it('renders neutral wording and visible sample data label in AirQualityCard for sample data', () => {
    const sampleReport = getSampleDelhiAirQualityReport('New Delhi');

    const { container } = render(
      <AirQualityCard
        location={sampleReport.location}
        current={sampleReport.current}
        hourlyForecast={sampleReport.hourlyForecast}
        isSampleData={true}
      />
    );

    const textContent = container.textContent || '';
    expect(textContent.toLowerCase()).not.toContain('live');
    expect(screen.getByText(/Reference Air Quality Overview/i)).toBeTruthy();
    expect(screen.getAllByText(/Sample Data/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Displaying built-in New Delhi reference data/i)).toBeTruthy();
  });

  it('renders the explanatory line on TotalSavingsBanner regarding adjusted overlapping actions', () => {
    const summary = {
      totalActionsCount: 5,
      totalPm25InhaledDoseAvoidedUg: 350,
      totalPm25EmissionsSavedGrams: 1.2,
      totalCo2EmissionsSavedGrams: 4200,
      totalCo2EmissionsSavedKg: 4.2,
    };

    render(<TotalSavingsBanner summary={summary} generationMethod="gemini" />);

    expect(
      screen.getByText(
        /Overlapping actions are adjusted, so the total can be less than the cards added together/i
      )
    ).toBeTruthy();
  });
});

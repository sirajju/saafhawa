import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanDashboard } from '@/components/PlanDashboard';
import { MOCK_PLAN } from './fixtures/mock-plan-data';

describe('Usability Overhaul - Plan Loading, Focus, Timeline & Progress', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-26T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps top of dashboard in view and moves focus to plan heading on load', () => {
    const scrollToMock = vi.fn();
    window.scrollTo = scrollToMock;

    render(
      <PlanDashboard
        plan={MOCK_PLAN}
        profile={MOCK_PLAN.householdProfile}
        currentPlaceName={MOCK_PLAN.location.name}
        onOpenAdvisoryModal={() => {}}
      />
    );

    // Verify window.scrollTo was called to keep top in view
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0, left: 0 })
    );

    // Verify focus moved to the main plan heading
    const heading = screen.getByRole('heading', {
      level: 1,
      name: /Clean Air Action Plan for Connaught Place/i,
    });
    expect(heading).toBeInTheDocument();
    expect(document.activeElement).toBe(heading);
  });

  it('renders daily timeline with actions placed at their suggested time', () => {
    render(
      <PlanDashboard
        plan={MOCK_PLAN}
        profile={MOCK_PLAN.householdProfile}
        currentPlaceName={MOCK_PLAN.location.name}
        onOpenAdvisoryModal={() => {}}
      />
    );

    // Timeline heading
    expect(screen.getByText(/Today's Action Timeline/i)).toBeInTheDocument();

    // Morning slot
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Wear Certified N95 Mask During Outdoor Commutes')).toBeInTheDocument();

    // Night slot
    expect(screen.getByText('Night')).toBeInTheDocument();
    expect(screen.getByText('Run HEPA Air Purifier in Sleeping Area')).toBeInTheDocument();

    // Details toggle
    const detailsButtons = screen.getAllByText('Details');
    expect(detailsButtons.length).toBeGreaterThanOrEqual(2);

    // Reason line is visible
    expect(screen.getByText(/Reduces toxic fine particulate inhalation during transit/i)).toBeInTheDocument();
  });

  it('marks an action as done, persists in localStorage per day, and updates progress counter', async () => {
    const user = userEvent.setup();
    render(
      <PlanDashboard
        plan={MOCK_PLAN}
        profile={MOCK_PLAN.householdProfile}
        currentPlaceName={MOCK_PLAN.location.name}
        onOpenAdvisoryModal={() => {}}
      />
    );

    // Initial progress
    expect(screen.getByText(/0 of 3 done \(0%\)/i)).toBeInTheDocument();

    // Click "Mark as done" on mask action
    const maskDoneBtn = screen.getByRole('button', {
      name: /Mark action "Wear Certified N95 Mask During Outdoor Commutes" as completed/i,
    });
    await user.click(maskDoneBtn);

    // Progress updates to 1 of 3 done (33%)
    expect(screen.getByText(/1 of 3 done \(33%\)/i)).toBeInTheDocument();
    expect(maskDoneBtn.getAttribute('aria-pressed')).toBe('true');

    // Verify saved in localStorage under today's date key
    const today = new Date().toISOString().slice(0, 10);
    const saved = localStorage.getItem(`saafhawa_done_${today}`);
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed).toContain('wear_n95_mask_outside');

    // Click again to unmark
    await user.click(maskDoneBtn);
    expect(screen.getByText(/0 of 3 done \(0%\)/i)).toBeInTheDocument();
  });

  it('renders clean place name without polluting with sample strings', () => {
    render(
      <PlanDashboard
        plan={MOCK_PLAN}
        profile={MOCK_PLAN.householdProfile}
        currentPlaceName={MOCK_PLAN.location.name}
        onOpenAdvisoryModal={() => {}}
      />
    );

    // Real place name is clean
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Connaught Place, New Delhi');
    expect(heading.textContent).not.toContain('(Sample Data');

    // Confirm no sample data notice is present
    const sampleNotice = screen.queryByRole('status', { name: /Sample data mode active notice/i });
    expect(sampleNotice).toBeNull();
  });
});

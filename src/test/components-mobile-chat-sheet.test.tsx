import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanDashboard } from '@/components/PlanDashboard';
import { MOCK_PLAN } from './fixtures/mock-plan-data';

describe('Accessibility - Mobile Chat Sheet Focus Trap & Escape Close', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    window.scrollTo = vi.fn();
  });

  it('traps focus inside mobile chat sheet, closes on Escape, and returns focus to open button', async () => {
    const user = userEvent.setup();
    render(
      <PlanDashboard
        plan={MOCK_PLAN}
        profile={MOCK_PLAN.householdProfile}
        currentPlaceName={MOCK_PLAN.location.name}
      />
    );

    const askButton = screen.getByRole('button', { name: 'Ask SaafHawa Assistant' });
    askButton.focus();
    expect(document.activeElement).toBe(askButton);

    // Open mobile chat sheet
    await user.click(askButton);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Verify heading id is properly bound to aria-labelledby without duplicate IDs
    const headingId = dialog.getAttribute('aria-labelledby');
    expect(headingId).toBeTruthy();
    const matchingHeadings = document.querySelectorAll(`[id="${headingId}"]`);
    expect(matchingHeadings).toHaveLength(1);

    // Wait for the focus trap timer (50ms) to move focus to the first focusable element inside the sheet
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });

    expect(dialog.contains(document.activeElement)).toBe(true);

    // Close on Escape
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(askButton);
  });
});

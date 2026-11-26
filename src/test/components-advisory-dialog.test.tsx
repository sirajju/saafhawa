import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';

function TestWrapper() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        id="trigger-btn"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Open Advisory
      </button>
      <CommunityAdvisoryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        place="New Delhi"
      />
    </div>
  );
}

describe('Accessibility - CommunityAdvisoryModal (Focus Trap & Return Focus)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          place: 'New Delhi',
          audience: 'housing_society',
          language: 'en',
          generatedAt: new Date().toISOString(),
          advisoryText: 'Mock community advisory text for testing.',
        }),
      })
    );
  });

  it('traps focus inside dialog and restores focus to trigger on close', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const trigger = screen.getByRole('button', { name: /Open Advisory/i });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Open modal
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: /Share Smog Advisory/i });
    expect(dialog).toBeInTheDocument();

    // Verify focus entered dialog
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    const closeBtn = screen.getByRole('button', { name: /Close dialog/i });

    // Focus the close button explicitly to test tab cycle
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Tab through elements inside dialog
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Press Escape to close modal
    await user.keyboard('{Escape}');

    // Modal should close and focus should return to trigger button
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('marks Hindi language option with lang="hi"', async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    await user.click(screen.getByRole('button', { name: /Open Advisory/i }));

    const hindiLabel = screen.getByText(/हिंदी/i).closest('[lang="hi"]');
    expect(hindiLabel).toBeInTheDocument();
    expect(hindiLabel?.getAttribute('lang')).toBe('hi');
  });
});

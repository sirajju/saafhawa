import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CommunityAdvisoryModal } from '@/components/CommunityAdvisoryModal';

describe('CommunityAdvisoryModal Place Display', () => {
  it('displays resolved place name instead of raw coordinates in CommunityAdvisoryModal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          headline: 'Advisory',
          advisoryText: 'Clean air advisory text',
          audience: 'housing_society',
          language: 'en',
        }),
      })
    );

    render(
      <CommunityAdvisoryModal
        isOpen
        onClose={() => {}}
        place="11.2551, 75.8287"
        displayPlace="Kozhikode, Kerala"
      />
    );
    await waitFor(() => {
      const el = screen.queryByText(/Kozhikode, Kerala/i);
      expect(Boolean(el)).toBe(true);
    });
    expect(screen.queryByText(/11\.2551/)).toBeNull();
  });
});

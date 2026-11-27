import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewSwitch } from '@/components/ViewSwitch';

describe('ViewSwitch Component', () => {
  it('renders Dashboard and Household buttons with active states inside role="group" div', () => {
    const handleChange = vi.fn();
    render(<ViewSwitch currentView="dash" onChangeView={handleChange} />);

    const group = screen.getByRole('group', { name: 'Switch view' });
    expect(group.tagName.toLowerCase()).toBe('div');

    const dashBtn = screen.getByRole('button', { name: 'Dashboard' });
    const onbBtn = screen.getByRole('button', { name: 'Household' });

    expect(dashBtn).toHaveAttribute('aria-pressed', 'true');
    expect(onbBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('handles click events to switch view', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ViewSwitch currentView="dash" onChangeView={handleChange} />);

    const onbBtn = screen.getByRole('button', { name: 'Household' });
    await user.click(onbBtn);

    expect(handleChange).toHaveBeenCalledWith('onb');
  });

  it('supports standard button keyboard activation via Space or Enter', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ViewSwitch currentView="dash" onChangeView={handleChange} />);

    const onbBtn = screen.getByRole('button', { name: 'Household' });
    onbBtn.focus();
    expect(document.activeElement).toBe(onbBtn);

    await user.keyboard('{Enter}');
    expect(handleChange).toHaveBeenCalledWith('onb');
  });
});

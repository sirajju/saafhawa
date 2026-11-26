import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewSwitch } from '@/components/ViewSwitch';

describe('ViewSwitch Component', () => {
  it('renders Dashboard and Household buttons with active states', () => {
    const handleChange = vi.fn();
    render(<ViewSwitch currentView="dash" onChangeView={handleChange} />);

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

  it('supports arrow key navigation to toggle view', () => {
    const handleChange = vi.fn();
    render(<ViewSwitch currentView="dash" onChangeView={handleChange} />);

    const nav = screen.getByRole('group', { name: 'Switch view' });

    fireEvent.keyDown(nav, { key: 'ArrowRight' });
    expect(handleChange).toHaveBeenCalledWith('onb');

    fireEvent.keyDown(nav, { key: 'ArrowLeft' });
    expect(handleChange).toHaveBeenCalledWith('dash');
  });
});

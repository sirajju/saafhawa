import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '@/components/Navbar';

describe('Navbar Component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders branding, skip-to-content link, and edit place button', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();

    render(<Navbar currentPlace="Connaught Place, Delhi" onEditProfile={handleEdit} />);

    expect(screen.getByText('SaafHawa')).toBeInTheDocument();
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();

    const placeBtn = screen.getByRole('button', { name: /Edit household profile/i });
    expect(placeBtn).toBeInTheDocument();

    await user.click(placeBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });

  it('allows switching themes and persists to localStorage and documentElement', async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const darkBtn = screen.getByRole('button', { name: 'Dark theme' });
    await user.click(darkBtn);

    expect(localStorage.getItem('saafhawa_theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    const lightBtn = screen.getByRole('button', { name: 'Light theme' });
    await user.click(lightBtn);

    expect(localStorage.getItem('saafhawa_theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

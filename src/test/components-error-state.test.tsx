import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from '@/components/ui/ErrorState';

describe('ErrorState Component', () => {
  it('renders alert landmark with error message', () => {
    render(<ErrorState message="Custom network connection failed" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Custom network connection failed')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Unable to Load/i })).toBeInTheDocument();
  });

  it('triggers onRetry and onChangeLocation callbacks on button clicks', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    const handleChangeLocation = vi.fn();

    render(
      <ErrorState
        message="Service unavailable"
        onRetry={handleRetry}
        onChangeLocation={handleChangeLocation}
      />
    );

    const retryBtn = screen.getByRole('button', { name: /Try again/i });
    const locationBtn = screen.getByRole('button', { name: /Change location/i });

    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);

    await user.click(locationBtn);
    expect(handleChangeLocation).toHaveBeenCalledTimes(1);
  });
});

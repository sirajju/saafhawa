import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatPanel } from '@/components/ChatPanel';

describe('Chat Header Data Source and Measurement Time (No "Live Tools Active")', () => {
  it('displays the actual data source and measured time instead of Live Tools Active', () => {
    const { container } = render(
      <ChatHeader
        dataSource="World Air Quality Index (CPCB Station: RK Puram)"
        measuredTime="2026-11-25T10:00:00Z"
        timeZone="Asia/Kolkata"
      />
    );

    // Must never show "Live Tools Active"
    expect(screen.queryByText(/Live Tools Active/i)).toBeNull();

    // Must display the exact data source
    expect(screen.getByText('World Air Quality Index (CPCB Station: RK Puram)')).toBeTruthy();

    // Must display the measurement time in place local time
    expect(screen.getByText(/Measured/i)).toBeTruthy();
    expect(container.textContent?.toLowerCase()).toContain('3:30 pm'); // 10:00 UTC = 15:30 IST
  });

  it('renders default fallback data source cleanly when not specified', () => {
    render(<ChatHeader />);

    expect(screen.queryByText(/Live Tools Active/i)).toBeNull();
    expect(screen.getByText('Open-Meteo (CAMS model)')).toBeTruthy();
  });

  it('forwards data source and measured time through ChatPanel to ChatHeader', () => {
    render(
      <ChatPanel
        place="Delhi"
        dataSource="Google Air Quality API"
        measuredTime="2026-11-25T11:00:00Z"
        timeZone="Asia/Kolkata"
      />
    );

    expect(screen.queryByText(/Live Tools Active/i)).toBeNull();
    expect(screen.getByText('Google Air Quality API')).toBeTruthy();
    expect(screen.getByText(/Measured/i)).toBeTruthy();
  });
});

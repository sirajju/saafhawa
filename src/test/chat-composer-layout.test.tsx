import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ChatPanel } from '@/components/ChatPanel';

describe('Chat Composer Layout', () => {
  it('composer input and form expand to 100% width to fill card', () => {
    const { container } = render(
      <ChatPanel
        place="Delhi"
        dataSource="CPCB Real-time"
        measuredTime="2026-11-25T10:00:00Z"
        timeZone="Asia/Kolkata"
      />
    );

    const form = container.querySelector('form.composer-form') as HTMLFormElement;
    expect(form).toBeInTheDocument();
    expect(form.style.width).toBe('100%');
    expect(form.style.display).toBe('flex');

    const input = container.querySelector('form.composer-form input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.style.width).toBe('100%');
  });
});

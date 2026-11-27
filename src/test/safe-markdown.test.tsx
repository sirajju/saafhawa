import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SafeMarkdown } from '@/components/chat/SafeMarkdown';

describe('SafeMarkdown Component', () => {
  it('renders bold, italics and lists safely without visible asterisks', () => {
    const rawContent =
      '**Recommendation:** Strenuous outdoor play is **not safe** today.\n\n' +
      '• **HEPA Air Purifier:** Running in bedroom reduces PM2.5.\n' +
      '• **Ventilate:** Only during *cleanest* midday window.\n\n' +
      '1. Wear an N95 mask.\n' +
      '2. Seal windows.';

    const { container } = render(<SafeMarkdown content={rawContent} />);

    const strongs = container.querySelectorAll('strong');
    expect(strongs.length).toBeGreaterThanOrEqual(3);
    expect(strongs[0].textContent).toBe('Recommendation:');
    expect(strongs[1].textContent).toBe('not safe');

    const ems = container.querySelectorAll('em');
    expect(ems.length).toBe(1);
    expect(ems[0].textContent).toBe('cleanest');

    expect(container.querySelectorAll('ul li').length).toBe(2);
    expect(container.querySelectorAll('ol li').length).toBe(2);

    expect(container.textContent).not.toContain('**Recommendation:**');
    expect(container.textContent).not.toContain('**not safe**');
  });

  it('safely neutralizes raw HTML tags from input', () => {
    const rawContent = 'Check this <script>alert("xss")</script> and <b>raw html</b>';
    const { container } = render(<SafeMarkdown content={rawContent} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>');
  });
});

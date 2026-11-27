import { describe, it, expect } from 'vitest';
import { withTimeout, capTextLength, MAX_GEMINI_RESPONSE_CHARS } from '@/lib/gemini/utils';

describe('Gemini Timeout and Bounding Utilities', () => {
  it('resolves value when wrapped promise finishes within timeout', async () => {
    const fastPromise = Promise.resolve('gemini result');
    const result = await withTimeout(fastPromise, 1000);
    expect(result).toBe('gemini result');
  });

  it('rejects with descriptive timeout error when promise exceeds duration', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 200));
    await expect(withTimeout(slowPromise, 50, 'Gemini Chat')).rejects.toThrow(
      'Gemini Chat request timed out after 50ms'
    );
  });

  it('caps string length to specified threshold and handles edge cases', () => {
    expect(capTextLength(null)).toBe('');
    expect(capTextLength(undefined)).toBe('');
    expect(capTextLength('short text', 100)).toBe('short text');

    const longText = 'a'.repeat(5000);
    const capped = capTextLength(longText, MAX_GEMINI_RESPONSE_CHARS);
    expect(capped.length).toBe(MAX_GEMINI_RESPONSE_CHARS);
  });
});

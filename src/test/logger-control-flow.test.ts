import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isNextControlFlowError, logServerError, logServerWarning } from '@/lib/logger';

describe('Logger - Next.js Internal Control-Flow Error Handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('identifies Next.js prerender bailout errors as control-flow errors', () => {
    // Next.js digest: NEXT_PRERENDER_INTERRUPTED
    const prerenderInterrupted = new Error(
      'Route /api/air-quality needs to bail out of prerendering at this point because it used request.headers.'
    );
    (prerenderInterrupted as unknown as { digest: string }).digest = 'NEXT_PRERENDER_INTERRUPTED';

    expect(isNextControlFlowError(prerenderInterrupted)).toBe(true);

    // Prerender bailout by message alone
    const bailoutMessageError = new Error(
      'Route /api/air-quality needs to bail out of prerendering at this point because it used request.headers.'
    );
    expect(isNextControlFlowError(bailoutMessageError)).toBe(true);
  });

  it('identifies Next.js dynamic server usage, redirects, and notFound as control-flow errors', () => {
    const dynamicUsage = new Error('Dynamic server usage: headers');
    (dynamicUsage as unknown as { digest: string }).digest = 'DYNAMIC_SERVER_USAGE';
    expect(isNextControlFlowError(dynamicUsage)).toBe(true);

    const redirectError = new Error('NEXT_REDIRECT');
    (redirectError as unknown as { digest: string }).digest = 'NEXT_REDIRECT;replace;/login;307;';
    expect(isNextControlFlowError(redirectError)).toBe(true);

    const notFoundError = new Error('NEXT_NOT_FOUND');
    (notFoundError as unknown as { digest: string }).digest = 'NEXT_NOT_FOUND';
    expect(isNextControlFlowError(notFoundError)).toBe(true);
  });

  it('returns false for normal application or network errors', () => {
    const dbError = new Error('Connection refused to database on port 5432');
    expect(isNextControlFlowError(dbError)).toBe(false);

    const typeError = new TypeError('Cannot read properties of undefined');
    expect(isNextControlFlowError(typeError)).toBe(false);

    expect(isNextControlFlowError('random string error')).toBe(false);
    expect(isNextControlFlowError(null)).toBe(false);
  });

  it('suppresses console.error when logServerError is passed a Next.js control-flow error', () => {
    const prerenderErr = new Error(
      'Route /api/air-quality needs to bail out of prerendering at this point because it used request.headers.'
    );
    (prerenderErr as unknown as { digest: string }).digest = 'NEXT_PRERENDER_INTERRUPTED';

    logServerError('API:air-quality', prerenderErr);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs and sanitizes standard server exceptions with sensitive keys redacted', () => {
    const appError = new Error('Failed to query service for AIzaSyD-1234567890abcdefghijklmnopqrstuvw with token=secretToken123');

    logServerError('TestContext', appError);

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = consoleErrorSpy.mock.calls[0].join(' ');
    expect(loggedMessage).toContain('[TestContext]');
    expect(loggedMessage).toContain('[REDACTED_KEY]');
    expect(loggedMessage).toContain('token=[REDACTED]');
    expect(loggedMessage).not.toContain('AIzaSyD-1234567890abcdefghijklmnopqrstuvw');
    expect(loggedMessage).not.toContain('secretToken123');
  });

  it('logs and sanitizes server warnings via logServerWarning with secrets redacted', () => {
    logServerWarning('Executor', 'Model failed with key=secretApiKeyVal');
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const logged = consoleWarnSpy.mock.calls[0].join(' ');
    expect(logged).toContain('[Executor]');
    expect(logged).toContain('key=[REDACTED]');
    expect(logged).not.toContain('secretApiKeyVal');
  });
});

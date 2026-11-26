/**
 * Checks whether an error is a Next.js internal control-flow exception
 * (e.g., dynamic prerender bailout, redirect, notFound, dynamic server usage).
 * These must never be logged as server errors and should be allowed to propagate.
 */
export function isNextControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  // Next.js sets a `digest` property for internal control-flow errors
  if ('digest' in error && typeof (error as { digest?: unknown }).digest === 'string') {
    const digest = (error as { digest: string }).digest;
    if (
      digest.startsWith('NEXT_') ||
      digest === 'DYNAMIC_SERVER_USAGE' ||
      digest === 'BAILOUT_TO_CLIENT_SIDE_RENDERING'
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    if (
      error.message.includes('needs to bail out of prerendering') ||
      error.message.includes('Dynamic server usage:') ||
      error.message.includes('Bail out to client-side rendering')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Safe server-side error logger that redacts API keys and secrets.
 * Next.js internal control-flow errors are ignored to prevent noisy build prerender logs.
 */
export function logServerError(context: string, error: unknown, apiKey?: string): void {
  if (isNextControlFlowError(error)) {
    return;
  }

  let rawMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (apiKey && apiKey.length > 5) {
    rawMsg = rawMsg.replaceAll(apiKey, '[REDACTED_API_KEY]');
  }
  // Redact any query param keys, bearer tokens, or Google API keys (AIza...)
  const sanitized = rawMsg
    .replace(/(key|token|apiKey|secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');

  console.error(`[${context}]`, sanitized);
}

/**
 * Safe server-side warning logger that redacts API keys and secrets.
 */
export function logServerWarning(context: string, message: string, apiKey?: string): void {
  let rawMsg = message;
  if (apiKey && apiKey.length > 5) {
    rawMsg = rawMsg.replaceAll(apiKey, '[REDACTED_API_KEY]');
  }
  const sanitized = rawMsg
    .replace(/(key|token|apiKey|secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');

  console.warn(`[${context}]`, sanitized);
}

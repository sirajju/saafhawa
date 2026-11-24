/**
 * Safe server-side error logger that redacts API keys and secrets.
 */
export function logServerError(context: string, error: unknown): void {
  const rawMsg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  // Redact any query param keys, bearer tokens, or Google API keys (AIza...)
  const sanitized = rawMsg
    .replace(/(key|token|apiKey|secret)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');

  console.error(`[${context}]`, sanitized);
}

import { ProviderUnavailableError } from './types';

export const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export interface ClientRequestOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Executes a fetch request with timeout and translates network/quota errors into domain errors.
 */
export async function safeFetch(
  url: string,
  init: RequestInit,
  options: ClientRequestOptions = {}
): Promise<Response> {
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('Request timed out'));
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('timed out'))) {
      throw new ProviderUnavailableError('Air quality service request timed out. Please try again shortly.');
    }
    throw new ProviderUnavailableError('Unable to connect to air quality provider. Please check your connection.');
  } finally {
    clearTimeout(timeoutId);
  }
}

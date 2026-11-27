import '@testing-library/jest-dom/vitest';

// Unit tests must never reach the network. Tests that need fetch mock it explicitly
// (vi.spyOn(globalThis, 'fetch') or vi.stubGlobal('fetch', ...)); anything else fails loudly.
globalThis.fetch = (input: RequestInfo | URL): Promise<Response> => {
  const url = input instanceof Request ? input.url : String(input);
  return Promise.reject(new Error(`Unmocked network call in unit test: ${url}`));
};

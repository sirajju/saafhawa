import { defineConfig } from 'vitest/config';

// Live network suite (npm run test:live). Runs in plain Node with real fetch:
// it deliberately skips src/test/setup.ts, which blocks network calls in unit tests.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    include: ['src/test/air-quality-live-cities.test.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
  },
});

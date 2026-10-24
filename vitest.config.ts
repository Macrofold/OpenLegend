import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Real database and geometry-heavy files compete with one another's deadlines.
    // Keep files serial; concurrency exercised within each specimen stays intact.
    maxWorkers: 1,
    testTimeout: 15_000,
    restoreMocks: true,
  },
});

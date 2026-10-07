import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { attemptDirectory, profileDirectory, repository } from './paths.mjs';

const require = createRequire(repository + '/package.json');
const { defineConfig } = require('@playwright/test');
const { default: base } = await import(pathToFileURL(repository + '/playwright.config.ts').href);
// CI installs the pinned Playwright Chromium. Browser, launch arguments,
// viewport, timeout and all other ordinary use options come from the repository.
if (base.timeout !== 60_000 || base.workers !== 1 || base.fullyParallel !== false)
  throw new Error('The approved Time configuration has changed.');

export default defineConfig({
  ...base,
  testDir: profileDirectory,
  testMatch: '**/time-profile.spec.mjs',
  outputDir: attemptDirectory + '/playwright',
  retries: 0,
  reporter: [['list'], ['json', { outputFile: attemptDirectory + '/playwright-result.json' }]],
  use: {
    ...base.use,
    // retain-on-failure already records; preserve a diagnostic pass's trace too.
    trace: 'on',
  },
});

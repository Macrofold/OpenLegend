import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';

export default defineConfig({
  ...baseline,
  testDir: './scripts',
  testMatch: [
    'ui-completion-composed.spec.ts',
    'ui-completion-editor.spec.ts',
    'ui-completion-ownership.spec.ts',
    'ui-completion-zoom.spec.ts',
  ],
});

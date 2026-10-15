import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';

export default defineConfig({
  ...baseline,
  testDir: './scripts',
  testMatch: [
    'ui-completion-recovery.spec.ts',
    'ui-completion-journal.spec.ts',
    'ui-completion-composed.spec.ts',
    'ui-completion-creation.spec.ts',
  ],
});

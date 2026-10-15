import { defineConfig } from '@playwright/test';
import baseline from './playwright.config';

export default defineConfig({
  ...baseline,
  testDir: './scripts',
  testMatch: 'ui-completion-owner.spec.ts',
});

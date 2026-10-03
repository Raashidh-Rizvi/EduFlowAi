import { defineConfig, devices } from '@playwright/test';

// Explicitly run against already-started services. No intercepted auth requests or demo shortcuts.
export default defineConfig({
  testDir: './e2e', testMatch: 'auth-live.spec.js', workers: 1, retries: 0,
  timeout: 60000, expect: { timeout: 10000 }, reporter: 'list',
  outputDir: 'test-results/auth-live',
  use: { baseURL: 'http://localhost:2174', ...devices['Desktop Chrome'], channel: process.env.P0_BROWSER_CHANNEL },
});

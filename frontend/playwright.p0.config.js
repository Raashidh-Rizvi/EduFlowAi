import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '02-auth.spec.js',
  timeout: 20000,
  expect: { timeout: 7000 },
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/p0',
  use: { baseURL: 'http://127.0.0.1:2176', ...devices['Desktop Chrome'], channel: process.env.P0_BROWSER_CHANNEL },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 2176 --strictPort',
    url: 'http://127.0.0.1:2176',
    reuseExistingServer: false,
    env: { VITE_API_BASE_URL: 'http://127.0.0.1:59999/api' },
  },
});

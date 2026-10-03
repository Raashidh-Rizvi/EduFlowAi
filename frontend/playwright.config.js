import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // 02-auth pins the app to its own stub origin (127.0.0.1:59999) via a
  // dedicated webServer, so it must run under playwright.p0.config.js only:
  // `npm run test:e2e:p0`. Running it here against the real backend breaks
  // its mock contract.
  testIgnore: '**/02-auth.spec.js',
  timeout: 45 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:2174',
    trace: 'on-first-retry',
    screenshot: 'on',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

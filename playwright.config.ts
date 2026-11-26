import { defineConfig } from '@playwright/test';

const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  // Start the built preview automatically so CI and local `npx playwright test`
  // work without a manually started server.
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});

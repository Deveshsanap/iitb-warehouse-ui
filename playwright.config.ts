import { defineConfig, devices } from '@playwright/test'

// Playwright config. The evaluator starts the UI and API itself, so
// there is NO webServer here.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_FILE }],
  ],
  use: {
    baseURL:
      process.env.UI_BASE_URL ||
      process.env.BASE_URL ||
      'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

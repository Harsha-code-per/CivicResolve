import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-retry',
    // Axe samples colours mid-transition otherwise; the app honours reduced motion.
    reducedMotion: 'reduce',
  },
  webServer: {
    command:
      'npm run build && PORT=8080 ADMIN_PASSCODE=civic-admin-2026 SESSION_SECRET=e2e-test-session-secret-key-32chars node dist/server/server/index.js',
    url: 'http://127.0.0.1:8080/healthz',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop-chrome-light',
      use: { ...devices['Desktop Chrome'], colorScheme: 'light' },
    },
    {
      name: 'desktop-chrome-dark',
      use: { ...devices['Desktop Chrome'], colorScheme: 'dark' },
    },
    {
      name: 'mobile-pixel7',
      use: { ...devices['Pixel 7'], colorScheme: 'light' },
    },
  ],
});

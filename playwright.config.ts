import { defineConfig, devices } from '@playwright/test';
import { siteBase } from './apps/web/site.config.ts';

const channel = process.env['BROWSER_CHANNEL'];

export default defineConfig({
  testDir: './tests/browser',
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:4173${siteBase}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    url: `http://127.0.0.1:4173${siteBase}`,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
    {
      name: 'chromium-portrait',
      use: { ...devices['Pixel 7'], ...(channel ? { channel } : {}) },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-portrait',
      use: { ...devices['iPhone 13'] },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

// Keep both Playwright's browser and the assistant's isolated browser inside this workspace.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= '.playwright-browsers';
const systemBrowserChannel = process.env.PLAYWRIGHT_CHANNEL;
const previewMode = process.env.PLAYWRIGHT_PREVIEW === 'true';
const previewPort = Number(process.env.PLAYWRIGHT_PREVIEW_PORT ?? '4173');
const previewBase = `http://127.0.0.1:${previewPort}`;
const previewEnvironment = {
  PLAYWRIGHT_BROWSERS_PATH: '.playwright-browsers',
  DEMO_MODE: 'true',
  PORT: '3001',
  ...(previewMode ? { PLAYWRIGHT_PREVIEW_ORIGIN: previewBase } : {}),
  ...(systemBrowserChannel === 'msedge' ? { PLAYWRIGHT_BROWSER_CHANNEL: 'msedge' } : {}),
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  use: {
    baseURL: previewMode ? previewBase : 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    ...(systemBrowserChannel === 'msedge' || systemBrowserChannel === 'chrome' ? { channel: systemBrowserChannel } : {}),
    ...devices['Desktop Chrome'],
  },
  webServer: previewMode ? [
    {
      command: `npm exec -- vite preview --host 127.0.0.1 --port ${previewPort} --strictPort`,
      url: previewBase,
      reuseExistingServer: false,
      timeout: 30_000,
      env: previewEnvironment,
    },
    {
      command: 'npm exec -- tsx tests/e2e/preview-server.ts',
      url: 'http://127.0.0.1:3001/api/health',
      reuseExistingServer: false,
      timeout: 30_000,
      env: previewEnvironment,
    },
  ] : {
    command: 'npm run dev',
    // Wait for the transformed app entry, not just index.html, which can be
    // served while Vite is still scanning and prebundling dependencies.
    url: 'http://127.0.0.1:5173/src/main.tsx',
    reuseExistingServer: false,
    timeout: 120_000,
    // Do not inherit real provider settings from an existing .env file.
    env: previewEnvironment,
  },
});

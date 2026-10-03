const { defineConfig } = require('@playwright/test');

const live = process.env.FWH_LIVE_TEST === '1';
if (live) {
  if (!process.env.FWH_LIVE_URL || !/^[0-9a-f]{40}$/.test(process.env.EXPECTED_REVISION || '')) {
    throw new Error('Live checks require FWH_LIVE_URL and a full EXPECTED_REVISION.');
  }
  const url = new URL(process.env.FWH_LIVE_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('FWH_LIVE_URL must be an HTTPS origin without credentials, a path, or a query.');
  }
  // Disable failure snapshots as well as trace/screenshot/video capture below.
  process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
}

const projects = [
  { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
];
if (!live) projects.push({ name: 'small-mobile', use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } });

module.exports = defineConfig({
  testDir: './tests',
  testMatch: live ? 'live.spec.js' : 'browser.spec.js',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: live ? 1 : 0,
  workers: live ? 1 : (process.env.CI ? 2 : undefined),
  timeout: live ? 180_000 : 60_000,
  globalTimeout: live ? 600_000 : 300_000,
  expect: { timeout: live ? 30_000 : 10_000 },
  reporter: live ? [['list']] : [['list'], ['html', { open: 'never' }]],
  preserveOutput: live ? 'never' : 'failures-only',
  use: {
    baseURL: live ? process.env.FWH_LIVE_URL : 'http://127.0.0.1:4173',
    browserName: 'chromium',
    trace: live ? 'off' : 'retain-on-failure',
    screenshot: live ? 'off' : 'only-on-failure',
    video: 'off',
    actionTimeout: live ? 30_000 : 10_000,
    navigationTimeout: live ? 90_000 : 30_000,
  },
  projects,
  webServer: live ? undefined : {
    command: 'python3 build.py --revision 0123456789abcdef0123456789abcdef01234567 && python3 tests/server.py',
    url: 'http://127.0.0.1:4173/',
    timeout: 30_000,
    reuseExistingServer: false,
  },
});

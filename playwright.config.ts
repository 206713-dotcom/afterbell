import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://localhost:3100",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- --port 3100",
    url: "http://localhost:3100",
    env: { AFTERBELL_LOCAL_DATA: "browser-tests" },
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3101";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 300_000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 30_000,
    navigationTimeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node scripts/serve-examples.mjs",
      url: "http://localhost:3199/external-site.html",
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});

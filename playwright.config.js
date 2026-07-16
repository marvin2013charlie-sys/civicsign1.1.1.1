// @ts-check
const { defineConfig, devices } = require("@playwright/test");

const frontendUrl = process.env.E2E_FRONTEND_URL || "http://localhost:3000";
const backendUrl = process.env.E2E_BACKEND_URL || "http://localhost:8001";

module.exports = defineConfig({
  testDir: "./e2e",
  globalSetup: require.resolve("./e2e/global-setup"),
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: frontendUrl,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  metadata: {
    backendUrl,
  },
});
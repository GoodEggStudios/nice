import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/visual",
  outputDir: "test-results/visual",
  snapshotPathTemplate: "{testDir}/screenshots/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["github"],
        ["junit", { outputFile: "test-results/visual.xml" }],
      ]
    : "list",
  use: {
    ...devices["Desktop Chrome"],
    browserName: "chromium",
    timezoneId: "UTC",
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 720 },
  },
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      maxDiffPixelRatio: 0.1,
    },
  },
});

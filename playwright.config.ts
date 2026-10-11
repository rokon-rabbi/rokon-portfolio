import { defineConfig } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";

const availability = "docs/responsive-qa/browser-availability.json";
const engines: string[] = process.env.QA_BROWSER_ENGINES
  ? process.env.QA_BROWSER_ENGINES.split(",")
  : existsSync(availability)
    ? JSON.parse(readFileSync(availability, "utf8"))
        .results.filter((result: { available: boolean }) => result.available)
        .map((result: { name: string }) => result.name)
    : ["chromium", "firefox", "webkit"];
const projects = engines.map((engine) => ({
  name: engine,
  use: { browserName: engine as "chromium" | "firefox" | "webkit" },
}));
if (engines.includes("chromium"))
  projects.push({
    name: "touch-chromium",
    use: {
      browserName: "chromium",
      ...{ isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  });
if (engines.includes("webkit"))
  projects.push({
    name: "touch-webkit",
    use: {
      browserName: "webkit",
      ...{ isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  });

export default defineConfig({
  testDir: "./tests/playwright",
  timeout: 90_000,
  expect: { timeout: 8_000 },
  workers: 2,
  fullyParallel: true,
  retries: 0,
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          process.env.QA_PLAYWRIGHT_REPORT ||
          "docs/responsive-qa/playwright-results.json",
      },
    ],
  ],
  outputDir: "test-results/responsive",
  use: {
    ignoreHTTPSErrors: process.env.QA_IGNORE_HTTPS_ERRORS === "true",
    baseURL: process.env.QA_ORIGIN || "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  projects,
});

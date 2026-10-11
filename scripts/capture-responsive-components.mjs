import { chromium, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
const dir = "docs/responsive-qa/screenshots";
mkdirSync(dir, { recursive: true });
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4176";
const server = process.env.QA_ORIGIN
  ? undefined
  : spawn("node", ["scripts/serve-production.mjs"], {
      env: { ...process.env, QA_PORT: "4176" },
      stdio: "ignore",
    });
let browser;
try {
  for (let n = 0; n < 50; n++) {
    if (server && server.exitCode !== null)
      throw new Error("Component capture server exited");
    if (await fetch(origin).catch(() => null)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  for (const theme of ["light", "dark"]) {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/design-system`);
      await page.evaluate((mode) => {
        localStorage.setItem("theme", mode);
      }, theme);
      await page.reload();
      for (const [name, selector] of [
        ["controls", "controls-heading"],
        ["inputs", "forms-heading"],
      ]) {
        const section = page.locator(`section[aria-labelledby='${selector}']`);
        await section.scrollIntoViewIfNeeded();
        for (const island of await page.locator("astro-island").all())
          await island.scrollIntoViewIfNeeded();
        await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
        await section.screenshot({
          path: `${dir}/gallery-${name}-${theme}-${width}.png`,
        });
      }
    }
  }
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}

import { chromium, firefox, webkit } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  let browser;
  try {
    browser = await engine.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent("<h1>Browser probe</h1>");
    results.push({
      name,
      available: true,
      version: browser.version(),
      executable: engine.executablePath(),
    });
  } catch (error) {
    results.push({
      name,
      available: false,
      reason: String(error).slice(0, 3500),
    });
  } finally {
    await browser?.close();
  }
}
mkdirSync("docs/responsive-qa", { recursive: true });
writeFileSync(
  "docs/responsive-qa/browser-availability.json",
  JSON.stringify({ platform: process.platform, results }, null, 2) + "\n",
);
console.log(JSON.stringify(results, null, 2));

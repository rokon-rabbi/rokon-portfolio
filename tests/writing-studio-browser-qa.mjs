import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { compile } from "@mdx-js/mdx";

const path = readFileSync("src/data/writing-studio.ts", "utf8").match(/"(\/write-[a-f0-9]+)"/)[1];
const key = "rokon-writing-drafts-v1";
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4181";
const server = process.env.QA_ORIGIN ? undefined : spawn("node", ["scripts/serve-production.mjs"], {
  env: { ...process.env, QA_PORT: "4181" }, stdio: "ignore",
});
let browser;
const errors = [];
const body = "A practical opening paragraph.\n\n## What changed\n\nThe **first fix** made the page readable.\n\n```js\nconst message = 'A deliberately long line that stays inside the code frame on a phone, without widening the whole document.';\n```\n\n| Problem | Change |\n| --- | --- |\n| Missing file | Install the locked dependencies |";
const title = 'A morning bug: a "small" fix';
async function watch(context) {
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(origin + path);
  await expect(page.locator("#studio-post-title")).toBeEnabled();
  return page;
}
async function details(page) {
  if (await page.locator(".studio-details").getAttribute("open") === null) {
    await page.locator(".studio-details summary").click();
  }
}
async function more(page) {
  if (await page.locator(".studio-more").getAttribute("open") === null) {
    await page.locator(".studio-more summary").click();
  }
}
async function fill(page) {
  await page.locator("#studio-post-title").fill(title);
  await page.locator("#studio-description").fill("What broke, what changed, and what to check next.");
  await details(page);
  await page.locator("#studio-tags").fill("debugging, frontend");
  await page.locator("#studio-slug").fill("a-morning-bug");
  await page.locator("#studio-date").fill("2026-10-12");
  await page.locator("#studio-body").fill(body);
  await page.locator("[data-save-draft]").click();
}
async function readDownload(page, selector) {
  const download = page.waitForEvent("download");
  await page.locator(selector).click();
  const result = await download;
  return { name: result.suggestedFilename(), text: readFileSync(await result.path(), "utf8") };
}

try {
  for (let n = 0; n < 50; n++) {
    if (server && server.exitCode !== null) throw new Error("Preview server exited");
    if (await fetch(origin).catch(() => null)) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome", headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await watch(context);
  assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"), "noindex, follow");
  await fill(page);
  await expect(page.locator("[data-preview-title]")).toHaveText(title);
  await expect(page.locator("[data-preview-body] h2")).toHaveText("What changed");
  await page.reload();
  await expect(page.locator("#studio-body")).toHaveValue(body);
  await expect(page.locator("#studio-post-title")).toHaveValue(title);
  console.log("PASS draft autosave, preview, and recovery after reload");

  const exported = await readDownload(page, "[data-download-mdx]");
  assert.equal(exported.name, "a-morning-bug.mdx");
  assert.ok(exported.text.includes('title: "A morning bug: a \\"small\\" fix"'));
  assert.ok(exported.text.includes("draft: true"));
  await compile(exported.text.replace(/^---\n[\s\S]*?\n---\n/, ""));
  await details(page);
  await page.locator('input[name="published"]').check();
  const published = await readDownload(page, "[data-download-mdx]");
  assert.ok(published.text.includes("draft: false"));
  console.log("PASS browser MDX validation and downloads in draft/published modes");

  await more(page);
  const backup = await readDownload(page, "[data-backup-drafts]");
  const original = JSON.parse(backup.text);
  assert.equal(original.drafts.length, 1);
  await page.locator("[data-new-draft]").click();
  await page.locator("#studio-post-title").fill("Another draft");
  await page.locator("[data-save-draft]").click();
  await expect(page.locator("#studio-drafts option")).toHaveCount(2);
  await page.locator("#studio-drafts").selectOption(original.activeId);
  await expect(page.locator("#studio-body")).toHaveValue(body);
  const file = { name: "drafts.json", mimeType: "application/json", buffer: Buffer.from(backup.text) };
  await page.locator("[data-import-backup]").setInputFiles(file);
  await expect(page.locator("[data-restore-dialog]")).toBeVisible();
  await page.locator("[data-restore-cancel]").click();
  await expect(page.locator("#studio-drafts option")).toHaveCount(2);
  await page.locator("[data-import-backup]").setInputFiles(file);
  await page.locator("[data-restore-confirm]").click();
  await expect(page.locator("#studio-drafts option")).toHaveCount(1);
  await page.locator("[data-import-backup]").setInputFiles({ name: "invalid.json", mimeType: "application/json", buffer: Buffer.from('{"version":999}') });
  await expect(page.locator("[data-studio-error]")).toHaveText(/isn’t a valid/);
  await expect(page.locator("#studio-post-title")).toHaveValue(title);
  console.log("PASS multiple drafts, backups, confirmed restore, and invalid-backup preservation");

  await page.locator("[data-delete-draft]").click();
  await page.locator("[data-delete-cancel]").click();
  await expect(page.locator("#studio-post-title")).toHaveValue(title);
  await page.locator("[data-delete-draft]").click();
  await page.locator("[data-delete-confirm]").click();
  await expect(page.locator("#studio-post-title")).toHaveValue("");
  await expect(page.locator("#studio-drafts option")).toHaveCount(1);
  await page.locator("[data-import-backup]").setInputFiles(file);
  await page.locator("[data-restore-confirm]").click();
  console.log("PASS delete confirmation and an editable draft after deleting the last draft");

  await details(page);
  await page.locator("#studio-tags").fill("frontend, frontend");
  await page.locator("[data-download-mdx]").click();
  await expect(page.locator("[data-studio-error]")).toHaveText(/unique/);
  await page.locator("#studio-tags").fill("debugging, frontend");
  await page.locator("#studio-body").fill("An unfinished expression {broken");
  await page.locator("[data-download-mdx]").click();
  await expect(page.locator("[data-studio-error]")).toBeVisible();
  await expect(page.locator("[data-download-mdx]")).toHaveText("Download MDX");
  await page.locator("#studio-body").fill("# A second main heading");
  await page.locator("[data-download-mdx]").click();
  await expect(page.locator("[data-studio-error]")).toHaveText(/Use ##/);
  console.log("PASS invalid metadata, MDX syntax, and duplicate main headings are blocked");

  const malicious = '## Safe heading\n\n<script>window.__deskXss = true</script>\n\n<a href="javascript:alert(1)" onclick="window.__deskXss=true">Unsafe link</a>\n\n<svg onload="window.__deskXss=true"></svg>';
  await page.locator("#studio-body").fill(malicious);
  await expect(page.locator("[data-preview-body] h2")).toHaveText("Safe heading");
  assert.equal(await page.evaluate(() => window.__deskXss), undefined);
  assert.equal(await page.locator('[data-preview-body] script, [data-preview-body] svg, [data-preview-body] [onclick], [data-preview-body] a[href^="javascript:"]').count(), 0);
  console.log("PASS preview strips active HTML, event handlers, SVG, and unsafe links");
  await page.locator("#studio-body").fill(body);
  await page.locator("[data-save-draft]").click();

  for (const mode of ["light", "dark"]) {
    await page.locator("html").evaluate((root, theme) => { root.dataset.theme = theme; root.classList.toggle("dark", theme === "dark"); root.style.colorScheme = theme; }, mode);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width <= 960) {
        await page.locator('[data-view-button="write"]').click();
        await expect(page.locator(".studio-compose")).toBeVisible();
        await expect(page.locator(".studio-preview")).not.toBeVisible();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.locator('[data-view-button="preview"]').click();
        await expect(page.locator(".studio-preview")).toBeVisible();
        await expect(page.locator(".studio-compose")).not.toBeVisible();
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      if ([390, 1440].includes(width)) await page.screenshot({ path: `/tmp/rokon-writing-desk-${mode}-${width}.png`, fullPage: true });
      console.log("PASS", mode, width, "layout and mobile write/preview controls");
    }
  }

  const unavailable = await browser.newContext();
  await unavailable.addInitScript(storageKey => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === storageKey) throw new DOMException("Unavailable", "QuotaExceededError");
      original.call(this, name, value);
    };
  }, key);
  const failurePage = await watch(unavailable);
  await fill(failurePage);
  await expect(failurePage.locator("[data-studio-warning]")).toHaveText(/unavailable or full/);
  await expect(failurePage.locator("[data-save-status]")).toHaveText("Not saved in this browser.");
  assert.equal((await readDownload(failurePage, "[data-download-mdx]")).name, "a-morning-bug.mdx");
  console.log("PASS storage failure preserves in-memory work and permits MDX download");

  const corrupted = await browser.newContext();
  await corrupted.addInitScript(storageKey => localStorage.setItem(storageKey, "{broken JSON"), key);
  const corruptPage = await watch(corrupted);
  await expect(corruptPage.locator("[data-studio-warning]")).toHaveText(/preserved/);
  await corruptPage.locator("#studio-post-title").fill("Recoverable new work");
  await corruptPage.locator("[data-save-draft]").click();
  assert.equal(await corruptPage.evaluate(storageKey => localStorage.getItem(storageKey), key), "{broken JSON");
  assert.equal((await readDownload(corruptPage, "[data-recover-storage]")).text, "{broken JSON");
  console.log("PASS corrupt saved data is preserved and recoverable");

  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJsPage = await noJs.newPage();
  await noJsPage.goto(origin + path);
  await expect(noJsPage.getByText("Enable JavaScript to use the editor.", { exact: false })).toBeVisible();
  await expect(noJsPage.locator("[data-download-mdx]")).toBeDisabled();
  await expect(noJsPage.locator("#studio-body")).toBeDisabled();
  assert.deepEqual(await (await page.request.get(origin + "/blog/search-index.json")).json(), []);
  assert.deepEqual(errors, []);
  console.log("PASS no-JavaScript instructions, public blog stays empty, zero browser errors");
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}

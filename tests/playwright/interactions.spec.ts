import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const fixture = process.env.QA_RESPONSIVE_FIXTURE === "true";
const dir =
  process.env.QA_SCREENSHOT_DIR ||
  `docs/responsive-qa/${fixture ? "fixture-" : ""}screenshots`;
mkdirSync(dir, { recursive: true });
const diagnostics = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  diagnostics.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText || "";
    if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled/i.test(reason))
      errors.push(`${request.url()}: ${reason}`);
  });
});
test.afterEach(async ({ page }) => {
  expect(diagnostics.get(page) || []).toEqual([]);
});
async function heroState(page: Page) {
  return page
    .locator("[data-system-hero]")
    .evaluate((host) =>
      (
        host as HTMLElement & { systemsHero: { diagnostics(): any } }
      ).systemsHero?.diagnostics(),
    );
}
async function swipe(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [from],
  });
  for (let n = 1; n <= 12; n++) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * n) / 12,
          y: from.y + ((to.y - from.y) * n) / 12,
        },
      ],
    });
    await page.waitForTimeout(16);
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await client.detach();
}

test("touch taps, landscape menu, theme, links and vertical hero panning", async ({
  page,
}, info) => {
  test.skip(
    !info.project.name.startsWith("touch-"),
    "Requires touch emulation",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".mobile-nav summary").tap();
  await expect(page.locator(".mobile-nav a[href='/about']")).toBeVisible();
  await page.locator(".brand").tap();
  await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open");
  const theme = await page.locator("html").getAttribute("data-theme");
  await page.locator("[data-theme-toggle]").first().tap();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    theme === "dark" ? "light" : "dark",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator(".mobile-nav summary").tap();
  const contact = page.locator(".mobile-nav a[href='/contact']");
  await contact.scrollIntoViewIfNeeded();
  await contact.tap();
  await expect(page).toHaveURL(/\/contact$/);
  await page.goto("/resume");
  const download = page.locator("a[download]").first();
  const href = await download.getAttribute("href");
  expect(href).toBeTruthy();
  expect((await page.request.get(href!)).status()).toBe(200);
  const downloading = page.waitForEvent("download");
  await download.tap();
  expect((await downloading).suggestedFilename()).toMatch(
    /resume.*\.(pdf|txt)$/i,
  );
  if (info.project.name === "touch-chromium") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const hero = page.locator("[data-hero-viewport]");
    await hero.scrollIntoViewIfNeeded();
    const bounds = (await hero.boundingBox())!;
    const before = await page.evaluate(() => scrollY);
    await swipe(
      page,
      { x: 190, y: Math.min(750, bounds.y + bounds.height - 30) },
      { x: 190, y: Math.max(140, bounds.y + 30) },
    );
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(before + 50);
  }
});

test("WebGL and constrained-device fallbacks retain composition without optional downloads", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      value: 8,
      configurable: true,
    });
    Object.defineProperty(navigator, "deviceMemory", {
      value: 8,
      configurable: true,
    });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: any,
      options: any,
    ) {
      return type === "webgl2" ? null : original.call(this, type, options);
    } as typeof original;
  });
  await page.goto("/");
  const hero = page.locator("[data-system-hero]");
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-hero-reason", "webgl-unavailable");
  await expect(page.locator("[data-hero-fallback]")).toBeVisible();
  await expect(page.locator("[data-hero-pause]")).toBeHidden();
  const state = await heroState(page);
  expect(state.scene).toBeNull();
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((entry) => /systems-scene/.test(entry.name)).length,
    ),
  ).toBe(0);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "hardwareConcurrency", {
      value: 2,
      configurable: true,
    }),
  );
  await page.reload();
  await expect(hero).toHaveAttribute("data-hero-reason", "device-budget");
  await info.attach("forced-fallback", {
    body: JSON.stringify(state),
    contentType: "application/json",
  });
});

test("actual Three.js rendering, pause, theme, offscreen and reduced-motion lifecycle", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium" && info.project.name !== "touch-chromium",
    "Software WebGL capability override is Chromium-specific",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      value: 8,
      configurable: true,
    });
    Object.defineProperty(navigator, "deviceMemory", {
      value: 8,
      configurable: true,
    });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: any,
      options: any,
    ) {
      return original.call(
        this,
        type,
        type === "webgl2"
          ? { ...options, failIfMajorPerformanceCaveat: false }
          : options,
      );
    } as typeof original;
  });
  await page.goto("/");
  const hero = page.locator("[data-system-hero]");
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-hero-status", "ready");
  await expect
    .poll(async () => (await heroState(page)).scene?.frames ?? 0)
    .toBeGreaterThan(0);
  const state = await heroState(page);
  expect(state.scene.tier).toBe(
    info.project.name.startsWith("touch-") ? "compact" : "full",
  );
  expect(state.scene.pixelRatio).toBeLessThanOrEqual(1.5);
  expect(state.scene.textures).toBe(0);
  const bounds = await hero.boundingBox();
  const pause = page.locator("[data-hero-pause]");
  await pause.focus();
  await page.keyboard.press("Enter");
  await expect(pause).toHaveAttribute("aria-label", "Resume scene motion");
  await expect(pause).toBeFocused();
  const frames = (await heroState(page)).scene.frames;
  await page.waitForTimeout(250);
  expect((await heroState(page)).scene.frames).toBe(frames);
  await page.locator("[data-theme-toggle]").first().click();
  expect((await heroState(page)).scene.frames).toBe(frames);
  const after = (await hero.boundingBox())!;
  expect(Math.abs(after.height - bounds!.height)).toBeLessThan(1);
  await hero.screenshot({
    path: `${dir}/scene-${info.project.name}-paused.png`,
  });
  await pause.click();
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-hero-activity", "paused");
  await hero.scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-hero-activity", "running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).toHaveAttribute("data-hero-reason", "reduced-motion");
  await expect(page.locator(".systems-canvas")).toHaveCount(0);
  await expect(page.locator("[data-hero-fallback]")).toBeVisible();
  await info.attach("real-scene-capability-override", {
    body: JSON.stringify(state),
    contentType: "application/json",
  });
});

test("publication code and tables scroll with keyboard and touch; copy has accessible feedback", async ({
  page,
}, info) => {
  test.skip(!fixture, "Isolated publication fixture only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/blog/qa-responsive-publication");
  const pre = page.locator(".code-scroll").last();
  await pre.scrollIntoViewIfNeeded();
  await pre.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => pre.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  const table = page.locator(".article-table").last();
  await table.scrollIntoViewIfNeeded();
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => table.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
  await expect(table).toHaveAttribute("aria-label", /table/i);
  if (info.project.name === "touch-chromium") {
    await pre.scrollIntoViewIfNeeded();
    await pre.evaluate((element) => {
      element.scrollLeft = 0;
    });
    const bounds = (await pre.boundingBox())!;
    await swipe(
      page,
      { x: bounds.x + bounds.width - 30, y: bounds.y + 40 },
      { x: bounds.x + 30, y: bounds.y + 40 },
    );
    await expect
      .poll(() => pre.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(40);
  }
  const block = page.locator("[data-code-block]").last();
  await block.scrollIntoViewIfNeeded();
  // Deterministically exercise both clipboard outcomes without OS clipboard permissions.
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as any).qaCopied = text;
        },
      },
    }),
  );
  await block.locator("[data-copy-code]").click();
  await expect(block.getByRole("status")).toHaveText(
    "Code copied to clipboard.",
  );
  expect(await page.evaluate(() => (window as any).qaCopied)).toContain(
    "deliberateLongLine",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Unavailable in QA");
        },
      },
    }),
  );
  await block.locator("[data-copy-code]").click();
  await expect(block.getByRole("status")).toHaveText(
    /Select the code and copy it manually/,
  );
  if (info.project.name === "chromium")
    await block.screenshot({ path: `${dir}/article-code-320.png` });
  await page.locator(".article-outline summary").click();
  const toc = page.locator(".article-toc a[href='#overflow-stress-specimen']");
  await toc.click();
  const heading = page.locator("#overflow-stress-specimen");
  const headingTop = (await heading.boundingBox())!.y;
  expect(headingTop).toBeGreaterThanOrEqual(20);
  expect(headingTop).toBeLessThan(120);
  if (info.project.name === "chromium")
    await page.screenshot({ path: `${dir}/article-toc-320.png` });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(321);
});

test("publication search, topic selection, empty-state reset and tag navigation", async ({
  page,
}) => {
  test.skip(!fixture, "Isolated publication fixture only");
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/blog");
  const query = page.getByLabel("Search notes");
  await expect(query).toBeVisible();
  await query.fill("Backend filter QA");
  await expect(page.locator("[data-blog-results]")).toHaveText("1 note found");
  await page.getByLabel("Topic", { exact: true }).selectOption("frontend");
  await expect(page.locator("[data-search-empty]")).toBeVisible();
  await page.locator("[data-search-reset]").click();
  await expect(query).toBeFocused();
  await expect(query).toHaveValue("");
  await expect(page.locator("[data-blog-results]")).toHaveText("4 notes");
  await page.locator(".archive-tags a[href='/blog/tags/qa-checks']").click();
  await expect(page).toHaveURL(/\/blog\/tags\/qa-checks$/);
  await expect(page.locator("[data-blog-results]")).toHaveText("2 notes");
});

test("project media preserves intrinsic ratio, four corners, alt text and lazy-load geometry", async ({
  page,
}, info) => {
  test.skip(!fixture, "Diagnostic media fixture only");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/qa-responsive-components");
  const image = page.locator(".case-media img");
  for (const width of [320, 390, 768, 1440, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(1200);
    const bounds = (await image.boundingBox())!;
    expect(Math.abs(bounds.width / bounds.height - 1.5)).toBeLessThan(0.01);
    expect(await image.evaluate((img) => getComputedStyle(img).objectFit)).toBe(
      "contain",
    );
    await expect(image).toHaveAttribute("alt", /four visible corners/);
    if (info.project.name === "chromium" && width < 2560)
      await page
        .locator(".case-media")
        .screenshot({ path: `${dir}/project-media-${width}.png` });
  }
});

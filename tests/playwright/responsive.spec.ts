import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const routes = [
  ["home", "/"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["resume", "/resume"],
  ["work", "/work"],
  ["chemistry", "/work/chemistry-calculator"],
  ["volunteering", "/work/community-driven-social-volunteering-platform"],
  ["courseflow", "/work/courseflow"],
  ["blog", "/blog"],
  ["gallery", "/design-system"],
  ["404", "/missing-responsive-qa"],
];
const widths = [320, 375, 390, 768, 1024, 1440, 1920, 2560];
const fixture = process.env.QA_RESPONSIVE_FIXTURE === "true";
if (fixture)
  routes.push(
    ["article", "/blog/qa-responsive-publication"],
    ["tag", "/blog/tags/qa-checks"],
    ["media", "/qa-responsive-components"],
    ["jenkins", "/blog/qa-responsive-jenkins"],
    ["spring", "/blog/qa-responsive-spring"],
  );
const dir =
  process.env.QA_SCREENSHOT_DIR ||
  (fixture
    ? "docs/responsive-qa/fixture-screenshots"
    : "docs/responsive-qa/screenshots");
mkdirSync(dir, { recursive: true });

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator("[data-theme-toggle]")
    .first()
    .waitFor({ state: "visible" });
  await page.waitForTimeout(180);
}

function observe(page: Page) {
  const errors: string[] = [],
    failures: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/status of 404/.test(message.text()))
      errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (
      !/ERR_ABORTED|NS_BINDING_ABORTED|cancelled|canceled/i.test(
        request.failure()?.errorText || "",
      )
    )
      failures.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  return { errors, failures };
}

for (const [name, route] of routes) {
  for (const mode of ["light", "dark"] as const) {
    test(`${name} ${mode}: complete responsive matrix`, async ({
      page,
    }, info) => {
      const log = observe(page);
      await page.addInitScript(
        (theme) => localStorage.setItem("theme", theme),
        mode,
      );
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: mode });
      const response = await page.goto(route);
      expect(response?.status()).toBe(name === "404" ? 404 : 200);
      await settle(page);
      const samples = [];
      for (const width of widths) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(80);
        // Resizing long articles can trigger browser scroll anchoring after reflow.
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
        expect(
          (await page.locator(".site-header").boundingBox())!.y,
        ).toBeGreaterThanOrEqual(-1);
        const sample = await page.evaluate(() => {
          const heading = document.querySelector("h1")!;
          const style = getComputedStyle(heading),
            rect = heading.getBoundingClientRect();
          const overflow = [...document.querySelectorAll<HTMLElement>("main *")]
            .filter((element) => {
              if (
                !element.getClientRects().length ||
                element.closest("svg,pre,.article-table,[aria-hidden='true']")
              )
                return false;
              const bounds = element.getBoundingClientRect();
              return (
                bounds.width > 0 &&
                (bounds.left < -1 || bounds.right > innerWidth + 1)
              );
            })
            .map((element) => ({
              tag: element.tagName,
              cls: element.className,
              text: element.textContent?.slice(0, 60),
            }));
          return {
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            headingSize: parseFloat(style.fontSize),
            headingHeight: rect.height,
            headingWidth: rect.width,
            bodySize: parseFloat(getComputedStyle(document.body).fontSize),
            overflow,
            theme: document.documentElement.dataset.theme,
            desktopNav: getComputedStyle(
              document.querySelector(".desktop-nav")!,
            ).display,
            mobileNav: getComputedStyle(document.querySelector(".mobile-nav")!)
              .display,
          };
        });
        expect(
          sample.scrollWidth,
          `${route} ${mode} ${width}: page overflow`,
        ).toBeLessThanOrEqual(width + 1);
        expect(
          sample.overflow,
          `${route} ${mode} ${width}: element bounds`,
        ).toEqual([]);
        expect(sample.headingSize).toBeGreaterThanOrEqual(28);
        expect(sample.headingSize).toBeLessThanOrEqual(120);
        expect(sample.bodySize).toBeGreaterThanOrEqual(16);
        expect(sample.theme).toBe(mode);
        expect(sample.desktopNav === "none").toBe(width < 1024);
        expect(sample.mobileNav === "none").toBe(width >= 1024);
        samples.push(sample);
        if (
          info.project.name === "chromium" &&
          [390, 768, 1440].includes(width)
        ) {
          await page.screenshot({
            path: `${dir}/${name}-${mode}-${width}.png`,
          });
          if (width === 390 || width === 1440)
            await page.screenshot({
              path: `${dir}/${name}-${mode}-${width}-full.png`,
              fullPage: true,
            });
        }
        if (
          ["firefox", "touch-chromium"].includes(info.project.name) &&
          ["home", "about", "article"].includes(name) &&
          [390, 1440].includes(width)
        ) {
          await page.screenshot({
            path: `${dir}/${name}-${mode}-${width}-${info.project.name}.png`,
          });
        }
      }
      // Exercise lazy loading and inspect the complete page, including lower sections.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 12));
        }
      });
      await page.waitForTimeout(250);
      const brokenImages = await page
        .locator("img")
        .evaluateAll((images: HTMLImageElement[]) =>
          images
            .filter((image) => !image.complete || image.naturalWidth === 0)
            .map((image) => image.src),
        );
      expect(brokenImages).toEqual([]);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("main")).toHaveCount(1);
      expect(log.errors).toEqual([]);
      expect(log.failures).toEqual([]);
      await info.attach("responsive-measurements", {
        body: JSON.stringify(samples, null, 2),
        contentType: "application/json",
      });
    });
  }
}

test("keyboard navigation, menu focus, breakpoint transitions and history", async ({
  page,
}) => {
  const log = observe(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/about");
  await settle(page);
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const menu = page.locator(".mobile-nav summary");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".mobile-nav")).toHaveAttribute("open", "");
  await page.keyboard.press("Tab");
  await expect(page.locator(".mobile-nav a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open");
  expect(
    await menu.evaluate((element) => getComputedStyle(element).outlineStyle),
  ).toBe("solid");
  await page.keyboard.press("Enter");
  await page.locator(".mobile-nav a[href='/contact']").focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/contact$/);
  await page.goBack();
  await settle(page);
  await expect(page).toHaveURL(/\/about(?:#main-content)?$/);
  await menu.focus();
  await page.keyboard.press("Enter");
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator(".brand")).toBeFocused();
  await expect(page.locator(".mobile-nav")).not.toHaveAttribute("open");
  expect(log.errors).toEqual([]);
});

test("theme persistence and synchronized controls", async ({ page }) => {
  const log = observe(page);
  await page.goto("/design-system");
  await settle(page);
  const controls = page.locator("[data-theme-toggle]");
  await controls.first().click();
  const mode = await page.locator("html").getAttribute("data-theme");
  for (const button of await controls.all())
    await expect(button).toHaveAttribute(
      "aria-pressed",
      String(mode === "dark"),
    );
  await page.goto("/work");
  await settle(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", mode!);
  await page.reload();
  await settle(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", mode!);
  expect(log.errors).toEqual([]);
});

test("gallery tabs, filters and labeled input specimens hydrate when visible", async ({
  page,
}) => {
  const log = observe(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/design-system");
  await settle(page);
  const tabs = page.getByRole("tablist", { name: "Design principles" });
  await tabs.scrollIntoViewIfNeeded();
  await expect(page.locator("astro-island[ssr]")).toHaveCount(0);
  await page.getByRole("tab", { name: "Structure", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Interaction", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Interaction", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Motion", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Structure", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tab", { name: "Coming later" })).toBeDisabled();
  const desktop = page.getByRole("button", { name: "Desktop", exact: true });
  await desktop.click();
  await expect(desktop).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "1 project" }),
  ).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Responsive QA");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Responsive QA",
  );
  await expect(page.getByLabel("Email address (error state)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Unavailable field")).toBeDisabled();
  expect(log.errors).toEqual([]);
});

test("scroll reveals and reduced-motion switching preserve visible content", async ({
  page,
}) => {
  const log = observe(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await settle(page);
  await page.waitForTimeout(1200);
  for (const section of ["#projects", "#work", "#contact"]) {
    await page.locator(section).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    expect(
      await page
        .locator(section)
        .evaluate((element) => getComputedStyle(element).opacity),
    ).toBe("1");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(200);
  const animated = await page
    .locator("[data-motion]")
    .evaluateAll((elements) =>
      elements.filter(
        (element) =>
          getComputedStyle(element).opacity === "0" ||
          getComputedStyle(element).visibility === "hidden",
      ),
    );
  expect(animated).toEqual([]);
  await page.reload();
  await settle(page);
  const optional = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => /systems-scene|page-motion/.test(entry.name))
      .map((entry) => entry.name),
  );
  expect(optional).toEqual([]);
  await expect(page.locator("[data-hero-fallback]")).toBeVisible();
  expect(log.errors).toEqual([]);
});

test("320px readable baseline with JavaScript disabled", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    ignoreHTTPSErrors: process.env.QA_IGNORE_HTTPS_ERRORS === "true",
    viewport: { width: 320, height: 844 },
  });
  const page = await context.newPage();
  for (const [, route] of routes.filter(([name]) => name !== "404")) {
    await page.goto((process.env.QA_ORIGIN || "http://127.0.0.1:4173") + route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(321);
    await page.locator(".mobile-nav summary").click();
    await expect(page.locator(".mobile-nav a").first()).toBeVisible();
  }
  await context.close();
});

test("internal navigation, fragment targets and downloadable assets resolve", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const checked = new Set<string>();
  for (const [, route] of routes) {
    await page.goto(route);
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        anchors
          .map((anchor) => (anchor as HTMLAnchorElement).href)
          .filter((href) => href.startsWith(location.origin)),
      );
    for (const href of hrefs) {
      if (checked.has(href)) continue;
      checked.add(href);
      const url = new URL(href);
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(
        url.pathname === "/missing-responsive-qa" ? 404 : 200,
      );
      if (
        url.hash &&
        response.headers()["content-type"]?.includes("text/html")
      ) {
        const body = await response.text();
        const id = decodeURIComponent(url.hash.slice(1));
        expect(body.includes(`id="${id}"`), `Fragment target ${href}`).toBe(
          true,
        );
      }
    }
  }
});

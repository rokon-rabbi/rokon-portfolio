import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Run after pnpm build: these assertions inspect Astro's actual generated HTML.
const root = resolve("dist/client");
const slugs = [
  "community-driven-social-volunteering-platform",
  "courseflow",
  "chemistry-calculator",
];
const paths = [
  "/",
  "/blog",
  "/about",
  "/contact",
  "/resume",
  "/work",
  ...slugs.map((slug) => `/work/${slug}`),
  "/design-system/",
  "/404",
];
const fileFor = (path) =>
  path === "/404"
    ? resolve(root, "404.html")
    : resolve(root, path.slice(1), "index.html");
const page = (path) => {
  assert.ok(
    existsSync(fileFor(path)),
    `Missing build output for ${path}; run pnpm build first`,
  );
  return readFileSync(fileFor(path), "utf8");
};
const ids = (html) =>
  [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const hrefs = (html) =>
  [...html.matchAll(/\bhref="([^"]+)"/g)].map((match) => match[1]);

test("generated project routes", async (t) => {
  const pages = new Map(
    paths.map((path) => [path.replace(/\/$/, "") || "/", page(path)]),
  );
  await t.test(
    "the portfolio and exactly the three requested project pages are prerendered",
    () => {
      assert.ok(page("/work").includes("Selected systems."));
      assert.deepEqual(
        readdirSync(resolve(root, "work"))
          .filter((entry) => entry !== "index.html")
          .sort(),
        [...slugs].sort(),
      );
      slugs.forEach((slug) =>
        assert.ok(page(`/work/${slug}`).includes(`data-project-id="${slug}"`)),
      );
    },
  );
  for (const path of ["/work", ...slugs.map((slug) => `/work/${slug}`)]) {
    await t.test(
      `${path}: landmarks, metadata, labels and Work navigation`,
      () => {
        const html = pages.get(path);
        for (const tag of ["main", "header", "footer", "h1"])
          assert.equal(
            (html.match(new RegExp(`<${tag}[\\s>]`, "g")) || []).length,
            1,
            tag,
          );
        const foundIds = ids(html);
        assert.equal(new Set(foundIds).size, foundIds.length, "duplicate IDs");
        for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g))
          for (const id of match[1].split(" "))
            assert.ok(foundIds.includes(id), `Missing label ${id}`);
        assert.match(html, /<meta name="description" content="[^"]+"/);
        assert.ok(html.includes(`href="/work" aria-current="page">Work`));
        assert.match(html, /rel="canonical"/);
        assert.ok(!html.includes("astro-island"));
      },
    );
  }
  await t.test(
    "internal links and fragment targets resolve across all generated pages",
    () => {
      for (const [path, html] of pages)
        for (const href of hrefs(html)) {
          const url = new URL(href, `https://portfolio.test${path}`);
          if (url.origin !== "https://portfolio.test") continue;
          const target = url.pathname.replace(/\/$/, "") || "/";
          if (
            target === "/favicon.svg" ||
            target === "/rss.xml" ||
            target === "/resume/rokon-resume.pdf" ||
            target === "/resume/rokon-resume.txt" ||
            target.startsWith("/_astro/")
          ) {
            assert.ok(existsSync(resolve(root, url.pathname.slice(1))), href);
            continue;
          }
          assert.ok(pages.has(target), `${path} links to unknown ${href}`);
          if (url.hash)
            assert.ok(
              ids(pages.get(target)).includes(
                decodeURIComponent(url.hash.slice(1)),
              ),
              `${path}: missing ${href}`,
            );
        }
    },
  );
  await t.test(
    "brief is noindex and excluded from sitemap; reviewed work is discoverable",
    () => {
      const brief = page("/work/courseflow");
      assert.ok(brief.includes('content="noindex, follow"'));
      assert.ok(brief.includes("not a completed case study"));
      const sitemap = readFileSync(resolve(root, "sitemap-0.xml"), "utf8");
      assert.ok(!sitemap.includes("/work/courseflow"));
      for (const slug of slugs.filter((slug) => slug !== "courseflow")) {
        assert.ok(sitemap.includes(`/work/${slug}`));
        assert.ok(!page(`/work/${slug}`).includes('content="noindex, follow"'));
      }
      assert.ok(sitemap.includes("/work/"));
    },
  );
  await t.test(
    "every case has the required chapters, honest gaps and working related navigation",
    () => {
      for (const slug of slugs) {
        const html = page(`/work/${slug}`);
        for (const id of [
          "problem",
          "role",
          "architecture",
          "decisions",
          "features",
          "challenges",
          "lessons",
          "evidence",
        ])
          assert.ok(ids(html).includes(id), `${slug}/${id}`);
        assert.ok(html.includes("Needs confirmation"));
        assert.ok(html.includes("No approved product screenshots"));
        assert.match(html, /aria-label="Related projects"/);
      }
      const chemistry = page("/work/chemistry-calculator");
      assert.ok(chemistry.includes("Fork of IIT-NSTU/chemistry-calculator"));
      assert.ok(
        chemistry.includes(
          "My exact changes and contribution scope have not been verified",
        ),
      );
      assert.ok(
        page("/work/community-driven-social-volunteering-platform").includes(
          "updating its status with PATCH",
        ),
      );
    },
  );
  await t.test(
    "employer projects and arbitrary slugs do not acquire static case-study pages",
    () => {
      for (const slug of [
        "enterprise-mis-contributions",
        "shaheen-education-family-lms",
        "unknown-project",
        "../private",
      ])
        assert.equal(
          existsSync(resolve(root, "work", slug, "index.html")),
          false,
        );
      for (const slug of slugs) {
        const html = page(`/work/${slug}`);
        assert.ok(!html.includes("Karooth IT"));
        assert.ok(!html.includes("Ztrios Technologies"));
      }
    },
  );
});

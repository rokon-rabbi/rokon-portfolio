import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
const dist = new URL("../dist/client/", import.meta.url);
const removed = [
  "a-green-build-and-a-broken-page",
  "the-font-was-in-package-json",
  "the-save-button-was-clicked-twice",
  "reliable-jenkins-pipeline",
  "spring-boot-caching-and-async",
  "maintainable-angular-enterprise-applications",
];
test("empty writing collection stays ready for future articles", async (t) => {
  await t.test("the archive has a calm empty state and no RSS or search controls", () => {
    const html = readFileSync(new URL("blog/index.html", dist), "utf8");
    assert.ok(html.includes("No published notes yet."));
    assert.ok(html.includes("Notes from the work."));
    assert.ok(html.includes("Explore my work"));
    assert.equal(html.includes("data-blog-entry="), false);
    assert.equal(/<form\b[^>]*data-blog-search/.test(html), false);
    assert.equal(html.includes('type="application/rss+xml"'), false);
    assert.equal(html.includes('href="/rss.xml"'), false);
    const home = readFileSync(new URL("index.html", dist), "utf8");
    assert.equal(home.includes('id="writing"'), false);
  });
  await t.test("search is empty and removed articles, tags, and RSS are absent", () => {
    assert.deepEqual(JSON.parse(readFileSync(new URL("blog/search-index.json", dist), "utf8")), []);
    assert.equal(existsSync(new URL("rss.xml", dist)), false);
    assert.equal(existsSync(new URL("blog/tags", dist)), false);
    for (const slug of removed) {
      assert.equal(existsSync(new URL(`blog/${slug}/index.html`, dist)), false);
      assert.equal(existsSync(new URL(`preview/blog/${slug}/index.html`, dist)), false);
    }
  });
  await t.test("the sitemap includes Writing without removed articles or previews", () => {
    const sitemap = readdirSync(dist)
      .filter((name) => /^sitemap-\d+\.xml$/.test(name))
      .map((name) => readFileSync(new URL(name, dist), "utf8"))
      .join("");
    assert.ok(/<loc>[^<]+\/blog\/?<\/loc>/.test(sitemap));
    for (const slug of removed) assert.equal(sitemap.includes(slug), false);
    assert.equal(sitemap.includes("preview"), false);
    assert.equal(sitemap.includes("qa-reading"), false);
  });
  await t.test("no articles or QA fixtures remain in the content collection", () => {
    assert.deepEqual(readdirSync(new URL("../src/content/blog/", import.meta.url)).filter((name) => name.endsWith(".mdx")), []);
  });
});

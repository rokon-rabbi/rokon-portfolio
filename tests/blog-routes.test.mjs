import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
const dist = new URL("../dist/client/", import.meta.url);
test("production blog surfaces keep unapproved drafts unpublished", async (t) => {
  await t.test(
    "the archive is generated with an honest empty state and RSS discovery",
    () => {
      const html = readFileSync(new URL("blog/index.html", dist), "utf8");
      assert.ok(html.includes("No published notes yet."));
      assert.ok(html.includes("Engineering publication"));
      assert.ok(html.includes('type="application/rss+xml"'));
      assert.ok(html.includes('href="/rss.xml"'));
      assert.equal(html.includes("data-blog-entry="), false);
    },
  );
  await t.test(
    "search and RSS contain no draft or future article metadata",
    () => {
      assert.deepEqual(
        JSON.parse(
          readFileSync(new URL("blog/search-index.json", dist), "utf8"),
        ),
        [],
      );
      const rss = readFileSync(new URL("rss.xml", dist), "utf8");
      assert.ok(rss.includes('<rss version="2.0"'));
      assert.equal(rss.includes("<item>"), false);
    },
  );
  await t.test(
    "draft article/tag routes and development previews are absent from production",
    () => {
      for (const slug of [
        "reliable-jenkins-pipeline",
        "spring-boot-caching-and-async",
        "maintainable-angular-enterprise-applications",
      ]) {
        assert.equal(
          existsSync(new URL(`blog/${slug}/index.html`, dist)),
          false,
        );
        assert.equal(
          existsSync(new URL(`preview/blog/${slug}/index.html`, dist)),
          false,
        );
      }
      assert.equal(
        existsSync(new URL("blog/tags/jenkins/index.html", dist)),
        false,
      );
    },
  );
  await t.test(
    "sitemap lists the public archive without previews or draft URLs",
    () => {
      const sitemap = readdirSync(dist)
        .filter((name) => /^sitemap-\d+\.xml$/.test(name))
        .map((name) => readFileSync(new URL(name, dist), "utf8"))
        .join("");
      assert.ok(/<loc>[^<]+\/blog\/?<\/loc>/.test(sitemap));
      assert.equal(sitemap.includes("preview"), false);
      assert.equal(sitemap.includes("reliable-jenkins-pipeline"), false);
      assert.equal(sitemap.includes("qa-publication"), false);
    },
  );
  await t.test("no temporary QA publication content remains", () => {
    assert.equal(
      readdirSync(new URL("../src/content/blog/", import.meta.url)).some(
        (name) => name.startsWith("qa-publication-"),
      ),
      false,
    );
  });
});

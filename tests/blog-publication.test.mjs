import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const mdxRequire = createRequire(import.meta.resolve("@astrojs/mdx"));
const astroRequire = createRequire(import.meta.resolve("astro"));
const { parse: yaml } = await import(
  pathToFileURL(astroRequire.resolve("yaml")).href
);
const { compile } = await import(
  pathToFileURL(mdxRequire.resolve("@mdx-js/mdx")).href
);
const { default: gfm } = await import("remark-gfm");
const { default: prettyCode } = await import("rehype-pretty-code");

test("engineering publication", async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "rokon-blog-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const files = [
    "src/schemas/blog.ts",
    "src/lib/publication.ts",
    "src/lib/blog-publication.ts",
    "src/lib/remark-code-meta.ts",
    "src/mdx-components.tsx",
    "src/components/mdx/code-block.tsx",
    "src/components/mdx/media-container.tsx",
  ];
  for (const file of files) {
    const compiled = ts
      .transpileModule(readFileSync(new URL(file, root), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      })
      .outputText.replace(
        /from\s+(["'])([^"']+)\1/g,
        (_all, _quote, specifier) => {
          const resolved = specifier.startsWith("@/")
            ? new URL(
                specifier.replace("@/", "src/") + ".mjs",
                pathToFileURL(temporary + "/"),
              ).href
            : specifier.startsWith(".")
              ? specifier + ".mjs"
              : import.meta.resolve(specifier);
          return `from ${JSON.stringify(resolved)}`;
        },
      );
    const target = join(temporary, file.replace(/\.tsx?$/, ".mjs"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, compiled);
  }
  const load = (file) => import(pathToFileURL(join(temporary, file)).href);
  const { BlogSchema } = await load("src/schemas/blog.mjs");
  const { selectPublishedPosts } = await load("src/lib/publication.mjs");
  const {
    articleSummary,
    collectTags,
    relatedArticles,
    filterArticles,
    readingMinutes,
    blogRSS,
  } = await load("src/lib/blog-publication.mjs");
  const { mdxComponents } = await load("src/mdx-components.mjs");
  const { remarkCodeMeta } = await load("src/lib/remark-code-meta.mjs");
  const article = {
    title: "Caching without surprises",
    description: "Cache invalidation and bounded asynchronous work.",
    date: "2026-10-09",
    author: "Editorial QA",
    tags: ["spring-boot", "caching"],
    topic: "backend",
  };
  await t.test("frontmatter is strict and defaults to unpublished", () => {
    const data = BlogSchema.parse(article);
    assert.equal(data.draft, true);
    assert.equal(data.featured, false);
    for (const override of [
      { description: " " },
      { date: "2026-02-30" },
      { updatedDate: "2026-10-08" },
      { tags: [] },
      { tags: ["C++"] },
      { tags: ["caching", "caching"] },
      { topic: "invented" },
      { draft: "false" },
      { role: "Invented experience" },
    ]) {
      assert.equal(
        BlogSchema.safeParse({ ...article, ...override }).success,
        false,
        JSON.stringify(override),
      );
    }
  });
  await t.test(
    "cover media require paired descriptive alt text and safe locations",
    () => {
      for (const override of [
        { coverImage: "/images/blog/systems.svg" },
        { coverAlt: "A diagram" },
        { coverImage: "javascript:alert(1)", coverAlt: "A diagram" },
        { coverImage: "//example.com/a.svg", coverAlt: "A diagram" },
        { coverImage: "/images/blog/../private.svg", coverAlt: "A diagram" },
      ]) {
        assert.equal(
          BlogSchema.safeParse({ ...article, ...override }).success,
          false,
        );
      }
      assert.equal(
        BlogSchema.safeParse({
          ...article,
          coverImage: "/images/blog/systems.svg",
          coverAlt: "A cache and work queue diagram.",
        }).success,
        true,
      );
    },
  );
  const record = (id, override = {}) => ({
    id,
    data: BlogSchema.parse({ ...article, draft: false, ...override }),
    body: "A considered engineering note.",
  });
  const mixed = [
    record("published"),
    record("draft-only", { draft: true }),
    record("future", { date: "2026-10-11" }),
    record("future-revision", { updatedDate: "2026-10-11" }),
    { id: "missing-status", data: { ...article } },
  ];
  const selected = selectPublishedPosts(
    mixed,
    new Date("2026-10-10T00:00:00Z"),
  );
  await t.test(
    "only explicit false and eligible publication/update dates reach discovery",
    () => {
      assert.deepEqual(
        selected.map((post) => post.id),
        ["published"],
      );
      const summaries = selected.map(articleSummary);
      const surfaces =
        JSON.stringify({
          summaries,
          tags: collectTags(selected),
          related: relatedArticles(selected[0], selected),
        }) + blogRSS(summaries, "https://example.com", "Editorial QA");
      for (const id of [
        "draft-only",
        "future",
        "future-revision",
        "missing-status",
      ])
        assert.equal(surfaces.includes(id), false);
      assert.deepEqual(
        selectPublishedPosts(
          [record("boundary", { date: "2026-10-10" })],
          new Date("2026-10-09T23:59:59.999Z"),
        ),
        [],
      );
    },
  );
  await t.test(
    "metadata search intersects topic/tag filters and requires every query term",
    () => {
      const summaries = [
        record("cache"),
        record("delivery", {
          title: "Reliable Jenkins builds",
          description: "Repeatable verification.",
          tags: ["jenkins"],
          topic: "delivery",
        }),
      ].map(articleSummary);
      assert.deepEqual(
        filterArticles(summaries, { query: "SPRING cache" }).map(
          (post) => post.id,
        ),
        ["cache"],
      );
      assert.deepEqual(
        filterArticles(summaries, { query: "cache builds" }),
        [],
      );
      assert.deepEqual(
        filterArticles(summaries, { query: "jenkins", topic: "backend" }),
        [],
      );
      assert.deepEqual(
        filterArticles(summaries, { tag: "caching", topic: "backend" }).map(
          (post) => post.id,
        ),
        ["cache"],
      );
      assert.deepEqual(
        filterArticles(summaries, { query: "<script>alert(1)</script>" }),
        [],
      );
    },
  );
  await t.test(
    "related selection favors shared tags, excludes self and remains deterministic",
    () => {
      const post = record("self");
      const others = [
        post,
        record("same-topic", { tags: ["java"] }),
        record("shared-tags"),
        record("unrelated", { tags: ["angular"], topic: "frontend" }),
      ];
      assert.deepEqual(
        relatedArticles(post, others).map((entry) => entry.id),
        ["shared-tags", "same-topic"],
      );
      assert.equal(
        collectTags(others).find((entry) => entry.tag === "caching").count,
        2,
      );
      assert.deepEqual(
        others.map((entry) => entry.id),
        ["self", "same-topic", "shared-tags", "unrelated"],
      );
    },
  );
  await t.test(
    "reading estimates include code cost and ignore import/comment markup",
    () => {
      assert.equal(readingMinutes(""), 1);
      assert.equal(readingMinutes("word ".repeat(441)), 3);
      assert.equal(
        readingMinutes("```java\n" + "call();\n".repeat(17) + "```"),
        3,
      );
      assert.equal(
        readingMinutes(
          "<!-- " +
            "ignored ".repeat(1000) +
            " -->\nimport Something from 'elsewhere';\nReadable note.",
        ),
        1,
      );
    },
  );
  await t.test(
    "RSS escapes text and uses absolute canonical links and UTC dates",
    () => {
      const xml = blogRSS(
        [
          articleSummary(
            record("xml-safe", {
              title: "Cache <work> & data",
              description: 'Use "bounded" work & explicit ownership.',
            }),
          ),
        ],
        "https://example.com",
        "Editorial QA",
      );
      assert.ok(xml.includes("Cache &lt;work&gt; &amp; data"));
      assert.ok(xml.includes("https://example.com/blog/xml-safe"));
      assert.ok(xml.includes("Fri, 09 Oct 2026 00:00:00 GMT"));
      assert.equal(
        blogRSS([], "https://example.com", "Editorial QA").includes("<item>"),
        false,
      );
    },
  );
  const drafts = readdirSync(new URL("src/content/blog/", root))
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const raw = readFileSync(
        new URL(`src/content/blog/${file}`, root),
        "utf8",
      );
      const match = raw.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]*)$/);
      assert.ok(match, file);
      return {
        id: file.replace(/\.mdx$/, ""),
        data: BlogSchema.parse(yaml(match[1])),
        body: match[2],
      };
    });
  await t.test(
    "the three requested original samples are valid drafts with real cover assets",
    () => {
      assert.equal(drafts.length, 3);
      for (const post of drafts) {
        assert.equal(post.data.draft, true);
        assert.ok(post.body.includes("Draft for review"));
        assert.ok(post.body.includes("## References"));
        assert.ok(existsSync(new URL(`public${post.data.coverImage}`, root)));
        assert.ok(post.body.length > 3000);
        assert.equal(
          /\bI (built|implemented|achieved|reduced|deployed)\b/i.test(
            post.body,
          ),
          false,
        );
      }
      assert.deepEqual(
        selectPublishedPosts(drafts, new Date("2099-01-01T00:00:00Z")),
        [],
      );
    },
  );
  for (const post of drafts)
    await t.test(
      `${post.id}: MDX renders highlighted code, semantic headings, tables and copy shells`,
      async () => {
        const compiled = String(
          await compile(post.body, {
            remarkPlugins: [gfm, remarkCodeMeta],
            rehypePlugins: [
              [
                prettyCode,
                {
                  theme: {
                    light: "github-light-high-contrast",
                    dark: "github-dark-high-contrast",
                  },
                  keepBackground: false,
                },
              ],
            ],
          }),
        ).replace(
          /from "react\/jsx-runtime"/g,
          `from ${JSON.stringify(import.meta.resolve("react/jsx-runtime"))}`,
        );
        const { default: Content } = await import(
          `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
        );
        const html = renderToStaticMarkup(
          createElement(Content, { components: mdxComponents }),
        );
        assert.ok(html.includes("<h2"));
        assert.ok(html.includes("data-code-block"));
        assert.ok(html.includes("--shiki-light:"));
        assert.ok(html.includes("data-copy-code"));
        assert.ok(html.includes('tabindex="0"'));
        assert.ok(html.includes('role="region"'));
        assert.ok(html.includes("<table"));
        assert.equal(html.includes("onClick="), false);
      },
    );
  await t.test(
    "heading links preserve a supplied slug and meaningful keyboard-accessible name",
    () => {
      const html = renderToStaticMarkup(
        createElement(
          mdxComponents.h2,
          { id: "repeatable-builds" },
          "Repeatable builds",
        ),
      );
      assert.ok(html.includes('href="#repeatable-builds"'));
      assert.ok(html.includes('aria-label="Link to Repeatable builds"'));
    },
  );
});

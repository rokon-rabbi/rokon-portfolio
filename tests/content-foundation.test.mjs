import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Keep setup and cleanup within the test's lifetime.
test("professional content foundation", async (t) => {
  // Compile these plain TS records into an isolated temporary directory, so the
  // publication rules can be tested without starting Astro/Cloudflare or adding
  // a second TypeScript runtime dependency.
  const temporary = mkdtempSync(join(tmpdir(), "rokon-content-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = new URL("../", import.meta.url);
  const modules = [
    "src/data/sources.ts",
    "src/schemas/portfolio.ts",
    "src/data/profile.ts",
    "src/data/skills.ts",
    "src/data/experience.ts",
    "src/data/case-studies.ts",
    "src/data/projects.ts",
    "src/lib/portfolio-content.ts",
    "src/lib/portfolio-dates.ts",
    "src/schemas/blog.ts",
    "src/lib/publication.ts",
  ];
  for (const file of modules) {
    const compiled = ts
      .transpileModule(readFileSync(new URL(file, root), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(
        /from\s+(["'])([^"']+)\1/g,
        (_match, _quote, specifier) => {
          const target = specifier.startsWith(".")
            ? `${specifier}.mjs`
            : import.meta.resolve(specifier);
          return `from ${JSON.stringify(target)}`;
        },
      );
    const target = join(temporary, file.replace(/\.ts$/, ".mjs"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, compiled);
  }
  const load = (file) => import(pathToFileURL(join(temporary, file)).href);
  const { ProfileSchema, ExperienceSchema, ProjectSchema } = await load(
    "src/schemas/portfolio.mjs",
  );
  const { PROFILE } = await load("src/data/profile.mjs");
  const { EXPERIENCE } = await load("src/data/experience.mjs");
  const { PERSONAL_PROJECTS, PROFESSIONAL_PROJECTS, getPublishedProjects } =
    await load("src/data/projects.mjs");
  const { validatePortfolioContent } = await load(
    "src/lib/portfolio-content.mjs",
  );
  const { formatEmploymentMonth } = await load("src/lib/portfolio-dates.mjs");
  const { BlogSchema } = await load("src/schemas/blog.mjs");
  const { selectPublishedPosts } = await load("src/lib/publication.mjs");
  const personal = PERSONAL_PROJECTS.find(
    (entry) => entry.publication === "published",
  );
  const fork = PERSONAL_PROJECTS.find(
    (entry) => entry.attribution.kind === "fork",
  );

  await t.test(
    "current public records and employer/project relationships validate",
    () => {
      assert.doesNotThrow(validatePortfolioContent);
    },
  );
  await t.test("private profile fields fail the allowlist", () => {
    assert.equal(
      ProfileSchema.safeParse({ ...PROFILE, homeAddress: "private" }).success,
      false,
    );
  });
  await t.test("unknown provenance IDs are rejected", () => {
    assert.equal(
      ProfileSchema.safeParse({ ...PROFILE, sourceIds: ["unreviewed-cv"] })
        .success,
      false,
    );
  });
  await t.test("unsupported project fields cannot be published", () => {
    assert.equal(
      ProjectSchema.safeParse({ ...personal, testimonials: ["invented"] })
        .success,
      false,
    );
  });
  await t.test(
    "employment chronology and month precision are validated",
    () => {
      assert.equal(
        ExperienceSchema.safeParse({ ...EXPERIENCE[0], start: "2025-13" })
          .success,
        false,
      );
      assert.equal(
        ExperienceSchema.safeParse({ ...EXPERIENCE[0], end: "2025-09" })
          .success,
        false,
      );
    },
  );
  await t.test(
    "unverified or incomplete published projects are rejected",
    () => {
      assert.equal(
        ProjectSchema.safeParse({
          ...personal,
          verification: "needs-confirmation",
        }).success,
        false,
      );
      assert.equal(
        ProjectSchema.safeParse({ ...personal, summary: undefined }).success,
        false,
      );
    },
  );
  await t.test("personal work cannot inherit employer ownership", () => {
    assert.equal(
      ProjectSchema.safeParse({ ...personal, employer: "Employer" }).success,
      false,
    );
  });
  await t.test(
    "professional work requires employer and role attribution",
    () => {
      assert.equal(
        ProjectSchema.safeParse({
          ...PROFESSIONAL_PROJECTS[0],
          experienceId: undefined,
        }).success,
        false,
      );
      assert.equal(
        ProjectSchema.safeParse({
          ...PROFESSIONAL_PROJECTS[0],
          attribution: personal.attribution,
        }).success,
        false,
      );
    },
  );
  await t.test("forks require a visible upstream source", () => {
    assert.equal(
      ProjectSchema.safeParse({
        ...fork,
        attribution: { ...fork.attribution, upstreamUrl: undefined },
      }).success,
      false,
    );
  });
  await t.test("project links must use HTTPS", () => {
    assert.equal(
      ProjectSchema.safeParse({
        ...personal,
        links: [
          { label: "Source", kind: "source", url: "javascript:alert(1)" },
        ],
      }).success,
      false,
    );
  });
  await t.test(
    "draft and unverified records are excluded from published selection",
    () => {
      const selected = getPublishedProjects([
        personal,
        { ...personal, id: "draft", publication: "draft" },
        { ...personal, id: "unverified", verification: "needs-confirmation" },
      ]);
      assert.deepEqual(
        selected.map((entry) => entry.id),
        [personal.id],
      );
      assert.equal(
        getPublishedProjects(PERSONAL_PROJECTS).some(
          (entry) => entry.id === "courseflow",
        ),
        false,
      );
    },
  );
  await t.test("employment labels do not depend on local timezone", () => {
    assert.equal(formatEmploymentMonth("2025-10"), "October 2025");
  });
  const article = {
    title: "A reviewed engineering note",
    author: PROFILE.name,
    description: "A technical note.",
    date: "2026-10-10",
    tags: ["testing"],
    topic: "testing",
  };
  await t.test(
    "new articles default to drafts and reject invalid calendar dates",
    () => {
      assert.equal(BlogSchema.parse(article).draft, true);
      assert.equal(
        BlogSchema.safeParse({ ...article, date: "2026-02-30" }).success,
        false,
      );
      assert.equal(
        BlogSchema.safeParse({ ...article, updatedDate: "2026-10-09" }).success,
        false,
      );
      assert.equal(
        BlogSchema.safeParse({ ...article, author: " " }).success,
        false,
      );
    },
  );
  await t.test(
    "blog publication excludes drafts and future posts at the UTC date boundary",
    () => {
      const posts = [
        { id: "draft", data: BlogSchema.parse(article) },
        {
          id: "future",
          data: { ...article, draft: false, date: "2026-10-11" },
        },
        { id: "today", data: { ...article, draft: false } },
        { id: "older", data: { ...article, draft: false, date: "2026-10-09" } },
      ];
      assert.deepEqual(
        selectPublishedPosts(posts, new Date("2026-10-10T00:00:00Z")).map(
          (post) => post.id,
        ),
        ["today", "older"],
      );
      assert.deepEqual(
        selectPublishedPosts(posts, new Date("2026-10-09T23:59:59Z")).map(
          (post) => post.id,
        ),
        ["older"],
      );
    },
  );
  await t.test(
    "equal publication dates sort consistently without changing the input",
    () => {
      const posts = ["z", "a"].map((id) => ({
        id,
        data: { ...article, draft: false },
      }));
      assert.deepEqual(
        selectPublishedPosts(posts, new Date("2026-10-10T12:00:00Z")).map(
          (post) => post.id,
        ),
        ["a", "z"],
      );
      assert.deepEqual(
        posts.map((post) => post.id),
        ["z", "a"],
      );
    },
  );
});

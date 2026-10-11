import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, relative } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

// Exercise the real schema, selectors, and server-rendered React components.
test("project portfolio content and rendering", async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "rokon-work-test-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const modules = [
    "src/data/sources.ts",
    "src/schemas/portfolio.ts",
    "src/data/experience.ts",
    "src/data/case-studies.ts",
    "src/data/projects.ts",
    "src/lib/work.ts",
    "src/lib/project-assets.ts",
    "src/components/design/ProjectPreview.tsx",
    "src/components/design/FeaturedProject.tsx",
    "src/components/work/ArchitectureVisual.tsx",
    "src/components/work/ProjectMedia.tsx",
    "src/components/work/CaseStudyPage.tsx",
    "src/components/work/WorkPortfolio.tsx",
  ];
  const emitted = (file) => join(temporary, file.replace(/\.tsx?$/, ".mjs"));
  for (const file of modules) {
    const compiled = ts
      .transpileModule(readFileSync(join(root, file), "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      })
      .outputText.replace(
        /from\s+(["'])([^"']+)\1/g,
        (_match, _quote, specifier) => {
          let target;
          if (specifier.startsWith(".") || specifier.startsWith("@/")) {
            const base = specifier.startsWith("@/")
              ? `src/${specifier.slice(2)}`
              : relative(root, resolve(root, dirname(file), specifier));
            const found = modules.find(
              (module) => module === `${base}.ts` || module === `${base}.tsx`,
            );
            assert.ok(found, `Add ${base} to the test compilation graph`);
            target = pathToFileURL(emitted(found)).href;
          } else target = import.meta.resolve(specifier);
          return `from ${JSON.stringify(target)}`;
        },
      );
    mkdirSync(dirname(emitted(file)), { recursive: true });
    writeFileSync(emitted(file), compiled);
  }
  const load = (file) => import(pathToFileURL(emitted(file)).href);
  const {
    ProjectSchema,
    CaseStudySchema,
    ProjectMediaSchema,
    CASE_STUDY_SECTION_IDS,
  } = await load("src/schemas/portfolio.ts");
  const { PERSONAL_PROJECTS, PROFESSIONAL_PROJECTS, getPublishedProjects } =
    await load("src/data/projects.ts");
  const { EXPERIENCE } = await load("src/data/experience.ts");
  const {
    getWorkProjects,
    getWorkPaths,
    getRelatedProjects,
    workHref,
    getProjectSourceIds,
  } = await load("src/lib/work.ts");
  const { validateProjectAssets } = await load("src/lib/project-assets.ts");
  const { default: CaseStudyPage } = await load(
    "src/components/work/CaseStudyPage.tsx",
  );
  const { default: WorkPortfolio } = await load(
    "src/components/work/WorkPortfolio.tsx",
  );
  const volunteer = PERSONAL_PROJECTS.find(
    (p) => p.id === "community-driven-social-volunteering-platform",
  );
  const chemistry = PERSONAL_PROJECTS.find(
    (p) => p.id === "chemistry-calculator",
  );
  const courseflow = PERSONAL_PROJECTS.find((p) => p.id === "courseflow");
  const renderCase = (project) =>
    renderToStaticMarkup(
      createElement(CaseStudyPage, {
        project,
        related: getRelatedProjects(project),
      }),
    );

  await t.test(
    "all case-study records validate and generate the three requested paths",
    () => {
      [...PERSONAL_PROJECTS, ...PROFESSIONAL_PROJECTS].forEach((p) =>
        assert.doesNotThrow(() => ProjectSchema.parse(p)),
      );
      assert.deepEqual(
        getWorkPaths()
          .map((path) => path.params.slug)
          .sort(),
        [
          "chemistry-calculator",
          "community-driven-social-volunteering-platform",
          "courseflow",
        ],
      );
      assert.deepEqual(
        getWorkPaths().map((path) => workHref(path.props.project)),
        getWorkProjects().map(workHref),
      );
    },
  );
  await t.test(
    "only an explicit brief opt-in gives an unverified draft a route",
    () => {
      assert.equal(
        getPublishedProjects(PERSONAL_PROJECTS).includes(courseflow),
        false,
      );
      assert.deepEqual(
        getWorkProjects([
          {
            ...courseflow,
            caseStudy: { ...courseflow.caseStudy, publicPreview: false },
          },
        ]),
        [],
      );
      assert.deepEqual(
        getWorkProjects([
          { ...volunteer, id: "hidden-draft", publication: "draft" },
        ]),
        [],
      );
      assert.equal(
        ProjectSchema.safeParse({
          ...volunteer,
          caseStudy: { ...volunteer.caseStudy, publicPreview: true },
        }).success,
        false,
      );
      assert.equal(
        ProjectSchema.safeParse({
          ...courseflow,
          technologies: ["Unverified stack"],
        }).success,
        false,
      );
      assert.equal(
        CaseStudySchema.safeParse({
          ...courseflow.caseStudy,
          codeSamples: volunteer.caseStudy.codeSamples,
        }).success,
        false,
      );
    },
  );
  await t.test(
    "employer projects have no work routes or expanded confidential content",
    () => {
      assert.deepEqual(getWorkProjects(PROFESSIONAL_PROJECTS), []);
      assert.equal(
        ProjectSchema.safeParse({
          ...PROFESSIONAL_PROJECTS[0],
          caseStudy: volunteer.caseStudy,
        }).success,
        false,
      );
    },
  );
  await t.test(
    "complete studies require all sections and cannot hide missing details",
    () => {
      assert.equal(
        CaseStudySchema.safeParse({ ...volunteer.caseStudy, status: "ready" })
          .success,
        false,
      );
      assert.equal(
        CaseStudySchema.safeParse({
          ...volunteer.caseStudy,
          sections: volunteer.caseStudy.sections.slice(1),
        }).success,
        false,
      );
      assert.equal(
        CaseStudySchema.safeParse({
          ...volunteer.caseStudy,
          sections: volunteer.caseStudy.sections.map((s) => ({
            ...s,
            id: "role",
          })),
        }).success,
        false,
      );
      assert.equal(
        CaseStudySchema.safeParse({
          ...volunteer.caseStudy,
          sections: volunteer.caseStudy.sections.map((s) =>
            s.id === "lessons"
              ? {
                  ...s,
                  claims: [
                    {
                      text: "Unsupported lesson",
                      sourceIds: ["user-content-brief"],
                    },
                  ],
                }
              : s,
          ),
        }).success,
        false,
      );
    },
  );
  await t.test(
    "diagram nodes, edges, and claim provenance are validated",
    () => {
      const diagram = volunteer.caseStudy.diagram;
      assert.equal(
        CaseStudySchema.safeParse({
          ...volunteer.caseStudy,
          diagram: { ...diagram, nodes: [diagram.nodes[0], diagram.nodes[0]] },
        }).success,
        false,
      );
      assert.equal(
        CaseStudySchema.safeParse({
          ...volunteer.caseStudy,
          diagram: {
            ...diagram,
            edges: [{ ...diagram.edges[0], to: "unknown-node" }],
          },
        }).success,
        false,
      );
      assert.equal(
        CaseStudySchema.safeParse({
          ...volunteer.caseStudy,
          codeSamples: [
            {
              ...volunteer.caseStudy.codeSamples[0],
              sourceIds: ["unreviewed-source"],
            },
          ],
        }).success,
        false,
      );
      assert.ok(getProjectSourceIds(chemistry).includes("chemistry-panels"));
    },
  );
  const media = {
    id: "approved-preview",
    kind: "screenshot",
    src: "/projects/example/preview.svg",
    alt: "Test preview with a labeled interface",
    caption: "Approved test fixture",
    credit: "Test fixture",
    width: 640,
    height: 360,
    clearance: "public",
    sourceIds: ["user-content-brief"],
  };
  await t.test(
    "future media require alt text, dimensions, public clearance and a local asset path",
    () => {
      assert.equal(ProjectMediaSchema.safeParse(media).success, true);
      for (const invalid of [
        { alt: "" },
        { width: 0 },
        { clearance: "private" },
        { src: "/projects/../private/cv.svg" },
        { src: "https://example.com/private.png" },
      ])
        assert.equal(
          ProjectMediaSchema.safeParse({ ...media, ...invalid }).success,
          false,
        );
    },
  );
  await t.test(
    "asset validation rejects missing files and links escaping public assets",
    () => {
      const publicRoot = join(temporary, "public");
      mkdirSync(join(publicRoot, "projects", "example"), { recursive: true });
      const withMedia = {
        ...volunteer,
        caseStudy: { ...volunteer.caseStudy, media: [media] },
      };
      assert.throws(
        () => validateProjectAssets(withMedia, publicRoot),
        /Missing project media/,
      );
      writeFileSync(
        join(publicRoot, "projects", "example", "preview.svg"),
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
      );
      assert.doesNotThrow(() => validateProjectAssets(withMedia, publicRoot));
      const outside = join(temporary, "outside.svg");
      writeFileSync(outside, "<svg/>");
      symlinkSync(
        outside,
        join(publicRoot, "projects", "example", "escape.svg"),
      );
      assert.throws(
        () =>
          validateProjectAssets(
            {
              ...volunteer,
              caseStudy: {
                ...volunteer.caseStudy,
                media: [{ ...media, src: "/projects/example/escape.svg" }],
              },
            },
            publicRoot,
          ),
        /escapes public assets/,
      );
    },
  );
  await t.test(
    "case pages render every section, source code, diagram and explicit gaps without hydration",
    () => {
      for (const project of [volunteer, chemistry, courseflow]) {
        const html = renderCase(project);
        assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
        CASE_STUDY_SECTION_IDS.forEach((id) =>
          assert.ok(html.includes(`id="${id}"`), `${project.id}/${id}`),
        );
        assert.ok(html.includes("No live demo link has been verified"));
        assert.ok(
          html.includes("No measured impact, performance, or usage metrics"),
        );
        assert.ok(html.includes("No approved product screenshots"));
        assert.ok(html.includes('aria-label="Related projects"'));
        assert.ok(!html.includes("astro-island"));
      }
      const html = renderCase(volunteer);
      assert.match(html, /architecture-visual/);
      assert.match(html, /GET  \/api\/events/);
      assert.match(html, /updating its status with PATCH/);
    },
  );
  await t.test(
    "fork attribution and unverified individual contributions remain visible",
    () => {
      const html = renderCase(chemistry);
      assert.ok(html.includes("Fork of IIT-NSTU/chemistry-calculator"));
      assert.ok(
        html.includes("https://github.com/IIT-NSTU/chemistry-calculator"),
      );
      assert.ok(html.includes("not claimed as my individual implementation"));
      assert.ok(
        html.includes(
          "My exact changes and contribution scope have not been verified",
        ),
      );
    },
  );
  await t.test(
    "CourseFlow brief does not inherit another project’s stack, features or links",
    () => {
      const html = renderCase(courseflow);
      assert.match(html, /Project brief pending/);
      assert.match(html, /not a completed case study/);
      assert.ok(!html.includes("architecture-visual"));
      assert.ok(!html.includes("case-code"));
      const beforeRelated = html.split('<nav class="related-projects"')[0];
      assert.ok(!beforeRelated.includes("Spring Boot"));
      assert.ok(!beforeRelated.includes("Java"));
      assert.ok(!beforeRelated.includes("github.com/"));
    },
  );
  await t.test(
    "portfolio separates reviewed projects, planned brief and professional contributions",
    () => {
      const html = renderToStaticMarkup(
        createElement(WorkPortfolio, {
          projects: getWorkProjects(),
          experience: EXPERIENCE,
        }),
      );
      assert.equal((html.match(/class="featured-project"/g) || []).length, 2);
      assert.match(html, /work-briefs/);
      assert.match(html, /Project brief pending/);
      assert.match(html, /work-employer-context/);
      getWorkProjects().forEach((p) =>
        assert.ok(html.includes(`href="${workHref(p)}"`)),
      );
    },
  );
  await t.test(
    "related navigation excludes unverified briefs, self and employer projects",
    () => {
      assert.deepEqual(
        getRelatedProjects(volunteer).map((p) => p.id),
        ["chemistry-calculator"],
      );
      assert.deepEqual(
        getRelatedProjects(courseflow)
          .map((p) => p.id)
          .sort(),
        [
          "chemistry-calculator",
          "community-driven-social-volunteering-platform",
        ],
      );
      assert.deepEqual(
        getRelatedProjects(volunteer, [
          ...PERSONAL_PROJECTS,
          ...PROFESSIONAL_PROJECTS,
        ]).map((p) => p.id),
        ["chemistry-calculator"],
      );
    },
  );
  await t.test(
    "structured media and metrics render only when supplied; code remains escaped",
    () => {
      const project = {
        ...volunteer,
        caseStudy: {
          ...volunteer.caseStudy,
          media: [media],
          metrics: [
            {
              label: "Fixture measurement",
              value: "12",
              context: "Test-only context",
              sourceIds: ["user-content-brief"],
            },
          ],
          codeSamples: [
            {
              ...volunteer.caseStudy.codeSamples[0],
              code: "<script>untrusted()</script>",
            },
          ],
        },
      };
      assert.doesNotThrow(() => ProjectSchema.parse(project));
      const html = renderCase(project);
      assert.ok(html.includes('alt="Test preview with a labeled interface"'));
      assert.ok(html.includes('width="640"'));
      assert.ok(html.includes('loading="lazy"'));
      assert.ok(html.includes("Fixture measurement"));
      assert.ok(html.includes("Test-only context"));
      assert.ok(html.includes("&lt;script&gt;untrusted()&lt;/script&gt;"));
      assert.ok(!html.includes("<script>untrusted()"));
    },
  );
});

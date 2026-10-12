import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
const fixtures = [
  "src/content/blog/qa-responsive-publication.mdx",
  "src/content/blog/qa-responsive-backend.mdx",
  "src/pages/qa-responsive-components.astro",
  "public/projects/qa-responsive-media.svg",
  "src/content/blog/qa-responsive-jenkins.mdx",
  "src/content/blog/qa-responsive-spring.mdx",
];
for (const file of fixtures)
  if (existsSync(file)) throw new Error(`Refusing to overwrite ${file}`);
mkdirSync("public/projects", { recursive: true });
const source = readFileSync(
  "tests/fixtures/blog/reading-sample.mdx",
  "utf8",
)
  .replace(/^draft: true$/m, "draft: false")
  .replace(/^title:.*$/m, 'title: "Responsive publication QA fixture"')
  .replace(/^date:.*$/m, 'date: "2020-01-01"')
  .replace(/^tags:.*$/m, 'tags: ["qa-checks", "angular"]');
writeFileSync(
  fixtures[0],
  source +
    `
## Overflow stress specimen

This temporary test content verifies reading and code interactions. It is removed after QA.

\`\`\`typescript title="src/features/beneficiary-registration/beneficiary-registration.validation.spec.ts"
const deliberateLongLine = "${"readable-system-boundary-".repeat(15)}";
\`\`\`

| Interface boundary | Implementation detail | Verification method |
| --- | --- | --- |
| Independent state | Explicit event contract | Reproducible keyboard sequence |
`,
);
writeFileSync(
  fixtures[1],
  `---
title: "Backend filter QA fixture"
description: "Temporary metadata-only filter specimen for browser checks."
date: "2020-01-02"
author: "Publication QA"
tags: ["qa-checks", "testing"]
topic: "backend"
draft: false
---
## A second entry
This temporary fixture verifies filtering and related navigation.
`,
);
writeFileSync(
  fixtures[2],
  `---
import Layout from "@/layouts/Layout.astro";
import { ProjectMedia } from "@/components/work/ProjectMedia";
---
<Layout title="Temporary media QA" description="Isolated responsive project-media specimen." noindex>
  <h1 class="page-title">Project media QA specimen</h1>
  <p>This diagnostic illustration is temporary test material, not a project screenshot.</p>
  <ProjectMedia media={{ id: "qa-media", kind: "diagram", src: "/projects/qa-responsive-media.svg", width: 1200, height: 800, alt: "Diagnostic frame with four visible corners and a center circle.", caption: "All four corners should remain visible, without stretching or cropping.", credit: "Temporary QA fixture", clearance: "public", sourceIds: [] }} />
</Layout>
`,
);
writeFileSync(
  fixtures[3],
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#eaf4f0"/><rect x="20" y="20" width="1160" height="760" fill="none" stroke="#087e70" stroke-width="12"/><circle cx="600" cy="400" r="200" fill="none" stroke="#087e70" stroke-width="10"/><g fill="#087e70"><rect x="20" y="20" width="100" height="100"/><rect x="1080" y="20" width="100" height="100"/><rect x="20" y="680" width="100" height="100"/><rect x="1080" y="680" width="100" height="100"/></g><text x="600" y="420" text-anchor="middle" font-family="sans-serif" font-size="48" fill="#12352e">QA / 3:2</text></svg>`,
);
for (const [index, name] of [
  [4, "reliable-jenkins-pipeline"],
  [5, "spring-boot-caching-and-async"],
]) {
  writeFileSync(
    fixtures[index],
    readFileSync("tests/fixtures/blog/reading-sample.mdx", "utf8")
      .replace(/^draft: true$/m, "draft: false")
      .replace(/^title:.*$/m, `title: "${name} layout fixture"`)
      .replace(/^date:.*$/m, 'date: "2020-01-03"'),
  );
}
console.log(JSON.stringify({ fixtures }));

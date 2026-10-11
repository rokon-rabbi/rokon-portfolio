import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const root = "docs/responsive-qa";
const reports = ["playwright-results.json", "fixture-playwright-results.json"];
const summary = {
  engines: JSON.parse(
    readFileSync(`${root}/browser-availability.json`, "utf8"),
  ),
  runs: [],
};
for (const file of reports) {
  const report = JSON.parse(readFileSync(`${root}/${file}`, "utf8"));
  const tests = [];
  function visit(suite) {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests)
        tests.push({
          title: spec.title,
          project: test.projectName,
          status: test.status,
          samples: test.results.flatMap((result) =>
            result.attachments
              .filter((item) => item.name === "responsive-measurements")
              .flatMap((item) =>
                JSON.parse(Buffer.from(item.body, "base64").toString()),
              ),
          ),
        });
    for (const child of suite.suites ?? []) visit(child);
  }
  report.suites.forEach(visit);
  const samples = tests.flatMap((test) => test.samples);
  summary.runs.push({
    report: file,
    started: report.stats.startTime,
    durationSeconds: report.stats.duration / 1000,
    passed: report.stats.expected,
    failed: report.stats.unexpected,
    skipped: report.stats.skipped,
    flaky: report.stats.flaky,
    widths: [...new Set(samples.map((sample) => sample.width))],
    layoutSamples: samples.length,
    maximumPageOverflowPx: Math.max(
      ...samples.map((sample) => sample.scrollWidth - sample.width),
    ),
    elementOverflowCount: samples.reduce(
      (sum, sample) => sum + sample.overflow.length,
      0,
    ),
    projects: [...new Set(tests.map((test) => test.project))],
    testResults: tests.map(({ samples, ...test }) => test),
  });
}
summary.screenshots = {};
for (const directory of ["screenshots", "fixture-screenshots", "before"])
  summary.screenshots[directory] = readdirSync(`${root}/${directory}`).filter(
    (file) => file.endsWith(".png"),
  ).length;
writeFileSync(`${root}/summary.json`, JSON.stringify(summary, null, 2) + "\n");
const routes = [
  "home",
  "about",
  "contact",
  "resume",
  "work",
  "chemistry",
  "volunteering",
  "courseflow",
  "blog",
  "gallery",
  "404",
];
let index =
  "# Responsive QA screenshots\n\nCaptured from the built static site in Playwright. The route matrix uses reduced motion for stable layout review. Viewport captures are 390 × 844, 768 × 1000, and 1440 × 1000. Full-page captures supplement mobile and desktop. Both themes are included. Separate scene captures exercise real Three.js under a test-only software-WebGL capability override.\n\n| Route | Mobile | Tablet | Desktop | Mobile dark | Desktop dark |\n| --- | --- | --- | --- | --- | --- |\n";
for (const route of routes)
  index += `| ${route} | [390](screenshots/${route}-light-390.png) | [768](screenshots/${route}-light-768.png) | [1440](screenshots/${route}-light-1440.png) | [390](screenshots/${route}-dark-390.png) | [1440](screenshots/${route}-dark-1440.png) |\n`;
index +=
  "\nTemporary publication fixtures use the real MDX templates and draft article bodies; they are isolated test material and have been removed from source and the release build.\n\n";
for (const route of ["article", "jenkins", "spring", "tag", "media"])
  index += `- ${route}: [mobile](fixture-screenshots/${route}-light-390.png), [tablet](fixture-screenshots/${route}-light-768.png), [desktop](fixture-screenshots/${route}-light-1440.png), [dark mobile](fixture-screenshots/${route}-dark-390.png).\n`;
index +=
  "\nComponent and fix review: [code at 320](fixture-screenshots/article-code-320.png), [TOC before](before/article-toc-double-offset-320.png), [TOC after](fixture-screenshots/article-toc-320.png), [uncropped project media](fixture-screenshots/project-media-320.png), [paused desktop scene](screenshots/scene-chromium-paused.png), [paused touch scene](screenshots/scene-touch-chromium-paused.png).\n\nFirefox and touch-emulation comparisons are named with `-firefox` and `-touch-chromium` suffixes beside the main captures. All raw measurements and test outcomes are in [summary.json](summary.json), [release results](playwright-results.json), and [fixture results](fixture-playwright-results.json).\n";
index += "\nLower-page specimens: [mobile dark tabs and filters](screenshots/gallery-controls-dark-320.png), [desktop light tabs and filters](screenshots/gallery-controls-light-1440.png), [mobile light input states](screenshots/gallery-inputs-light-320.png). Capture these with `node scripts/capture-responsive-components.mjs` before regenerating this index.\n";
writeFileSync(`${root}/README.md`, index);
console.log(
  JSON.stringify(
    summary.runs.map(({ testResults, ...run }) => run),
    null,
    2,
  ),
);

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
mkdirSync("docs/hardening", { recursive: true });
const targets = [
  ["home-1", "/"],
  ["home-2", "/"],
  ["home-3", "/"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["resume", "/resume"],
  ["work", "/work"],
  ["chemistry", "/work/chemistry-calculator"],
  ["volunteering", "/work/community-driven-social-volunteering-platform"],
  ["blog", "/blog"],
];
const reports = [];
for (const [name, path] of targets) {
  const file = `docs/hardening/lighthouse-${name}.json`;
  await new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "dlx",
        "lighthouse@13.5.0",
        origin + path,
        "--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=json",
        `--output-path=${file}`,
        "--quiet",
      ],
      { stdio: "inherit" },
    );
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Lighthouse ${name} exited ${code}`)),
    );
  });
  const result = JSON.parse(readFileSync(file));
  const sample = {
    name,
    path,
    lighthouseVersion: result.lighthouseVersion,
    fetchTime: result.fetchTime,
    scores: Object.fromEntries(
      Object.entries(result.categories).map(([key, value]) => [
        key,
        Math.round(value.score * 100),
      ]),
    ),
    lcpMs: result.audits["largest-contentful-paint"].numericValue,
    fcpMs: result.audits["first-contentful-paint"].numericValue,
    tbtMs: result.audits["total-blocking-time"].numericValue,
    cls: result.audits["cumulative-layout-shift"].numericValue,
    failedAudits: Object.values(result.audits)
      .filter((audit) => audit.score === 0)
      .map((audit) => audit.id),
    report: file,
  };
  reports.push(sample);
  console.log(JSON.stringify(sample));
}
writeFileSync(
  "docs/hardening/lighthouse-summary.json",
  JSON.stringify(
    {
      origin,
      reports,
      method:
        "Lighthouse 13.5.0 default mobile, simulated 4x CPU/150ms RTT/1638.4Kbps, production static artifact served with Brotli/gzip and security headers. Three sequential homepage runs, one for each other public route. No field INP is inferred from TBT.",
    },
    null,
    2,
  ) + "\n",
);

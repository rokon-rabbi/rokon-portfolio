import { spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  existsSync,
} from "node:fs";
import { resolve, join } from "node:path";
const fixtures = [
  "src/content/blog/qa-responsive-publication.mdx",
  "src/content/blog/qa-responsive-backend.mdx",
  "src/pages/qa-responsive-components.astro",
  "public/projects/qa-responsive-media.svg",
  "src/content/blog/qa-responsive-jenkins.mdx",
  "src/content/blog/qa-responsive-spring.mdx",
];
mkdirSync("dist", { recursive: true });
const temporary = mkdtempSync(resolve("dist", "qa-article-csp-responsive-"));
const output = join(temporary, "client");
const fixtureMode = process.argv.includes("--fixtures");
let server,
  prepared = false;
try {
  if (fixtureMode) {
    for (const file of fixtures)
      if (existsSync(file)) throw new Error(`Refusing to overwrite ${file}`);
    prepared = true;
    const result = spawnSync(
      "node",
      ["scripts/prepare-responsive-fixtures.mjs"],
      { encoding: "utf8" },
    );
    if (result.status !== 0) throw new Error(result.stdout + result.stderr);
    const blocked = spawnSync("pnpm", ["build"], { encoding: "utf8" });
    if (
      blocked.status === 0 ||
      !`${blocked.stdout}${blocked.stderr}`.includes("Refusing a release build")
    )
      throw new Error(
        "Temporary publication was not blocked from a release build",
      );
  }
  const build = spawnSync(
    "pnpm",
    ["build", ...(fixtureMode ? ["--outDir", output] : [])],
    {
      encoding: "utf8",
      env: { ...process.env, QA_ARTICLE_BUILD: fixtureMode ? "true" : "false" },
    },
  );
  if (build.status !== 0) throw new Error(build.stdout + build.stderr);
  const port = fixtureMode ? "4174" : "4175";
  const origin = `http://127.0.0.1:${port}`;
  server = spawn("node", ["scripts/serve-production.mjs"], {
    env: {
      ...process.env,
      QA_ROOT: fixtureMode ? output : "dist/client",
      QA_PORT: port,
    },
    stdio: "ignore",
  });
  for (let count = 0; count < 50; count++) {
    if (server.exitCode !== null)
      throw new Error("QA server exited unexpectedly");
    if (await fetch(origin).catch(() => null)) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "playwright",
        "test",
        ...process.argv.slice(2).filter((arg) => arg !== "--fixtures"),
      ],
      {
        env: {
          ...process.env,
          QA_ORIGIN: origin,
          QA_RESPONSIVE_FIXTURE: String(fixtureMode),
          QA_PLAYWRIGHT_REPORT: `docs/responsive-qa/${fixtureMode ? "fixture-" : ""}playwright-results.json`,
        },
        stdio: "inherit",
      },
    );
    child.once("error", reject);
    child.once("exit", resolve);
  });
  process.exitCode = code ?? 1;
} finally {
  server?.kill("SIGTERM");
  if (prepared)
    for (const file of fixtures) if (existsSync(file)) unlinkSync(file);
  rmSync(temporary, { recursive: true, force: true });
}

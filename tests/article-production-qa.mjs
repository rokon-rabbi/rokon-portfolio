import {
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from "node:fs";
import { resolve } from "node:path";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
const fixture = new URL(
  "../src/content/blog/qa-production-csp.mdx",
  import.meta.url,
);
if (existsSync(fixture))
  throw new Error(
    "Temporary article path is already occupied; refusing to overwrite it.",
  );
const temporary = mkdtempSync(resolve("dist", "qa-article-csp-"));
const output = join(temporary, "client");
let server;
try {
  const source = readFileSync(
    new URL(
      "../src/content/blog/reliable-jenkins-pipeline.mdx",
      import.meta.url,
    ),
    "utf8",
  )
    .replace(/^draft: true$/m, "draft: false")
    .replace(/^title:.*$/m, 'title: "Temporary production security fixture"')
    .replace(/^date:.*$/m, 'date: "2020-01-01"');
  writeFileSync(fixture, source);
  const blocked = spawnSync("pnpm", ["build"], { encoding: "utf8" });
  if (
    blocked.status === 0 ||
    !`${blocked.stdout}${blocked.stderr}`.includes("Refusing a release build")
  )
    throw new Error(
      "Release build did not reject temporary publication fixtures",
    );
  console.log("PASS release build refuses temporary QA publications");
  const build = spawnSync("pnpm", ["build", "--outDir", output], {
    encoding: "utf8",
    env: { ...process.env, QA_ARTICLE_BUILD: "true" },
  });
  if (build.status !== 0) throw new Error(build.stdout + build.stderr);
  server = spawn("node", ["scripts/serve-production.mjs"], {
    env: { ...process.env, QA_ROOT: output, QA_PORT: "4174" },
    stdio: "ignore",
  });
  for (let count = 0; count < 30; count++) {
    if (
      await fetch("http://127.0.0.1:4174/blog/qa-production-csp").catch(
        () => null,
      )
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const qa = spawnSync("node", ["tests/production-browser-qa.mjs"], {
    env: {
      ...process.env,
      QA_ORIGIN: "http://127.0.0.1:4174",
      QA_ARTICLE_PATH: "/blog/qa-production-csp",
    },
    stdio: "inherit",
  });
  if (qa.status !== 0) throw new Error("Production article browser QA failed");
  console.log(
    "PASS isolated production fixture; final dist/client artifact was untouched",
  );
} finally {
  server?.kill("SIGTERM");
  unlinkSync(fixture);
  rmSync(temporary, { recursive: true, force: true });
}

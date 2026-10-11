import { spawn } from "node:child_process";
import { once } from "node:events";

const origin = "http://127.0.0.1:4176";
const server = spawn(process.execPath, ["scripts/serve-production.mjs"], {
  env: { ...process.env, QA_PORT: "4176", QA_ROOT: "dist/client" },
  stdio: "inherit",
});
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("Static test server exited");
    if (await fetch(origin).catch(() => null)) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Static test server did not become ready");
  const child = spawn("pnpm", ["exec", "playwright", "test"], {
    env: {
      ...process.env,
      QA_ORIGIN: origin,
      QA_BROWSER_ENGINES: "chromium,firefox",
      QA_RESPONSIVE_FIXTURE: "false",
      QA_SCREENSHOT_DIR: "test-results/responsive/screenshots",
      QA_PLAYWRIGHT_REPORT: "docs/responsive-qa/ci-playwright-results.json",
    },
    stdio: "inherit",
  });
  const [code] = await once(child, "exit");
  process.exitCode = code ?? 1;
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) await once(server, "exit");
}

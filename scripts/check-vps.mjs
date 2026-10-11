import { spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { request as httpsRequest, Agent } from "node:https";
import assert from "node:assert/strict";
import { renderNginx } from "./prepare-vps.mjs";

// Local verification only. Mounts generated content and temporary test TLS files;
// never mounts source, Docker credentials, or the VPS filesystem into the container.
const image =
  "nginx@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94";
const fixture = process.argv.includes("--fixtures");
const reportDir = "docs/vps-qa";
mkdirSync(reportDir, { recursive: true });
const temporary = mkdtempSync("/tmp/rokon-vps-nginx-");
const containerName = `rokon-static-qa-${process.pid}`;
const fixturePaths = [
  "src/content/blog/qa-responsive-publication.mdx",
  "src/content/blog/qa-responsive-backend.mdx",
  "src/pages/qa-responsive-components.astro",
  "public/projects/qa-responsive-media.svg",
  "src/content/blog/qa-responsive-jenkins.mdx",
  "src/content/blog/qa-responsive-spring.mdx",
];
let container,
  buildDir,
  prepared = false;
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error || result.status !== 0)
    throw new Error(
      `${command}: ${result.error || result.stdout + result.stderr}`,
    );
  return result.stdout + result.stderr;
}
const results = { fixture, image, checks: [], http: [] };
const agent = new Agent({ rejectUnauthorized: false }); // Only our local, self-signed QA server.
function get(path, options = {}) {
  const url = new URL(path, "https://127.0.0.1:4181");
  assert.equal(url.origin, "https://127.0.0.1:4181");
  return new Promise((resolveRequest, reject) => {
    const request = httpsRequest(url, { agent, ...options }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () =>
        resolveRequest({
          status: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks),
        }),
      );
    });
    request.on("error", reject);
    request.setTimeout(5000, () =>
      request.destroy(new Error("Nginx request timed out")),
    );
    request.end();
  });
}
function check(name, action) {
  try {
    action();
  } catch (error) {
    throw new Error(`${name}: ${error.message}`);
  }
  results.checks.push(name);
}
try {
  if (fixture) {
    for (const path of fixturePaths)
      if (existsSync(path)) throw new Error(`Refusing to overwrite ${path}`);
    prepared = true;
    run("node", ["scripts/prepare-responsive-fixtures.mjs"]);
    const blocked = spawnSync("pnpm", ["build"], { encoding: "utf8" });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stdout + blocked.stderr, /Refusing a release build/);
    mkdirSync("dist", { recursive: true });
    buildDir = mkdtempSync(resolve("dist", "qa-article-csp-vps-"));
  }
  run(
    "pnpm",
    ["build", ...(fixture ? ["--outDir", join(buildDir, "client")] : [])],
    { env: { ...process.env, QA_ARTICLE_BUILD: String(fixture) } },
  );
  const artifact = resolve(buildDir || "dist");
  const webRoot = join(artifact, "client");
  const manifest = JSON.parse(
    readFileSync(join(artifact, "static-build.json"), "utf8"),
  );
  const headers = JSON.parse(
    readFileSync(join(artifact, "security-headers.json"), "utf8"),
  );
  check(
    "static output contains no server, Worker, runtime config, source maps or private files",
    () => {
      assert.equal(manifest.output, "static");
      assert.equal(existsSync(join(artifact, "server")), false);
      assert.equal(existsSync(join(webRoot, "_worker.js")), false);
      assert.deepEqual(
        readdirSync(webRoot, { recursive: true }).filter((file) =>
          /(?:\.env|wrangler|private|\.git|\.map$|\.mjs$)/i.test(file),
        ),
        [],
      );
    },
  );
  results.origin = manifest.origin;
  results.htmlRoutes = manifest.routes;
  results.publicFileCount = readdirSync(webRoot, { recursive: true }).filter(
    (file) => statSync(join(webRoot, file)).isFile(),
  ).length;
  const production = renderNginx({
    releaseRoot: "/srv/www/rokon/releases/RELEASE",
    origin: manifest.origin,
  });
  // Fixture artifacts live in their own temporary directory. Create the mount
  // target there too: Docker cannot create it inside a read-only release mount.
  writeFileSync(join(artifact, "nginx-site.conf"), production.site);
  writeFileSync(join(artifact, "nginx-static-server.conf"), production.server);
  writeFileSync(
    join(artifact, "nginx-hosting.json"),
    JSON.stringify(production.hosting, null, 2) + "\n",
  );
  const qa = renderNginx({
    releaseRoot: "/release",
    origin: manifest.origin,
    certificate: "/qa/cert.pem",
    privateKey: "/qa/key.pem",
    httpPort: 8080,
    httpsPort: 8443,
  });
  writeFileSync(join(temporary, "site.conf"), qa.site);
  writeFileSync(join(temporary, "static-server.conf"), qa.server);
  writeFileSync(
    join(temporary, "nginx.conf"),
    `pid /tmp/nginx.pid;\nerror_log /dev/stderr warn;\nevents {}\nhttp {\n include /etc/nginx/mime.types;\n default_type application/octet-stream;\n access_log /dev/stdout;\n client_body_temp_path /tmp/client;\n proxy_temp_path /tmp/proxy;\n fastcgi_temp_path /tmp/fastcgi;\n uwsgi_temp_path /tmp/uwsgi;\n scgi_temp_path /tmp/scgi;\n include /qa/site.conf;\n}\n`,
  );
  run("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-sha256",
    "-nodes",
    "-keyout",
    join(temporary, "key.pem"),
    "-out",
    join(temporary, "cert.pem"),
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
  ]);
  const mountArgs = [
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--security-opt=label=disable",
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=16m",
    "-v",
    `${artifact}:/release:ro`,
    "-v",
    `${temporary}:/qa:ro`,
    "-v",
    `${temporary}/static-server.conf:/release/nginx-static-server.conf:ro`,
    "--entrypoint",
    "nginx",
  ];
  results.nginxVersion = run("docker", [
    "run",
    "--rm",
    ...mountArgs,
    image,
    "-v",
  ]).trim();
  results.syntax = run("docker", [
    "run",
    "--rm",
    ...mountArgs,
    image,
    "-t",
    "-c",
    "/qa/nginx.conf",
  ]).trim();
  container = run("docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    containerName,
    "-p",
    "127.0.0.1:4180:8080",
    "-p",
    "127.0.0.1:4181:8443",
    ...mountArgs,
    image,
    "-c",
    "/qa/nginx.conf",
    "-g",
    "daemon off;",
  ]).trim();
  for (let n = 0; n < 50; n++) {
    if (await get("/").catch(() => null)) break;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  for (const route of manifest.routes.filter(
    (route) => route !== "/404.html",
  )) {
    const response = await get(route);
    check(
      `${route}: HTML, exact CSP, revalidation and noindex survive static hosting`,
      () => {
        assert.equal(response.status, 200);
        assert.match(response.headers["content-type"], /^text\/html/);
        const path = route === "/" ? "/index.html" : `${route}/index.html`;
        assert.equal(
          response.headers["content-security-policy"],
          headers.pages[path]["Content-Security-Policy"],
        );
        assert.equal(
          response.headers["x-robots-tag"],
          headers.pages[path]["X-Robots-Tag"],
        );
        assert.equal(response.headers["cache-control"], "no-cache");
      },
    );
    results.http.push({
      route,
      status: response.status,
      type: response.headers["content-type"],
    });
  }
  for (const [alias, canonical] of Object.entries(manifest.redirects)) {
    const response = await get(`${alias}?qa=retained`);
    check(`${alias}: canonical redirect preserves the query`, () => {
      assert.equal(response.status, 308);
      assert.equal(response.headers.location, `${canonical}?qa=retained`);
    });
  }
  const fileCases = [
    ["/rss.xml", /application\/rss\+xml/],
    ["/robots.txt", /text\/plain/],
    ["/sitemap.xml", /(?:application|text)\/xml/],
    ["/sitemap-index.xml", /(?:application|text)\/xml/],
    ["/sitemap-0.xml", /(?:application|text)\/xml/],
    ["/blog/search-index.json", /application\/json/],
    ["/resume/rokon-resume.pdf", /application\/pdf/],
    ["/resume/rokon-resume.txt", /text\/plain/],
  ];
  for (const [path, type] of fileCases) {
    const response = await get(path);
    check(
      `${path}: generated endpoint file has correct MIME and security headers`,
      () => {
        assert.equal(response.status, 200);
        assert.match(response.headers["content-type"], type);
        assert.equal(response.headers["x-content-type-options"], "nosniff");
        if (path.startsWith("/resume/"))
          assert.match(
            response.headers["content-disposition"],
            /^attachment; filename="Rokon-Resume\.(pdf|txt)"$/,
          );
      },
    );
  }
  for (const path of [
    "/unknown-nested/page",
    "/unknown-nested/page/",
    "/404.html",
    "/_astro/missing.js",
    "/_headers",
    "/.env",
    "/nested/.git/config",
    "/preview/blog/maintainable-angular-enterprise-applications",
    "/server/entry.mjs",
  ]) {
    const response = await get(path);
    check(
      `${path}: real custom HTTP 404 with CSP, noindex and no-store`,
      () => {
        assert.equal(response.status, 404);
        assert.match(response.body.toString(), /This connection/);
        assert.equal(
          response.headers["content-security-policy"],
          headers.pages["/404.html"]["Content-Security-Policy"],
        );
        assert.equal(response.headers["x-robots-tag"], "noindex, follow");
        assert.equal(response.headers["cache-control"], "no-store");
      },
    );
  }
  const js = readdirSync(join(webRoot, "_astro")).find((file) =>
    file.endsWith(".js"),
  );
  const asset = await get(`/_astro/${js}`);
  check("hashed assets have JavaScript MIME and immutable caching", () => {
    assert.equal(asset.status, 200);
    assert.match(
      asset.headers["content-type"],
      /(?:application|text)\/javascript/,
    );
    assert.equal(
      asset.headers["cache-control"],
      "public, max-age=31536000, immutable",
    );
  });
  const gzip = await get("/", { headers: { "Accept-Encoding": "gzip" } });
  check("Nginx compresses real HTML responses", () => {
    assert.equal(gzip.headers["content-encoding"], "gzip");
    assert.match(gzip.headers.vary, /Accept-Encoding/);
  });
  const initial = await get("/");
  const cached = await get("/", {
    headers: { "If-None-Match": initial.headers.etag },
  });
  check("HTML conditional revalidation returns 304 with its exact CSP", () => {
    assert.equal(cached.status, 304);
    assert.equal(
      cached.headers["content-security-policy"],
      initial.headers["content-security-policy"],
    );
  });
  const head = await get("/work/chemistry-calculator", { method: "HEAD" });
  check("nested HEAD requests return headers without a body", () => {
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
  });
  const redirect = await fetch("http://127.0.0.1:4180/work?qa=retained", {
    redirect: "manual",
  });
  check(
    "HTTP redirects to the built HTTPS origin, preserving path/query",
    () => {
      assert.equal(redirect.status, 308);
      assert.equal(
        redirect.headers.get("location"),
        `${manifest.origin}/work?qa=retained`,
      );
    },
  );
  const browserCode = await new Promise((resolveCode, reject) => {
    const child = spawn("pnpm", ["exec", "playwright", "test"], {
      stdio: "inherit",
      env: {
        ...process.env,
        QA_ORIGIN: "https://127.0.0.1:4181",
        QA_IGNORE_HTTPS_ERRORS: "true",
        QA_RESPONSIVE_FIXTURE: String(fixture),
        QA_PLAYWRIGHT_REPORT: `${reportDir}/${fixture ? "fixture-" : ""}playwright-results.json`,
      },
    });
    child.once("error", reject);
    child.once("exit", resolveCode);
  });
  assert.equal(browserCode, 0, "Playwright against real Nginx failed");
  results.passed = true;
} catch (error) {
  results.passed = false;
  results.failure = String(error);
  if (container)
    results.containerLogs = spawnSync("docker", ["logs", containerName], {
      encoding: "utf8",
    }).stdout;
  process.exitCode = 1;
} finally {
  if (container)
    spawnSync("docker", ["stop", "--time", "2", containerName], {
      encoding: "utf8",
    });
  agent.destroy();
  if (prepared) for (const path of fixturePaths) rmSync(path, { force: true });
  if (buildDir) rmSync(buildDir, { recursive: true, force: true });
  rmSync(temporary, { recursive: true, force: true });
  writeFileSync(
    `${reportDir}/${fixture ? "fixture-" : ""}nginx-results.json`,
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: results.passed,
      checks: results.checks.length,
      nginx: results.nginxVersion,
      failure: results.failure,
    }),
  );
}

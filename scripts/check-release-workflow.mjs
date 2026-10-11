import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { request } from "node:https";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  chmodSync,
  rmSync,
  readlinkSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { renderNginx } from "./prepare-vps.mjs";

// Local test only: no SSH, no public DNS requests, no system web-server changes.
const image =
  "nginx@sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94";
const temporary = mkdtempSync("/tmp/portfolio-release-workflow-");
const base = join(temporary, "site");
mkdirSync(base, { mode: 0o755 });
const tools = resolve("deploy");
const name = `portfolio-release-qa-${process.pid}`;
const domain = new URL(
  JSON.parse(readFileSync("dist/static-build.json")).origin,
).hostname;
const report = {
  date: new Date().toISOString(),
  image,
  originUnderTest: `https://${domain}`,
  checks: [],
  actions: [],
  httpsAssertions: 0,
};
let started = false;
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
function run(command, args, expected = 0) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    timeout: 180_000,
  });
  const output = (result.stdout || "") + (result.stderr || "");
  assert.equal(
    result.status,
    expected,
    `${command}: ${result.error || output}`,
  );
  for (const match of output.matchAll(
    /HTTPS verification passed .*?: (\d+) checks/g,
  ))
    report.httpsAssertions += Number(match[1]);
  return output;
}
function hook(id, body) {
  const path = join(temporary, id);
  writeFileSync(path, `#!/usr/bin/env bash\nset -eu\n${body}\n`, {
    mode: 0o755,
  });
  return path;
}
const curlFlags = `--connect-ip 127.0.0.1 --https-port 4181 --ca-cert ${quote(join(temporary, "cert.pem"))}`;
const checker = `bash ${quote(join(tools, "check-deployment.sh"))}`;
const plainCheck = hook(
  "check",
  `exec docker exec ${name} nginx -t -c /qa/nginx.conf`,
);
const reload = hook(
  "reload",
  `exec docker exec ${name} nginx -s reload -c /qa/nginx.conf`,
);
const verify = hook("verify", `exec ${checker} "$@" ${curlFlags}`);
function action(label, script, args, expected = 0) {
  const output = run(
    "bash",
    [join(tools, script), "--base", base, "--domain", domain, ...args],
    expected,
  );
  report.actions.push({ label, expectedExit: expected, output });
}
function artifact(id, enhance = false) {
  const directory = join(temporary, `incoming-${id}`);
  mkdirSync(directory);
  cpSync("dist/client", join(directory, "client"), { recursive: true });
  for (const file of [
    "static-build.json",
    "security-headers.json",
    "nginx-security-map.conf",
    "nginx-routing-map.conf",
    "nginx-security-headers.conf",
  ])
    cpSync(join("dist", file), join(directory, file));
  if (enhance) {
    const script = `window.__DEPLOYMENT_QA__ = "${id}";`;
    const headers = JSON.parse(
      readFileSync(join(directory, "security-headers.json")),
    );
    const old = headers.pages["/index.html"]["Content-Security-Policy"];
    const meta = old.replace(/; frame-ancestors 'none'$/, "");
    const hashed = `'sha256-${createHash("sha256").update(script).digest("base64")}'`;
    const policy = meta.replace(
      /(script-src )([^;]*)/,
      (_, prefix, values) => `${prefix}${values} ${hashed}`,
    );
    const final = `${policy}; frame-ancestors 'none'`;
    const home = join(directory, "client/index.html");
    writeFileSync(
      home,
      readFileSync(home, "utf8")
        .replace(
          /(http-equiv="content-security-policy"\s+content=")[^"]*(")/,
          (_, before, after) => before + policy + after,
        )
        .replace("</head>", `<script>${script}</script></head>`),
    );
    headers.pages["/index.html"]["Content-Security-Policy"] = final;
    writeFileSync(
      join(directory, "security-headers.json"),
      JSON.stringify(headers),
    );
    let map = readFileSync(join(directory, "nginx-security-map.conf"), "utf8");
    let compatibility = readFileSync(
      join(directory, "client/_headers"),
      "utf8",
    );
    for (const alias of ["/", "/index.html"]) {
      map = map.replace(`  "${alias}" "${old}";`, `  "${alias}" "${final}";`);
      compatibility = compatibility.replace(
        `\n${alias}\n  Content-Security-Policy: ${old}`,
        `\n${alias}\n  Content-Security-Policy: ${final}`,
      );
    }
    writeFileSync(join(directory, "nginx-security-map.conf"), map);
    writeFileSync(join(directory, "client/_headers"), compatibility);
    writeFileSync(
      join(directory, `client/_astro/update.${id}.a1b2c3.js`),
      script,
    );
  }
  const config = renderNginx({
    releaseRoot: `${base}/releases/${id}`,
    origin: `https://${domain}`,
    assetRoot: `${base}/shared`,
    accessLog: "/tmp/portfolio.access.log",
    errorLog: "/tmp/portfolio.error.log",
    certificate: "/qa/cert.pem",
    privateKey: "/qa/key.pem",
    acmeRoot: "/qa/acme",
  });
  writeFileSync(join(directory, "nginx-site.conf"), config.site);
  writeFileSync(join(directory, "nginx-static-server.conf"), config.server);
  writeFileSync(
    join(directory, "nginx-hosting.json"),
    JSON.stringify(config.hosting),
  );
  const files = [];
  const walk = (folder, prefix = "") => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) walk(join(folder, entry.name), relative + "/");
      else
        files.push([
          relative,
          createHash("sha256")
            .update(readFileSync(join(directory, "client", relative)))
            .digest("hex"),
        ]);
    }
  };
  walk(join(directory, "client"));
  const manifest = JSON.parse(
    readFileSync(join(directory, "static-build.json")),
  );
  manifest.publicSha256 = Object.fromEntries(files);
  writeFileSync(join(directory, "static-build.json"), JSON.stringify(manifest));
  return directory;
}
function https(path) {
  return new Promise((resolveResponse, reject) => {
    const req = request(
      {
        hostname: domain,
        port: 4181,
        path,
        ca: readFileSync(join(temporary, "cert.pem")),
        lookup: (_hostname, options, callback) =>
          options.all
            ? callback(null, [{ address: "127.0.0.1", family: 4 }])
            : callback(null, "127.0.0.1", 4),
      },
      (response) => {
        const parts = [];
        response.on("data", (part) => parts.push(part));
        response.on("end", () =>
          resolveResponse({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(parts),
          }),
        );
      },
    );
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(new Error("Local HTTPS timed out")));
    req.end();
  });
}
try {
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
    `/CN=${domain}`,
    "-addext",
    `subjectAltName=DNS:${domain}`,
  ]);
  mkdirSync(join(temporary, "acme/.well-known/acme-challenge"), {
    recursive: true,
  });
  writeFileSync(
    join(temporary, "acme/.well-known/acme-challenge/qa-token"),
    "local-acme-proof\n",
  );
  const include = readFileSync(
    join(tools, "nginx.conf.example"),
    "utf8",
  ).replaceAll("@BASE@", base);
  writeFileSync(join(temporary, "site-include.conf"), include);
  writeFileSync(
    join(temporary, "nginx.conf"),
    `pid /tmp/nginx.pid;\nerror_log /dev/stderr warn;\nevents {}\nhttp {\n include /etc/nginx/mime.types;\n default_type application/octet-stream;\n access_log /dev/stdout;\n client_body_temp_path /tmp/client;\n proxy_temp_path /tmp/proxy;\n fastcgi_temp_path /tmp/fastcgi;\n uwsgi_temp_path /tmp/uwsgi;\n scgi_temp_path /tmp/scgi;\n include /qa/site-include.conf;\n}\n`,
  );
  const mounts = [
    "--read-only",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges",
    "--security-opt=label=disable",
    "--user",
    `${process.getuid()}:${process.getgid()}`,
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=16m",
    "-v",
    `${base}:${base}:ro`,
    "-v",
    `${temporary}:/qa:ro`,
    "--entrypoint",
    "nginx",
  ];
  report.nginxVersion = run("docker", [
    "run",
    "--rm",
    ...mounts,
    image,
    "-v",
  ]).trim();
  run("docker", [
    "run",
    "--rm",
    ...mounts,
    image,
    "-t",
    "-c",
    "/qa/nginx.conf",
  ]);
  report.checks.push(
    "The reviewed wildcard include passes nginx -t with no initial release",
  );
  run("docker", [
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "-p",
    "127.0.0.1:4180:80",
    "-p",
    "127.0.0.1:4181:443",
    ...mounts,
    image,
    "-c",
    "/qa/nginx.conf",
    "-g",
    "daemon off;",
  ]);
  started = true;
  const hooks = [
    "--check-hook",
    plainCheck,
    "--reload-hook",
    reload,
    "--verify-hook",
    verify,
  ];
  const first = artifact("r1");
  action("initial preview", "deploy.sh", [
    "--source",
    first,
    "--release",
    "r1",
  ]);
  assert.deepEqual(readdirSync(base), []);
  report.checks.push(
    "Default deployment plan makes no filesystem/service changes",
  );
  action("first manual staging", "deploy.sh", [
    "--source",
    first,
    "--release",
    "r1",
    "--apply",
  ]);
  action("first activation of staged release", "deploy.sh", [
    "--release",
    "r1",
    "--apply",
    "--activate",
    ...hooks,
  ]);
  report.checks.push(
    "First non-root activation validates full Nginx configuration, reloads and verifies real HTTPS",
  );
  const second = artifact("r2", true);
  const oldWorkerCheck = hook(
    "check-old-workers",
    `${checker} --base ${quote(base)} --domain ${domain} --release r1 ${curlFlags}\nexec docker exec ${name} nginx -t -c /qa/nginx.conf`,
  );
  action("second activation with live old-worker proof", "deploy.sh", [
    "--source",
    second,
    "--release",
    "r2",
    "--apply",
    "--activate",
    "--check-hook",
    oldWorkerCheck,
    "--reload-hook",
    reload,
    "--verify-hook",
    verify,
  ]);
  assert.equal(readlinkSync(join(base, "current")), "releases/r2");
  assert.equal(readlinkSync(join(base, "previous")), "releases/r1");
  report.checks.push(
    "After current switches, old workers still serve r1 bytes/CSP until reload; new workers serve r2's changed inline-script CSP",
  );
  const rollbackCheck = hook(
    "check-before-rollback",
    `${checker} --base ${quote(base)} --domain ${domain} --release r2 ${curlFlags}\nexec docker exec ${name} nginx -t -c /qa/nginx.conf`,
  );
  action("previous-release rollback", "rollback.sh", [
    "--apply",
    "--check-hook",
    rollbackCheck,
    "--reload-hook",
    reload,
    "--verify-hook",
    verify,
  ]);
  assert.equal(readlinkSync(join(base, "current")), "releases/r1");
  assert.equal(readlinkSync(join(base, "previous")), "releases/r2");
  const retained = await https("/_astro/update.r2.a1b2c3.js");
  assert.equal(retained.status, 200);
  assert.equal(
    retained.headers["cache-control"],
    "public, max-age=31536000, immutable",
  );
  assert.match(retained.body.toString(), /"r2"/);
  report.checks.push(
    "Rollback is verified over HTTPS and displaced-release assets remain available with immutable caching",
  );
  const third = artifact("r3", true);
  const rejectThird = hook(
    "verify-reject-r3",
    `${checker} "$@" ${curlFlags}\nfor arg in "$@"; do if [[ "$arg" == r3 ]]; then exit 1; fi; done`,
  );
  action(
    "injected post-reload verification failure and recovery",
    "deploy.sh",
    [
      "--source",
      third,
      "--release",
      "r3",
      "--apply",
      "--activate",
      "--check-hook",
      plainCheck,
      "--reload-hook",
      reload,
      "--verify-hook",
      rejectThird,
    ],
    1,
  );
  assert.equal(readlinkSync(join(base, "current")), "releases/r1");
  assert.equal(readlinkSync(join(base, "previous")), "releases/r2");
  assert.ok(existsSync(join(base, "releases/r3")));
  assert.equal(existsSync(join(base, "activation.pending")), false);
  report.checks.push(
    "A deliberately failed live candidate restores both links, reloads and verifies r1; failed release retained",
  );
  action("final public-file and header verification", "check-deployment.sh", [
    "--connect-ip",
    "127.0.0.1",
    "--https-port",
    "4181",
    "--ca-cert",
    join(temporary, "cert.pem"),
  ]);
  action(
    "self-signed TLS correctly rejected by default CA trust",
    "check-deployment.sh",
    ["--connect-ip", "127.0.0.1", "--https-port", "4181", "--attempts", "1"],
    1,
  );
  report.checks.push(
    "HTTPS checker accepts the explicit local CA and rejects untrusted TLS with default settings",
  );
  const acme = await fetch(
    "http://127.0.0.1:4180/.well-known/acme-challenge/qa-token",
    { redirect: "manual" },
  );
  assert.equal(acme.status, 200);
  assert.equal(await acme.text(), "local-acme-proof\n");
  const redirect = await fetch("http://127.0.0.1:4180/about?source=qa", {
    redirect: "manual",
  });
  assert.equal(redirect.status, 308);
  assert.equal(
    redirect.headers.get("location"),
    `https://${domain}/about?source=qa`,
  );
  report.checks.push(
    "HTTP-01 webroot remains available while ordinary HTTP requests redirect to the built HTTPS origin",
  );
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = String(error);
  if (started)
    report.containerLogs = spawnSync("docker", ["logs", name], {
      encoding: "utf8",
    }).stdout;
  process.exitCode = 1;
} finally {
  if (started) run("docker", ["stop", "--time", "2", name]);
  const writable = (directory) => {
    chmodSync(directory, 0o700);
    for (const entry of readdirSync(directory, { withFileTypes: true }))
      if (entry.isDirectory()) writable(join(directory, entry.name));
  };
  writable(temporary);
  rmSync(temporary, { recursive: true, force: true });
  mkdirSync("docs/deployment-qa", { recursive: true });
  writeFileSync(
    "docs/deployment-qa/workflow-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: report.checks.length,
      httpsAssertions: report.httpsAssertions,
      error: report.error,
    }),
  );
}

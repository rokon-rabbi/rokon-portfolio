import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  readlinkSync,
  chmodSync,
  rmSync,
  symlinkSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { renderNginx } from "../scripts/prepare-vps.mjs";

const tools = resolve("deploy");
const domain = new URL(
  JSON.parse(readFileSync("dist/static-build.json")).origin,
).hostname;
const sidecars = [
  "static-build.json",
  "security-headers.json",
  "nginx-security-map.conf",
  "nginx-routing-map.conf",
  "nginx-security-headers.conf",
];
const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
function updateBuildInventory(source) {
  const client = join(source, "client");
  const files = [];
  const walk = (directory, prefix = "") => {
    for (const name of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + name.name;
      if (name.isDirectory()) walk(join(directory, name.name), relative + "/");
      else
        files.push([
          relative,
          createHash("sha256")
            .update(readFileSync(join(client, relative)))
            .digest("hex"),
        ]);
    }
  };
  walk(client);
  const path = join(source, "static-build.json");
  const manifest = JSON.parse(readFileSync(path));
  manifest.publicSha256 = Object.fromEntries(files);
  writeFileSync(path, JSON.stringify(manifest));
}
function fixture(t) {
  const root = mkdtempSync("/tmp/portfolio-deploy-test-");
  const base = join(root, "site");
  mkdirSync(base, { mode: 0o755 });
  t.after(() => {
    const writable = (directory) => {
      chmodSync(directory, 0o700);
      for (const name of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, name.name);
        if (name.isDirectory()) writable(path);
      }
    };
    writable(root);
    rmSync(root, { recursive: true, force: true });
  });
  const artifact = (id, extraAsset = false) => {
    const path = join(root, `incoming-${id}`);
    mkdirSync(path);
    cpSync("dist/client", join(path, "client"), { recursive: true });
    for (const name of sidecars) cpSync(join("dist", name), join(path, name));
    const config = renderNginx({
      releaseRoot: `${base}/releases/${id}`,
      origin: `https://${domain}`,
      assetRoot: `${base}/shared`,
      accessLog: "/var/log/nginx/portfolio.access.log",
      errorLog: "/var/log/nginx/portfolio.error.log",
    });
    writeFileSync(join(path, "nginx-site.conf"), config.site);
    writeFileSync(join(path, "nginx-static-server.conf"), config.server);
    writeFileSync(
      join(path, "nginx-hosting.json"),
      JSON.stringify(config.hosting),
    );
    if (extraAsset)
      writeFileSync(
        join(path, "client/_astro/update.a1b2c3.js"),
        "export const release = 2;\n",
      );
    updateBuildInventory(path);
    return path;
  };
  const run = (script, ...args) =>
    spawnSync(
      "bash",
      [join(tools, script), "--base", base, "--domain", domain, ...args],
      { encoding: "utf8" },
    );
  const hook = (name, body = "exit 0\n") => {
    const path = join(root, name);
    writeFileSync(path, `#!/usr/bin/env bash\nset -eu\n${body}`, {
      mode: 0o755,
    });
    return path;
  };
  const hooks = (verifyBody) => [
    "--check-hook",
    hook("check"),
    "--reload-hook",
    hook("reload"),
    "--verify-hook",
    hook(
      "verify",
      verifyBody ||
        `exec bash ${quote(join(tools, "check-deployment.sh"))} "$@" --offline\n`,
    ),
  ];
  const stage = (id, ...args) =>
    run(
      "deploy.sh",
      "--source",
      artifact(id),
      "--release",
      id,
      "--apply",
      ...args,
    );
  return { root, base, artifact, run, hook, hooks, stage };
}
function passed(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
}
function failed(result, pattern) {
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, pattern);
}

function retentionFixture(t) {
  const f = fixture(t);
  for (const id of ["r1", "r2", "r3", "r4"]) {
    passed(f.stage(id, "--activate", ...f.hooks()));
    const receiptPath = join(f.base, `releases/${id}/release-receipt.json`);
    chmodSync(receiptPath, 0o600);
    const receipt = JSON.parse(readFileSync(receiptPath));
    receipt.created = "2020-01-01T00:00:00+00:00";
    writeFileSync(receiptPath, JSON.stringify(receipt));
    chmodSync(receiptPath, 0o444);
  }
  const prune = (...args) =>
    spawnSync(
      "python3",
      [
        join(tools, "release.py"),
        "prune",
        "--base",
        f.base,
        "--domain",
        domain,
        "--keep-releases",
        "2",
        ...args,
      ],
      { encoding: "utf8" },
    );
  return { ...f, prune };
}

test("release retention observes a grace period since last activation and is plan-only by default", (t) => {
  const f = retentionFixture(t);
  passed(f.prune("--apply"));
  assert.deepEqual(readdirSync(join(f.base, "releases")).sort(), [
    "r1",
    "r2",
    "r3",
    "r4",
  ]);
  writeFileSync(join(f.base, "deployment.log"), ""); // Fixture has no draining historical workers.
  passed(f.prune());
  assert.deepEqual(readdirSync(join(f.base, "releases")).sort(), [
    "r1",
    "r2",
    "r3",
    "r4",
  ]);
  assert.equal(existsSync(join(f.base, ".backups/r1.tar.gz")), false);
});

test("release retention archives verified candidates and preserves current, previous, shared assets and unrelated files", (t) => {
  const f = retentionFixture(t);
  writeFileSync(join(f.base, "deployment.log"), "");
  writeFileSync(join(f.base, "administrator-notes.txt"), "leave untouched");
  const shared = readdirSync(join(f.base, "shared/_astro")).sort();
  passed(f.prune("--apply"));
  assert.deepEqual(readdirSync(join(f.base, "releases")).sort(), ["r3", "r4"]);
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r4");
  assert.equal(readlinkSync(join(f.base, "previous")), "releases/r3");
  assert.ok(existsSync(join(f.base, ".backups/r1.tar.gz")));
  assert.ok(existsSync(join(f.base, ".backups/r2.tar.gz")));
  assert.equal(statSync(join(f.base, ".backups")).mode & 0o777, 0o700);
  assert.equal(
    readFileSync(join(f.base, "administrator-notes.txt"), "utf8"),
    "leave untouched",
  );
  assert.deepEqual(readdirSync(join(f.base, "shared/_astro")).sort(), shared);
  passed(f.run("rollback.sh", "--apply", ...f.hooks()));
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r3");
});

test("release retention refuses unknown or corrupted entries before any deletion", (t) => {
  const f = retentionFixture(t);
  writeFileSync(join(f.base, "deployment.log"), "");
  mkdirSync(join(f.base, "releases/unrelated"));
  failed(f.prune("--apply"), /Artifact must contain only/);
  assert.ok(existsSync(join(f.base, "releases/r1")));
  rmSync(join(f.base, "releases/unrelated"), { recursive: true });
  const target = join(f.base, "releases/r1/client/index.html");
  chmodSync(target, 0o600);
  writeFileSync(target, "corrupted");
  failed(f.prune("--apply"), /checksum mismatch/);
  assert.ok(existsSync(join(f.base, "releases/r2")));
  assert.equal(existsSync(join(f.base, ".backups")), false);
});

test("deployment preview validates artifacts without writing files or executing hooks", (t) => {
  const f = fixture(t);
  const action = f.run(
    "deploy.sh",
    "--source",
    f.artifact("r1"),
    "--release",
    "r1",
    "--activate",
  );
  passed(action);
  assert.match(action.stdout, /PLAN ONLY/);
  assert.deepEqual(readdirSync(f.base), []);
});

test("staging seals public files, records checksums and publishes readable shared assets", (t) => {
  const f = fixture(t);
  passed(f.stage("r1"));
  assert.equal(existsSync(join(f.base, "current")), false);
  passed(f.run("check-deployment.sh", "--release", "r1", "--offline"));
  const receipt = JSON.parse(
    readFileSync(join(f.base, "releases/r1/release-receipt.json")),
  );
  assert.equal(receipt.domain, domain);
  assert.ok(receipt.sha256["client/index.html"]);
  assert.ok(readdirSync(join(f.base, "shared/_astro")).length);
  assert.equal(statSync(join(f.base, "releases")).mode & 0o777, 0o755);
  assert.equal(
    statSync(join(f.base, "releases/r1/client/index.html")).mode & 0o777,
    0o444,
  );
  assert.equal(
    statSync(join(f.base, "releases/r1/client")).mode & 0o777,
    0o555,
  );
});

test("incomplete transfers and accidental private file types cannot be staged", (t) => {
  const f = fixture(t);
  const source = f.artifact("r1");
  const file = readdirSync(join(source, "client/_astro")).find((name) =>
    name.endsWith(".js"),
  );
  rmSync(join(source, "client/_astro", file));
  failed(
    f.run("deploy.sh", "--source", source, "--release", "r1", "--apply"),
    /inventory\/checksum mismatch/,
  );
  const second = f.artifact("r2");
  writeFileSync(
    join(second, "client/accidental.pem"),
    "test-only nonsecret material",
  );
  updateBuildInventory(second);
  failed(
    f.run("deploy.sh", "--source", second, "--release", "r2", "--apply"),
    /Unexpected public file type/,
  );
  assert.deepEqual(readdirSync(f.base), []);
});

test("wrong origins and roots, symlinked content and injected Nginx directives are rejected", (t) => {
  const f = fixture(t);
  const source = f.artifact("r1");
  failed(
    f.run(
      "deploy.sh",
      "--source",
      source,
      "--release",
      "r1",
      "--domain",
      "different.example",
      "--apply",
    ),
    /origin/,
  );
  failed(
    f.run("deploy.sh", "--source", source, "--release", "r2", "--apply"),
    /release root/,
  );
  const config = join(source, "nginx-site.conf");
  const original = readFileSync(config);
  writeFileSync(config, original + "server { listen 9999; }\n");
  failed(
    f.run("deploy.sh", "--source", source, "--release", "r1", "--apply"),
    /Unexpected directives/,
  );
  writeFileSync(config, original);
  symlinkSync("index.html", join(source, "client/linked.html"));
  failed(
    f.run("deploy.sh", "--source", source, "--release", "r1", "--apply"),
    /Symlink/,
  );
  assert.deepEqual(readdirSync(f.base), []);
});

test("transfer or release corruption fails integrity checks", (t) => {
  const f = fixture(t);
  passed(f.stage("r1"));
  const home = join(f.base, "releases/r1/client/index.html");
  chmodSync(home, 0o644);
  writeFileSync(home, readFileSync(home, "utf8") + "<!-- changed -->");
  failed(
    f.run("check-deployment.sh", "--release", "r1", "--offline"),
    /checksum/,
  );
});

test("immutable asset collisions cannot replace a published hash", (t) => {
  const f = fixture(t);
  passed(f.stage("r1"));
  const source = f.artifact("r2");
  const name = readdirSync(join(source, "client/_astro")).find((name) =>
    name.endsWith(".js"),
  );
  const previous = readFileSync(join(f.base, "shared/_astro", name));
  writeFileSync(
    join(source, "client/_astro", name),
    "changed bytes under an existing hash",
  );
  updateBuildInventory(source);
  failed(
    f.run("deploy.sh", "--source", source, "--release", "r2", "--apply"),
    /asset name collision/,
  );
  assert.deepEqual(readFileSync(join(f.base, "shared/_astro", name)), previous);
  assert.equal(existsSync(join(f.base, "releases/r2")), false);
  assert.deepEqual(readdirSync(join(f.base, ".staging")), []);
});

test("activation and rollback preserve current, previous and assets from both releases", (t) => {
  const f = fixture(t);
  const hooks = f.hooks();
  passed(f.stage("r1"));
  passed(f.run("deploy.sh", "--release", "r1", "--activate"));
  assert.equal(existsSync(join(f.base, "current")), false);
  passed(
    f.run("deploy.sh", "--release", "r1", "--activate", "--apply", ...hooks),
  );
  const source = f.artifact("r2", true);
  passed(
    f.run(
      "deploy.sh",
      "--source",
      source,
      "--release",
      "r2",
      "--apply",
      "--activate",
      ...hooks,
    ),
  );
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r2");
  assert.equal(readlinkSync(join(f.base, "previous")), "releases/r1");
  passed(f.run("rollback.sh"));
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r2");
  passed(f.run("rollback.sh", "--apply", ...hooks));
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r1");
  assert.equal(readlinkSync(join(f.base, "previous")), "releases/r2");
  assert.ok(existsSync(join(f.base, "shared/_astro/update.a1b2c3.js")));
  assert.equal(existsSync(join(f.base, "activation.pending")), false);
});

test("failed candidate verification restores the previous site and keeps failed release for inspection", (t) => {
  const f = fixture(t);
  passed(f.stage("r1", "--activate", ...f.hooks()));
  const verify = `for arg in "$@"; do if [[ "$arg" == r2 ]]; then exit 1; fi; done\nexec bash ${quote(join(tools, "check-deployment.sh"))} "$@" --offline\n`;
  failed(f.stage("r2", "--activate", ...f.hooks(verify)), /returned non-zero/);
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r1");
  assert.equal(existsSync(join(f.base, "previous")), false);
  assert.ok(existsSync(join(f.base, "releases/r2")));
  assert.equal(existsSync(join(f.base, "activation.pending")), false);
});

test("failed first configuration check restores an empty site selection", (t) => {
  const f = fixture(t);
  const check = f.hook(
    "first-check",
    `if [[ -L ${quote(join(f.base, "current"))} ]]; then exit 1; fi\n`,
  );
  const hooks = f.hooks();
  hooks[1] = check;
  failed(f.stage("r1", "--activate", ...hooks), /returned non-zero/);
  assert.equal(existsSync(join(f.base, "current")), false);
  assert.equal(existsSync(join(f.base, "activation.pending")), false);
});

test("failed recovery leaves a journal and blocks further deployments", (t) => {
  const f = fixture(t);
  passed(f.stage("r1", "--activate", ...f.hooks()));
  const hooks = f.hooks();
  hooks[3] = f.hook("broken-reload", "exit 1\n");
  failed(f.stage("r2", "--activate", ...hooks), /RECOVERY REQUIRED/);
  assert.equal(readlinkSync(join(f.base, "current")), "releases/r1");
  assert.ok(existsSync(join(f.base, "activation.pending")));
  failed(f.run("rollback.sh"), /activation.pending/);
});

test("unmanaged links and concurrent deployment locks cannot be overwritten", async (t) => {
  const f = fixture(t);
  const source = f.artifact("r1");
  const holder = spawn("python3", [
    "-c",
    "import fcntl,sys,time; f=open(sys.argv[1],'a'); fcntl.flock(f,fcntl.LOCK_EX); print('locked',flush=True); time.sleep(30)",
    join(f.base, ".deploy.lock"),
  ]);
  await once(holder.stdout, "data");
  try {
    failed(
      f.run("deploy.sh", "--source", source, "--release", "r1", "--apply"),
      /site lock/,
    );
  } finally {
    holder.kill();
    await once(holder, "exit");
  }
  symlinkSync("/tmp", join(f.base, "current"));
  failed(
    f.run("rollback.sh", "--release", "r1", "--apply", ...f.hooks()),
    /Artifact directory missing|Unmanaged/,
  );
  assert.equal(readlinkSync(join(f.base, "current")), "/tmp");
});

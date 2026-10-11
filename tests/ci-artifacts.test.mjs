import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import {
  buildFiles,
  stampBuild,
  verifyBuild,
  prepareArtifact,
} from "../scripts/ci-artifacts.mjs";

const identity = {
  GITHUB_SHA: "a".repeat(40),
  GITHUB_RUN_ID: "123",
  GITHUB_RUN_ATTEMPT: "2",
};
function fixture(t) {
  const root = mkdtempSync("/tmp/portfolio-ci-artifact-");
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync("dist/client", join(root, "client"), { recursive: true });
  for (const file of buildFiles) cpSync(`dist/${file}`, join(root, file));
  stampBuild(root, identity);
  return root;
}
function request(root) {
  return {
    commit: identity.GITHUB_SHA,
    run: identity.GITHUB_RUN_ID,
    attempt: identity.GITHUB_RUN_ATTEMPT,
    domain: new URL(
      JSON.parse(readFileSync(join(root, "static-build.json"))).origin,
    ).hostname,
    base: "/srv/portfolio-example",
    release: "gh-123-2-aaaaaaaaaaaa",
    certificate: "/etc/example/fullchain.pem",
    privateKey: "/etc/example/privkey.pem",
    accessLog: "/var/log/nginx/example.access.log",
    errorLog: "/var/log/nginx/example.error.log",
    acmeRoot: null,
  };
}
test("CI artifacts preserve verified public files and prepare versioned Nginx configuration", (t) => {
  const root = fixture(t),
    configuration = request(root);
  prepareArtifact(root, configuration);
  const hosting = JSON.parse(readFileSync(join(root, "nginx-hosting.json")));
  assert.equal(
    hosting.releaseRoot,
    `${configuration.base}/releases/${configuration.release}`,
  );
  assert.equal(hosting.assetRoot, `${configuration.base}/shared`);
  assert.equal(existsSync(join(root, "ci-build.json")), false);
  assert.ok(verifyBuild(root).manifest.publicSha256["resume/rokon-resume.pdf"]);
});
test("CI rejects altered public bytes and missing critical outputs", (t) => {
  const root = fixture(t);
  writeFileSync(join(root, "client/index.html"), "corrupted transfer");
  assert.throws(() => verifyBuild(root), /checksum mismatch/);
  rmSync(join(root, "client/rss.xml"));
  assert.throws(() => verifyBuild(root), /checksum mismatch/);
});
test("CI rejects another commit, run, attempt or domain before writing hosting files", (t) => {
  const root = fixture(t),
    configuration = request(root);
  for (const mutation of [
    { commit: "b".repeat(40) },
    { run: "124" },
    { attempt: "3" },
    { domain: "wrong.example" },
  ])
    assert.throws(
      () => prepareArtifact(root, { ...configuration, ...mutation }),
      /identity/,
    );
  assert.equal(existsSync(join(root, "nginx-hosting.json")), false);
});
test("CI rejects sidecar tampering, additional artifact entries and symlink roots", (t) => {
  const root = fixture(t),
    configuration = request(root);
  const map = join(root, "nginx-routing-map.conf"),
    original = readFileSync(map);
  writeFileSync(map, "altered directives");
  assert.throws(
    () => prepareArtifact(root, configuration),
    /checksum mismatch/,
  );
  writeFileSync(map, original);
  writeFileSync(join(root, "private-key.txt"), "must never transfer");
  assert.throws(
    () => prepareArtifact(root, configuration),
    /Unexpected CI artifact/,
  );
  const link = `${root}-link`;
  symlinkSync(root, link);
  try {
    assert.throws(() => verifyBuild(link), /real directory/);
  } finally {
    rmSync(link);
  }
});
test("CI requires explicit GitHub identity to stamp an artifact", (t) => {
  const root = fixture(t);
  assert.throws(() => stampBuild(root, {}), /Missing CI build identity/);
});

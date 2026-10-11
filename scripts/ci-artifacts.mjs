import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  lstatSync,
  unlinkSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderNginx } from "./prepare-vps.mjs";

export const buildFiles = [
  "static-build.json",
  "security-headers.json",
  "nginx-security-map.conf",
  "nginx-security-headers.conf",
  "nginx-routing-map.conf",
];
const require = (condition, message) => {
  if (!condition) throw new Error(message);
};
const json = (path) => JSON.parse(readFileSync(path, "utf8"));

export function verifyBuild(directory) {
  const root = resolve(directory);
  require(lstatSync(root).isDirectory() &&
    !lstatSync(root).isSymbolicLink(), "Build must be a real directory");
  const manifest = json(`${root}/static-build.json`);
  require(manifest.output === "static" &&
    manifest.webRoot === "client", "Static output required");
  const hashes = {};
  require(lstatSync(`${root}/client`).isDirectory() &&
    !lstatSync(
      `${root}/client`,
    ).isSymbolicLink(), "Public root must be a real directory");
  const walk = (path, relative = "") => {
    for (const entry of readdirSync(path)) {
      const name = relative + entry,
        file = `${path}/${entry}`,
        stat = lstatSync(file);
      require(/^[A-Za-z0-9_./-]+$/.test(name) &&
        !name
          .split("/")
          .some(
            (part) => part.startsWith(".") || part.startsWith("qa-"),
          ), "Private or fixture path in public build");
      require(!stat.isSymbolicLink() &&
        (stat.isFile() || stat.isDirectory()), "Nonregular public build file");
      if (stat.isDirectory()) walk(file, `${name}/`);
      else
        hashes[name] = createHash("sha256")
          .update(readFileSync(file))
          .digest("hex");
    }
  };
  walk(`${root}/client`);
  require(JSON.stringify(Object.entries(hashes).sort()) ===
    JSON.stringify(
      Object.entries(manifest.publicSha256 || {}).sort(),
    ), "Public build file inventory/checksum mismatch");
  for (const name of [
    "index.html",
    "404.html",
    "about/index.html",
    "contact/index.html",
    "resume/index.html",
    "work/index.html",
    "blog/index.html",
    "rss.xml",
    "robots.txt",
    "sitemap.xml",
    "sitemap-index.xml",
    "sitemap-0.xml",
    "blog/search-index.json",
    "resume/rokon-resume.pdf",
    "resume/rokon-resume.txt",
  ])
    require(hashes[name], "Critical build output missing");
  require(!Object.keys(hashes).some((name) =>
    /^(preview|qa-|server)(\/|$)|\.(mjs|map|docx)$/.test(name),
  ), "Runtime/private output present");
  for (const name of buildFiles)
    require(lstatSync(`${root}/${name}`).isFile() &&
      !lstatSync(`${root}/${name}`).isSymbolicLink(), "Missing build sidecar");
  return {
    root,
    manifest,
    sha256: Object.fromEntries(
      buildFiles.map((name) => [
        name,
        createHash("sha256")
          .update(readFileSync(`${root}/${name}`))
          .digest("hex"),
      ]),
    ),
  };
}

export function stampBuild(directory, env = process.env) {
  const build = verifyBuild(directory);
  require(/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || "") &&
    /^\d+$/.test(env.GITHUB_RUN_ID || "") &&
    /^\d+$/.test(env.GITHUB_RUN_ATTEMPT || ""), "Missing CI build identity");
  writeFileSync(
    `${build.root}/ci-build.json`,
    JSON.stringify(
      {
        commit: env.GITHUB_SHA,
        run: env.GITHUB_RUN_ID,
        attempt: env.GITHUB_RUN_ATTEMPT,
        origin: build.manifest.origin,
        sha256: build.sha256,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Verified ${Object.keys(build.manifest.publicSha256).length} static files; CI identity recorded.`,
  );
}

export function prepareArtifact(directory, request) {
  const build = verifyBuild(directory),
    identity = json(`${build.root}/ci-build.json`);
  require(JSON.stringify(readdirSync(build.root).sort()) ===
    JSON.stringify(
      ["client", "ci-build.json", ...buildFiles].sort(),
    ), "Unexpected CI artifact entries");
  require(identity.commit === request.commit &&
    identity.run === request.run &&
    identity.attempt === request.attempt &&
    identity.origin === `https://${request.domain}` &&
    build.manifest.origin === identity.origin &&
    JSON.stringify(identity.sha256) ===
      JSON.stringify(
        build.sha256,
      ), "CI artifact identity, domain or sidecar checksum mismatch");
  const config = renderNginx({
    releaseRoot: `${request.base}/releases/${request.release}`,
    origin: identity.origin,
    assetRoot: `${request.base}/shared`,
    certificate: request.certificate,
    privateKey: request.privateKey,
    accessLog: request.accessLog,
    errorLog: request.errorLog,
    acmeRoot: request.acmeRoot,
  });
  writeFileSync(`${build.root}/nginx-site.conf`, config.site);
  writeFileSync(`${build.root}/nginx-static-server.conf`, config.server);
  writeFileSync(
    `${build.root}/nginx-hosting.json`,
    JSON.stringify(config.hosting, null, 2) + "\n",
  );
  unlinkSync(`${build.root}/ci-build.json`); // CI metadata is not a public or VPS release sidecar.
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [operation, directory, request] = process.argv.slice(2);
  try {
    if (operation === "stamp" && directory && !request) stampBuild(directory);
    else if (operation === "prepare" && directory && request)
      prepareArtifact(directory, json(request));
    else
      throw new Error(
        "Usage: ci-artifacts.mjs stamp DIST | prepare ARTIFACT REQUEST.json",
      );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

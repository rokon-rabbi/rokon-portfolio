import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function renderNginx({
  releaseRoot,
  origin,
  certificate,
  privateKey,
  assetRoot,
  accessLog,
  errorLog,
  acmeRoot,
  httpPort = 80,
  httpsPort = Number(new URL(origin).port || 443),
}) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Use the built HTTPS origin");
  for (const port of [httpPort, httpsPort])
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new Error("Invalid listener port");
  if (httpPort === httpsPort)
    throw new Error("HTTP and HTTPS listeners need different ports");
  const domain = url.hostname;
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(domain))
    throw new Error("Use a DNS hostname for VPS hosting");
  const cert = certificate || `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  const key = privateKey || `/etc/letsencrypt/live/${domain}/privkey.pem`;
  if (Boolean(accessLog) !== Boolean(errorLog))
    throw new Error("Supply both access and error log paths");
  for (const path of [
    releaseRoot,
    cert,
    key,
    assetRoot,
    accessLog,
    errorLog,
    acmeRoot,
  ].filter(Boolean)) {
    if (!/^\/[a-zA-Z0-9/_.-]+$/.test(path) || path.split("/").includes(".."))
      throw new Error(
        "Nginx paths must be absolute, without spaces, traversal or configuration characters",
      );
  }
  const values = {
    RELEASE_ROOT: releaseRoot.replace(/\/$/, ""),
    SERVER_NAME: domain,
    CERTIFICATE: cert,
    PRIVATE_KEY: key,
    ORIGIN: url.origin,
    HTTP_PORT: String(httpPort),
    HTTPS_PORT: String(httpsPort),
    ASSET_ROOT_DIRECTIVE: assetRoot ? `root ${assetRoot};` : "",
    LOG_DIRECTIVES: accessLog
      ? `access_log ${accessLog} combined;\n    error_log ${errorLog} warn;`
      : "",
    ACME_LOCATION: acmeRoot
      ? `location ^~ /.well-known/acme-challenge/ {\n        root ${acmeRoot};\n        try_files $uri =404;\n    }`
      : "",
  };
  const render = (name) =>
    readFileSync(
      new URL(`../deploy/nginx/${name}.conf.template`, import.meta.url),
      "utf8",
    ).replace(/@([A-Z_]+)@/g, (_, token) => {
      if (!(token in values))
        throw new Error(`Unknown template token ${token}`);
      return values[token];
    });
  return {
    site: render("site"),
    server: render("static-server"),
    hosting: {
      releaseRoot: values.RELEASE_ROOT,
      origin: url.origin,
      certificate: cert,
      privateKey: key,
      assetRoot: assetRoot || null,
      accessLog: accessLog || null,
      errorLog: errorLog || null,
      acmeRoot: acmeRoot || null,
      httpPort,
      httpsPort,
    },
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const usage =
    "Usage: node scripts/prepare-vps.mjs --release-root /absolute/releases/ID [--asset-root /absolute/shared] [--access-log /absolute/access.log --error-log /absolute/error.log] [--certificate /absolute/cert.pem --private-key /absolute/key.pem] [--acme-root /absolute/acme] [--http-port PORT --https-port PORT]";
  if (args.length === 1 && args[0] === "--help") {
    console.log(usage);
    process.exit(0);
  }
  const allowed = new Set([
    "--release-root",
    "--certificate",
    "--private-key",
    "--asset-root",
    "--access-log",
    "--error-log",
    "--acme-root",
    "--http-port",
    "--https-port",
  ]);
  const options = {};
  for (let n = 0; n < args.length; n += 2) {
    if (!allowed.has(args[n]) || !args[n + 1]) throw new Error(usage);
    options[args[n]] = args[n + 1];
  }
  if (!options["--release-root"])
    throw new Error(
      "A reviewed versioned --release-root is required; this command only writes local configuration",
    );
  const build = JSON.parse(readFileSync("dist/static-build.json", "utf8"));
  if (build.output !== "static" || build.webRoot !== "client")
    throw new Error("Build the static release first");
  const config = renderNginx({
    releaseRoot: options["--release-root"],
    origin: build.origin,
    certificate: options["--certificate"],
    privateKey: options["--private-key"],
    assetRoot: options["--asset-root"],
    accessLog: options["--access-log"],
    errorLog: options["--error-log"],
    acmeRoot: options["--acme-root"],
    httpPort: options["--http-port"]
      ? Number(options["--http-port"])
      : undefined,
    httpsPort: options["--https-port"]
      ? Number(options["--https-port"])
      : undefined,
  });
  writeFileSync("dist/nginx-site.conf", config.site);
  writeFileSync("dist/nginx-static-server.conf", config.server);
  writeFileSync(
    "dist/nginx-hosting.json",
    JSON.stringify(config.hosting, null, 2) + "\n",
  );
  console.log(
    `Prepared local Nginx configuration for ${build.origin}. Web root: ${options["--release-root"]}/client. Nothing was deployed.`,
  );
}

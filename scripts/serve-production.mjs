import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, realpathSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

// Local QA of the built static artifact. No dev scripts, fallback SPA or remote APIs.
const root = realpathSync(resolve(process.env.QA_ROOT || "dist/client"));
const manifestPath = resolve(root, "..", "security-headers.json");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};
const cache = new Map();
createServer((request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end();
    return;
  }
  let path;
  try {
    path = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }
  if (
    path
      .split("/")
      .some((segment) => segment.startsWith(".") || segment === "_headers")
  ) {
    response.writeHead(404);
    response.end();
    return;
  }
  let file = resolve(root, `.${path}`);
  let status = 200;
  if (existsSync(file) && statSync(file).isDirectory())
    file = resolve(file, "index.html");
  if (!existsSync(file) && !extname(path))
    file = resolve(root, `.${path}`, "index.html");
  if (
    !file.startsWith(root + sep) ||
    !existsSync(file) ||
    !statSync(file).isFile() ||
    !realpathSync(file).startsWith(root + sep)
  ) {
    file = resolve(root, "404.html");
    status = 404;
  }
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : null;
  const relative = file.slice(root.length).replaceAll(sep, "/");
  const headers = {
    ...(manifest?.base ?? {}),
    ...(manifest?.pages?.[relative] ?? {}),
    "Content-Type": types[extname(file)] ?? "application/octet-stream",
    "Cache-Control":
      status === 404
        ? "no-store"
        : path.startsWith("/_astro/")
          ? "public, max-age=31536000, immutable"
          : extname(file) === ".html"
            ? "no-cache"
            : "public, max-age=3600",
  };
  if (path.endsWith("/rss.xml"))
    headers["Content-Type"] = "application/rss+xml; charset=utf-8";
  if (/\/resume\/rokon-resume\.(pdf|txt)$/.test(path))
    headers["Content-Disposition"] =
      `attachment; filename="Rokon-Resume.${extname(file).slice(1)}"`;
  if (!cache.has(file)) {
    const raw = readFileSync(file);
    cache.set(file, { raw, gzip: gzipSync(raw), br: brotliCompressSync(raw) });
  }
  const compressible = /\.(html|css|js|json|svg|txt|xml)$/.test(file);
  const encoding =
    compressible && request.headers["accept-encoding"]?.includes("br")
      ? "br"
      : compressible && request.headers["accept-encoding"]?.includes("gzip")
        ? "gzip"
        : "raw";
  const body = cache.get(file)[encoding];
  if (encoding !== "raw")
    headers["Content-Encoding"] = encoding === "br" ? "br" : "gzip";
  headers.Vary = "Accept-Encoding";
  headers["Content-Length"] = body.length;
  response.writeHead(status, headers);
  response.end(request.method === "HEAD" ? undefined : body);
}).listen(Number(process.env.QA_PORT || 4173), "127.0.0.1", () =>
  console.log(
    `Built-artifact QA: http://127.0.0.1:${process.env.QA_PORT || 4173}`,
  ),
);

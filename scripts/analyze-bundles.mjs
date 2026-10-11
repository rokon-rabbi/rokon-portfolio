import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { gzipSync, brotliCompressSync } from "node:zlib";
const root = new URL("../dist/client/", import.meta.url);
const files = readdirSync(new URL("_astro/", root));
const assets = files
  .filter((name) => /\.(js|css|woff2)$/.test(name))
  .map((name) => {
    const bytes = readFileSync(new URL(`_astro/${name}`, root));
    return {
      name,
      bytes: bytes.length,
      gzipBytes: gzipSync(bytes).length,
      brotliBytes: brotliCompressSync(bytes).length,
      role: name.startsWith("systems-scene")
        ? "Optional dynamically imported Three.js scene"
        : name.startsWith("page-motion")
          ? "Optional dynamically imported GSAP motion"
          : /^(client|react|GalleryControls)\./.test(name)
            ? "React for noindex gallery only; visible islands"
            : "Shared styles, local fonts or small native controllers",
    };
  })
  .sort((a, b) => b.bytes - a.bytes);
const routes = readdirSync(root, { recursive: true })
  .filter((name) => name.endsWith(".html"))
  .map((file) => {
    const html = readFileSync(new URL(file, root), "utf8");
    return {
      file,
      reactIslands: (html.match(/<astro-island\b/g) || []).length,
      externalModuleScripts: [
        ...html.matchAll(/<script[^>]*src="([^"]+)"/g),
      ].map((match) => match[1]),
      preloadAssets: [
        ...html.matchAll(
          /<link[^>]*rel="(?:preload|modulepreload)"[^>]*href="([^"]+)"/g,
        ),
      ].map((match) => match[1]),
    };
  });
const report = {
  generatedAt: new Date().toISOString(),
  assets,
  routes,
  note: "Asset inventory, not an aggregate page payload. Dynamic chunks are optional. Lighthouse network-waterfall reports record actual loads; visible React islands occur only on the noindex component gallery.",
};
mkdirSync("docs/hardening", { recursive: true });
writeFileSync(
  "docs/hardening/bundles.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.table(
  assets.map((asset) => ({
    asset: asset.name,
    minifiedKiB: +(asset.bytes / 1024).toFixed(1),
    gzipKiB: +(asset.gzipBytes / 1024).toFixed(1),
    role: asset.role,
  })),
);

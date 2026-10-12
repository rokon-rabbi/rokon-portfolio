import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
const root = new URL("../dist/client/", import.meta.url);
const files = readdirSync(root, { recursive: true });
const headers = JSON.parse(
  readFileSync(new URL("../dist/security-headers.json", import.meta.url)),
);
const titles = new Set(),
  descriptions = new Set();
for (const path of files.filter((path) => path.endsWith(".html"))) {
  test(`${path}: metadata, schemas, CSP and static accessibility contracts`, () => {
    const html = readFileSync(new URL(path, root), "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    const description = html.match(
      /<meta name="description" content="([^"]+)"/,
    )[1];
    assert.ok(!titles.has(title), `Duplicate title: ${title}`);
    titles.add(title);
    assert.ok(
      !descriptions.has(description),
      `Duplicate description: ${description}`,
    );
    descriptions.add(description);
    const canonical = html.match(/rel="canonical" href="([^"]+)"/)[1];
    const url = new URL(canonical);
    assert.equal(url.protocol, "https:");
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    assert.ok(url.pathname === "/" || !url.pathname.endsWith("/"));
    for (const name of [
      "og:title",
      "og:description",
      "og:url",
      "og:image",
      "og:image:alt",
      "twitter:card",
      "twitter:image:alt",
    ])
      assert.ok(html.includes(`="${name}"`));
    assert.equal(html.includes('type="application/rss+xml"'), false);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
    assert.equal((html.match(/<main[\s>]/g) || []).length, 1);
    assert.ok(html.includes('href="#main-content"'));
    for (const image of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(image[0], /\balt="[^"]*"/);
      assert.match(image[0], /\bwidth="\d+"/);
      assert.match(image[0], /\bheight="\d+"/);
    }
    const policy = html.match(
      /http-equiv="content-security-policy" content="([^"]+)"/,
    )[1];
    assert.ok(
      html.indexOf('http-equiv="content-security-policy"') <
        html.indexOf("<script"),
    );
    assert.ok(
      !/script-src[^;]*(unsafe-inline|unsafe-eval|https?:)/.test(policy),
    );
    assert.ok(policy.includes("script-src-attr 'none'"));
    for (const element of html.matchAll(
      /<(script|style)([^>]*)>([\s\S]*?)<\/\1>/g,
    )) {
      if (/\bsrc=/.test(element[2])) continue;
      const hash = `sha256-${createHash("sha256").update(element[3]).digest("base64")}`;
      assert.ok(policy.includes(hash), `Unhashed ${element[1]}`);
    }
    assert.equal(
      headers.pages[`/${path}`]["Content-Security-Policy"],
      `${policy}; frame-ancestors 'none'`,
    );
    const noindex = /name="robots" content="noindex/.test(html);
    if (noindex) {
      assert.ok(!html.includes("data-site-schema"));
      assert.equal(
        headers.pages[`/${path}`]["X-Robots-Tag"],
        "noindex, follow",
      );
    } else {
      const schema = JSON.parse(
        html.match(/data-site-schema type="application\/ld\+json">([^<]+)</)[1],
      );
      const person = schema["@graph"].find(
        (item) => item["@type"] === "Person",
      );
      assert.equal(person.name, "Md. Rokonuzzaman");
      assert.ok(person.sameAs.includes("https://github.com/rokon-rabbi"));
      const crumbs = schema["@graph"].find(
        (item) => item["@type"] === "BreadcrumbList",
      ).itemListElement;
      assert.equal(crumbs.at(-1).item, canonical);
      assert.ok(
        !html.includes("astro-island"),
        "Public page must remain server-rendered",
      );
    }
    for (const anchor of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))
      assert.match(anchor[0], /rel="[^"]*noopener/);
  });
}
test("crawler files, sharing image, private-file exclusion and credential patterns", () => {
  const robot = readFileSync(new URL("robots.txt", root), "utf8");
  assert.match(robot, /Sitemap: https:\/\/[^\s]+\/sitemap\.xml/);
  const sitemap = readFileSync(new URL("sitemap.xml", root), "utf8");
  assert.ok(sitemap.includes("sitemap-0.xml"));
  const urls = readFileSync(new URL("sitemap-0.xml", root), "utf8");
  assert.ok(!/preview|design-system|courseflow|404|qa-publication/.test(urls));
  const image = readFileSync(new URL("images/social-card.png", root));
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.ok(
    !files.some((file) =>
      /(^|\/)(\.env|\.git|reference|private|worker-configuration)|\.docx$/.test(
        file,
      ),
    ),
  );
  const credential =
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b|\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/;
  for (const file of files.filter((file) =>
    /\.(html|js|css|json|xml|txt|svg)$/.test(file),
  ))
    assert.ok(
      !credential.test(readFileSync(new URL(file, root), "utf8")),
      `Credential-like content: ${file}`,
    );
});

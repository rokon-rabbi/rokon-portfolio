import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";
import { compile } from "@mdx-js/mdx";

const root = new URL("../", import.meta.url);
const temporary = mkdtempSync("/tmp/rokon-writing-editor-test-");
const astroRequire = createRequire(import.meta.resolve("astro"));
const { parse: yaml } = await import(pathToFileURL(astroRequire.resolve("yaml")).href);
for (const file of ["src/schemas/blog.ts", "src/lib/writing-editor.ts", "src/data/writing-studio.ts"]) {
  const source = readFileSync(new URL(file, root), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace(/from\s+(["'])([^"']+)\1/g, (_all, _quote, specifier) => `from ${JSON.stringify(specifier.startsWith(".") ? specifier + ".mjs" : import.meta.resolve(specifier))}`);
  const target = join(temporary, file.replace(/\.ts$/, ".mjs"));
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, output);
}
const { createDraft, slugFromTitle, parseWorkspace, exportMdx } = await import(pathToFileURL(join(temporary, "src/lib/writing-editor.mjs")).href);
const { BlogSchema } = await import(pathToFileURL(join(temporary, "src/schemas/blog.mjs")).href);
const { WRITING_STUDIO_ROUTE } = await import(pathToFileURL(join(temporary, "src/data/writing-studio.mjs")).href);
test.after(() => rmSync(temporary, { recursive: true, force: true }));

function draft() {
  return {
    ...createDraft("Md. Rokonuzzaman", new Date("2026-10-12T23:30:00Z")),
    title: 'A "quote", a colon: and বাংলা',
    description: "A description with a newline\nand a colon: preserved.",
    slug: "a-real-note", tags: "debugging, frontend", body: "An opening paragraph.\n\n## What changed\n\n```js\nconst value = 1;\n```",
  };
}

test("new drafts default to unpublished and retain a valid UTC calendar date", () => {
  const a = createDraft("Rokon", new Date("2026-10-12T23:30:00Z"));
  assert.equal(a.date, "2026-10-12");
  assert.equal(a.published, false);
  assert.equal(a.body, "");
  assert.notEqual(a.id, createDraft("Rokon").id);
  assert.equal(slugFromTitle("Café: a small fix!"), "cafe-a-small-fix");
});

test("downloaded MDX keeps quoted metadata and body intact and compiles as an article", async () => {
  const source = draft();
  const exported = exportMdx(source);
  const match = exported.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  assert.ok(match);
  const metadata = BlogSchema.parse(yaml(match[1]));
  assert.equal(metadata.title, source.title);
  assert.equal(metadata.description, source.description);
  assert.equal(metadata.draft, true);
  assert.deepEqual(metadata.tags, ["debugging", "frontend"]);
  assert.equal(match[2], source.body + "\n");
  assert.ok(String(await compile(match[2])).includes("What changed"));
  assert.equal(yaml(exportMdx({ ...source, published: true }).split("---")[1]).draft, false);
});

test("invalid filenames, required metadata, dates, duplicate tags and empty text cannot export", () => {
  for (const change of [
    { slug: "../private" }, { slug: "index" }, { slug: "UPPER case" },
    { title: " " }, { description: "" }, { author: "" },
    { date: "2026-02-30" }, { tags: "" }, { tags: "frontend, frontend" },
    { tags: "Front End" }, { body: " " },
  ]) assert.throws(() => exportMdx({ ...draft(), ...change }), undefined, JSON.stringify(change));
});

test("backups round-trip; malformed versions, duplicate IDs and absent active drafts are rejected", () => {
  const a = draft();
  const state = { version: 1, activeId: a.id, drafts: [a] };
  assert.deepEqual(parseWorkspace(JSON.stringify(state)), state);
  for (const value of [
    { ...state, version: 2 }, { ...state, activeId: "missing" },
    { ...state, drafts: [] }, { ...state, drafts: [a, a] },
    { ...state, drafts: [{ ...a, body: 123 }] },
  ]) assert.throws(() => parseWorkspace(JSON.stringify(value)));
  assert.throws(() => parseWorkspace("{ broken JSON"));
});

test("the desk has noindex, is absent from sitemap/public links, and ships no saved drafts", () => {
  const dist = new URL("dist/client/", root);
  const html = readFileSync(new URL(`${WRITING_STUDIO_ROUTE.slice(1)}/index.html`, dist), "utf8");
  assert.ok(html.includes('name="robots" content="noindex, follow"'));
  assert.ok(html.includes("data-writing-studio"));
  assert.equal(html.includes("data-site-schema"), false);
  for (const file of readdirSync(dist, { recursive: true }).filter((file) => file.endsWith(".html") && !file.startsWith(WRITING_STUDIO_ROUTE.slice(1)))) {
    assert.equal(readFileSync(new URL(file, dist), "utf8").includes(WRITING_STUDIO_ROUTE), false, file);
  }
  for (const file of readdirSync(dist).filter((file) => /^sitemap.*\.xml$/.test(file))) {
    assert.equal(readFileSync(new URL(file, dist), "utf8").includes(WRITING_STUDIO_ROUTE), false);
  }
  assert.deepEqual(JSON.parse(readFileSync(new URL("blog/search-index.json", dist), "utf8")), []);
});

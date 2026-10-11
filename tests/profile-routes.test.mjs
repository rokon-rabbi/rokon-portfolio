import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const dist = new URL("../dist/client/", import.meta.url);
test("static professional pages and resume artifacts", async (t) => {
  for (const route of ["about", "contact", "resume"])
    await t.test(
      `${route} has semantic landmarks and valid fragment/label targets`,
      () => {
        const html = readFileSync(new URL(`${route}/index.html`, dist), "utf8");
        assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1);
        assert.equal((html.match(/<main[\s>]/g) ?? []).length, 1);
        const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(
          (match) => match[1],
        );
        assert.equal(new Set(ids).size, ids.length);
        for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g))
          for (const id of match[1].split(" ")) assert.ok(ids.includes(id));
        for (const match of html.matchAll(/href="#([^"]+)"/g))
          assert.ok(ids.includes(match[1]));
        assert.equal(html.includes("astro-island"), false);
        assert.equal(/<form[\s>]/.test(html), false);
        for (const extension of ["pdf", "txt"])
          assert.ok(
            existsSync(new URL(`resume/rokon-resume.${extension}`, dist)),
          );
      },
    );
  await t.test(
    "downloads contain only professional content and match the public resume",
    () => {
      const pdf = readFileSync(
        new URL("resume/rokon-resume.pdf", dist),
        "utf8",
      );
      const text = readFileSync(
        new URL("resume/rokon-resume.txt", dist),
        "utf8",
      );
      assert.ok(pdf.startsWith("%PDF-1.4"));
      for (const surface of [pdf, text]) {
        for (const professional of [
          "Md. Rokonuzzaman",
          "Karooth IT",
          "Ztrios Technologies",
          "NSTU",
          "Spring Boot",
        ])
          assert.ok(surface.includes(professional));
        assert.equal(
          /birth.?date|religion|blood.?group|permanent.?address|confidential|PRIVATE_SENTINEL/i.test(
            surface,
          ),
          false,
        );
      }
      assert.equal(text.includes("reference/private"), false);
    },
  );
  await t.test("About, Contact, and resume are in the sitemap", () => {
    const sitemap = readFileSync(new URL("sitemap-0.xml", dist), "utf8");
    for (const path of ["about", "contact", "resume"])
      assert.ok(new RegExp(`<loc>[^<]+/${path}/?</loc>`).test(sitemap));
  });
});

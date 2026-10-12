import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

test("public resume and professional contacts", async (t) => {
  const temporary = mkdtempSync(join(tmpdir(), "rokon-public-resume-"));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  for (const file of [
    "src/data/profile.ts",
    "src/data/experience.ts",
    "src/data/skills.ts",
    "src/data/about.ts",
    "src/data/contact.ts",
    "src/data/case-studies.ts",
    "src/data/projects.ts",
    "src/lib/portfolio-dates.ts",
    "src/lib/public-resume.ts",
    "src/lib/resume-pdf.ts",
  ]) {
    const compiled = ts
      .transpileModule(
        readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
        {
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
          },
        },
      )
      .outputText.replace(
        /from\s+(["'])([^"']+)\1/g,
        (_all, _quote, specifier) =>
          `from ${JSON.stringify(specifier.startsWith(".") ? `${specifier}.mjs` : import.meta.resolve(specifier))}`,
      );
    const target = join(temporary, file.replace(/\.ts$/, ".mjs"));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, compiled);
  }
  const load = (file) =>
    import(pathToFileURL(join(temporary, `src/${file}.mjs`)).href);
  const { createPublicResume, PublicResumeSchema, resumeText } =
    await load("lib/public-resume");
  const { renderResumePDF } = await load("lib/resume-pdf");
  const { ContactDetailsSchema, CONTACT_DETAILS, emailHref } =
    await load("data/contact");
  const { PROFILE } = await load("data/profile");
  const { EXPERIENCE } = await load("data/experience");
  const { SKILL_GROUPS } = await load("data/skills");
  const { EDUCATION } = await load("data/about");
  const resume = createPublicResume();

  await t.test(
    "explicit projection excludes private fields at every source boundary",
    () => {
      const privateFields = Object.fromEntries(
        [
          "birthDate",
          "family",
          "religion",
          "bloodGroup",
          "permanentAddress",
          "confidentialNotes",
        ].map((key) => [key, `PRIVATE_SENTINEL_${key}`]),
      );
      const projected = createPublicResume(
        {
          ...PROFILE,
          ...privateFields,
          contacts: PROFILE.contacts.map((link) => ({
            ...link,
            ...privateFields,
          })),
        },
        EXPERIENCE.map((role) => ({
          ...role,
          ...privateFields,
          contributions: role.contributions.map((claim) => ({
            ...claim,
            ...privateFields,
          })),
        })),
        SKILL_GROUPS.map((group) => ({ ...group, ...privateFields })),
        { ...EDUCATION, ...privateFields },
        { ...CONTACT_DETAILS, ...privateFields },
      );
      const surfaces =
        JSON.stringify(projected) +
        resumeText(projected) +
        new TextDecoder().decode(renderResumePDF(projected));
      assert.equal(surfaces.includes("PRIVATE_SENTINEL"), false);
      assert.deepEqual(projected, resume);
      for (const key of Object.keys(privateFields))
        assert.equal(
          PublicResumeSchema.safeParse({ ...resume, [key]: "private" }).success,
          false,
        );
    },
  );
  await t.test(
    "contact destinations reject fake protocols and unrelated social URLs",
    () => {
      for (const contact of [
        { email: "not-an-email", linkedin: null },
        { email: null, linkedin: "javascript:alert(1)" },
        { email: null, linkedin: "https://linkedin.com.evil.test/in/person" },
        { email: null, linkedin: "https://www.linkedin.com/" },
      ])
        assert.equal(ContactDetailsSchema.safeParse(contact).success, false);
      const contact = ContactDetailsSchema.parse({
        email: "engineer@example.com",
        linkedin: "https://www.linkedin.com/in/engineer",
      });
      assert.equal(
        emailHref(contact.email, "Project & role?"),
        "mailto:engineer@example.com?subject=Project%20%26%20role%3F",
      );
      const withContacts = createPublicResume(
        PROFILE,
        EXPERIENCE,
        SKILL_GROUPS,
        EDUCATION,
        contact,
      );
      assert.ok(resumeText(withContacts).includes(contact.email));
      assert.ok(resumeText(withContacts).includes(contact.linkedin));
    },
  );
  await t.test(
    "PDF has valid byte offsets, streams, searchable public text and no missing source facts",
    () => {
      const bytes = renderResumePDF(resume);
      const pdf = new TextDecoder().decode(bytes);
      assert.ok(pdf.startsWith("%PDF-1.4\n"));
      assert.ok(pdf.endsWith("%%EOF\n"));
      const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
      assert.equal(pdf.slice(xref, xref + 4), "xref");
      const rows = pdf.slice(xref).split("\n");
      const count = Number(rows[1].split(" ")[1]);
      for (let index = 1; index < count; index++) {
        const offset = Number(rows[index + 2].slice(0, 10));
        assert.ok(pdf.slice(offset).startsWith(`${index} 0 obj\n`));
      }
      for (const match of pdf.matchAll(
        /\/Length (\d+) >>\nstream\n([\s\S]*?)endstream/g,
      ))
        assert.equal(match[2].length, Number(match[1]));
      // One page, and the stack is named on the line under the name.
      assert.equal(Number(pdf.match(/\/Count (\d+)/)[1]), 1);
      assert.ok(resumeText(resume).includes(" | Java • Spring Boot • Angular"));
      assert.ok(pdf.includes("Java \\225 Spring Boot \\225 Angular"));
      for (const text of [
        resume.name,
        "Karooth IT",
        "Ztrios Technologies",
        "TECHNICAL SKILLS",
        resume.education.institution,
      ])
        assert.ok(pdf.includes(text.replace(/([\\()])/g, "\\$1")), text);
    },
  );
  await t.test(
    "PDF escapes delimiters and paginates long resumes without dropping text",
    () => {
      const long = {
        ...resume,
        name: "Engineer (Public) \\ Profile",
        experience: Array.from({ length: 25 }, (_, index) => ({
          ...resume.experience[0],
          company: `Employer ${index}`,
        })),
      };
      const pdf = new TextDecoder().decode(renderResumePDF(long));
      assert.ok(pdf.includes("Engineer \\(Public\\) \\\\ Profile"));
      assert.ok(Number(pdf.match(/\/Count (\d+)/)[1]) > 1);
      assert.ok(pdf.includes("Employer 24"));
    },
  );
});

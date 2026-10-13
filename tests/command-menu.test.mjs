import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const { COMMAND_GROUPS, siteCommands, commandScore, fold } = await import(
  `data:text/javascript;base64,${Buffer.from(compile("../src/design/commands.ts")).toString("base64")}`
);

const sources = {
  email: "someone@example.com",
  emailHref: "mailto:someone@example.com",
  profiles: [
    { label: "GitHub", url: "https://github.com/example" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/example/" },
  ],
};
const commands = siteCommands(sources);
// What the menu shows for a query: the labels that match, best first.
const answers = (query) =>
  commands
    .map((command) => ({
      label: command.label,
      score: commandScore(command.label, command.keywords, query),
    }))
    .filter((answer) => answer.score !== null)
    .sort((a, b) => a.score - b.score)
    .map((answer) => answer.label);

test("the command menu's list", async (t) => {
  await t.test("every entry is one thing to do, under a known group", () => {
    const ids = commands.map((command) => command.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate ids");
    for (const command of commands) {
      assert.ok(COMMAND_GROUPS.includes(command.group), command.id);
      assert.ok(command.label.trim(), command.id);
      // A place to go or something to do, never both and never neither.
      assert.notEqual(!!command.href, !!command.action, command.id);
      assert.match(command.id, /^[a-z0-9-]+$/);
      if (command.external) assert.match(command.href, /^https:\/\//);
    }
    for (const group of COMMAND_GROUPS)
      assert.ok(commands.some((command) => command.group === group), group);
  });
  await t.test("places on this site are slashless paths or home fragments", () => {
    for (const command of commands.filter(
      (command) => command.href && !command.external,
    )) {
      if (command.href.startsWith("mailto:")) continue;
      assert.match(
        command.href,
        /^\/(?:[a-z-]+(?:\/[a-z.-]+)*)?(?:#[a-z-]+)?$/,
        command.href,
      );
    }
    assert.deepEqual(
      commands
        .filter((command) => command.group === "On the home page")
        .map((command) => command.href),
      ["/#experience", "/#stack", "/#projects", "/#education"],
    );
  });
  await t.test("contact details that are not public leave no entry behind", () => {
    const bare = siteCommands({ email: null, emailHref: null, profiles: [] });
    assert.ok(!bare.some((command) => command.action === "copy-email"));
    assert.ok(!bare.some((command) => command.href?.startsWith("mailto:")));
    assert.ok(!bare.some((command) => command.group === "Elsewhere"));
    assert.ok(commands.some((command) => command.action === "copy-email"));
  });
});

test("matching what is typed", async (t) => {
  await t.test("an empty query keeps everything, in the list's own order", () => {
    assert.deepEqual(
      answers("  "),
      commands.map((command) => command.label),
    );
  });
  await t.test("accents and capitals do not matter", () => {
    assert.equal(fold("  Résumé "), "resume");
    assert.equal(answers("resume")[0], "Résumé");
    assert.equal(answers("RÉSUMÉ")[0], "Résumé");
  });
  await t.test("a word must begin a word; the label outranks keywords", () => {
    assert.deepEqual(answers("res"), ["Résumé", "Download résumé as PDF"]);
    // "work" names a page and is only a keyword of two sections.
    assert.equal(answers("work")[0], "Work");
    assert.ok(answers("work").includes("Experience"));
    assert.deepEqual(answers("cv"), ["Résumé", "Download résumé as PDF"]);
    assert.deepEqual(answers("hub"), []);
    assert.deepEqual(answers("git"), ["GitHub"]);
  });
  await t.test("every word typed has to be found", () => {
    assert.deepEqual(answers("copy email"), ["Copy email address"]);
    assert.deepEqual(answers("download pdf"), ["Download résumé as PDF"]);
    assert.deepEqual(answers("copy pdf"), []);
    assert.equal(commandScore("Home", "start", "zzz"), null);
  });
  await t.test("the words a visitor is likely to try find their entry", () => {
    for (const [query, label] of [
      ["dark", "Switch between light and dark"],
      ["theme", "Switch between light and dark"],
      ["font", "Appearance settings"],
      ["blog", "Writing"],
      ["skills", "Stack"],
      ["jobs", "Experience"],
      ["hire", "Contact"],
      ["linkedin", "LinkedIn"],
    ])
      assert.ok(answers(query).includes(label), `${query} → ${label}`);
  });
});

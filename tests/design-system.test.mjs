import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
function luminance(hex) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}

test("theme contrast and behavior", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "rokon-design-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, "tokens.mjs");
  writeFileSync(path, compile("../src/design/tokens.ts"));
  const { THEMES } = await import(pathToFileURL(path));
  for (const [mode, colors] of Object.entries(THEMES)) {
    await t.test(
      `${mode}: all approved reading pairs meet AA for normal text`,
      () => {
        let minimum = { ratio: Infinity, pair: "" };
        for (const background of [
          "background",
          "card",
          "popover",
          "muted",
          "accent",
          "surface-hover",
        ]) {
          for (const foreground of [
            "foreground",
            "muted-foreground",
            "primary",
            "secondary",
            "warm",
          ]) {
            const ratio = contrast(colors[foreground], colors[background]);
            assert.ok(
              ratio >= 4.5,
              `${mode} ${foreground}/${background}: ${ratio}`,
            );
            if (ratio < minimum.ratio)
              minimum = { ratio, pair: `${foreground}/${background}` };
          }
        }
        t.diagnostic(
          `${mode} minimum reading contrast: ${minimum.ratio.toFixed(3)}:1 (${minimum.pair})`,
        );
      },
    );
    await t.test(
      `${mode}: button, selected, disabled, and selection labels meet 4.5:1`,
      () => {
        for (const [fg, bg] of [
          ["primary-foreground", "primary"],
          ["primary-foreground", "primary-hover"],
          ["secondary-foreground", "secondary"],
          ["secondary-foreground", "secondary-hover"],
          ["destructive-foreground", "destructive"],
          ["accent-foreground", "accent"],
          ["card-foreground", "card"],
          ["popover-foreground", "popover"],
          ["disabled-foreground", "disabled-background"],
          ["selection-foreground", "selection-background"],
        ])
          assert.ok(
            contrast(colors[fg], colors[bg]) >= 4.5,
            `${mode}: ${fg}/${bg}`,
          );
      },
    );
    await t.test(
      `${mode}: control borders, error borders and focus rings meet 3:1`,
      () => {
        for (const bg of [
          "background",
          "card",
          "popover",
          "muted",
          "accent",
          "surface-hover",
        ]) {
          for (const fg of ["input", "ring", "destructive"])
            assert.ok(
              contrast(colors[fg], colors[bg]) >= 3,
              `${mode}: ${fg}/${bg}`,
            );
        }
      },
    );
  }
  // The preferences module is compiled beside the tokens it reads its
  // schemes from; the controller's imports become globals of its test context.
  writeFileSync(
    join(dir, "preferences.mjs"),
    compile("../src/design/preferences.ts").replace(
      '"./tokens"',
      '"./tokens.mjs"',
    ),
  );
  const preferences = await import(pathToFileURL(join(dir, "preferences.mjs")));
  const { THEME_SCHEME, THEME_CSS } = await import(pathToFileURL(path));
  const bootstrap = preferences.PREFERENCES_BOOTSTRAP;
  const controller = compile("../src/scripts/preferences.ts")
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*"[^"]+";?/g, "")
    .replace(/export\s*\{\s*\};?/g, "");
  assert.doesNotMatch(controller, /\bimport\b/);
  const control = (dataset = {}) => ({
    dataset,
    hidden: true,
    attributes: {},
    listeners: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(name, fn) {
      this.listeners[name] = fn;
    },
  });
  function environment({ saved = {}, dark = false, blocked = false } = {}) {
    const root = {
      dataset: {},
      style: {},
      classList: {
        toggle(_name, state) {
          root.dark = state;
        },
      },
    };
    const buttons = [control(), control()];
    const choices = [
      ...preferences.THEME_OPTIONS.map(({ id }) => ["theme", id]),
      ...preferences.FONT_OPTIONS.map(({ id }) => ["font", id]),
      ...preferences.SPACING_OPTIONS.map(({ id }) => ["spacing", id]),
    ].map(([pref, value]) => ({ ...control({ pref }), value, checked: false }));
    const steps = [control({ sizeStep: "-1" }), control({ sizeStep: "1" })];
    const parts = {
      "[data-size-value]": { textContent: "" },
      "[data-auto-hint]": { hidden: true },
      "[data-settings-reset]": control(),
    };
    const lists = {
      "[data-theme-toggle]": buttons,
      "[data-pref]": choices,
      "[data-size-step]": steps,
    };
    const media = {
      matches: dark,
      listeners: {},
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
    };
    const storage = {
      values: { ...saved },
      getItem(key) {
        if (blocked) throw new Error("unavailable");
        return this.values[key] ?? null;
      },
      setItem(key, value) {
        if (blocked) throw new Error("unavailable");
        this.values[key] = String(value);
      },
      removeItem(key) {
        if (blocked) throw new Error("unavailable");
        delete this.values[key];
      },
    };
    const window = {
      listeners: {},
      matchMedia: () => media,
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
    };
    const pick = (pref, value) => {
      const input = choices.find(
        (choice) => choice.dataset.pref === pref && choice.value === value,
      );
      input.checked = true;
      input.listeners.change();
    };
    return {
      root,
      buttons,
      choices,
      steps,
      parts,
      media,
      storage,
      window,
      pick,
      checked: (pref) =>
        choices
          .filter((choice) => choice.dataset.pref === pref && choice.checked)
          .map((choice) => choice.value),
      context: {
        document: {
          documentElement: root,
          querySelectorAll: (selector) => lists[selector] ?? [],
          // The panel itself is exercised in a real browser, not here.
          querySelector: (selector) => parts[selector] ?? null,
        },
        window,
        localStorage: storage,
        requestAnimationFrame: (fn) => fn(),
        ...preferences,
        THEME_SCHEME,
      },
    };
  }
  const page = ({ root }) => ({
    theme: root.dataset.theme,
    dark: root.dark,
    scheme: root.style.colorScheme,
    font: root.dataset.font,
    size: root.dataset.textSize,
    spacing: root.dataset.spacing,
  });
  await t.test(
    "first paint follows saved choices, then the site as designed, including denied storage",
    () => {
      const plain = { font: undefined, size: undefined, spacing: undefined };
      for (const [options, expected] of [
        [{ saved: { theme: "light" }, dark: true }, { theme: "light" }],
        [{ saved: { theme: "dark" } }, { theme: "dark" }],
        [{ dark: true }, { theme: "light" }],
        [{ saved: { theme: "invalid" }, dark: true }, { theme: "light" }],
        [{ saved: { theme: "constructor" } }, { theme: "light" }],
        [{ blocked: true, dark: true }, { theme: "light" }],
        [{ saved: { theme: "sepia" }, dark: true }, { theme: "sepia" }],
        [{ saved: { theme: "snow" } }, { theme: "snow" }],
        [{ saved: { theme: "midnight" } }, { theme: "midnight" }],
        [{ saved: { theme: "auto" }, dark: true }, { theme: "dark" }],
        [{ saved: { theme: "auto" } }, { theme: "light" }],
        [
          {
            saved: {
              font: "serif",
              "text-size": "120",
              "line-spacing": "relaxed",
            },
          },
          { theme: "light", font: "serif", size: "120", spacing: "relaxed" },
        ],
        // A default, like anything unknown, is no attribute at all.
        [
          {
            saved: {
              font: "geist",
              "text-size": "100",
              "line-spacing": "normal",
            },
          },
          { theme: "light" },
        ],
        [
          {
            saved: {
              font: "comic",
              "text-size": "115",
              "line-spacing": "huge",
            },
          },
          { theme: "light" },
        ],
      ]) {
        const scheme = THEME_SCHEME[expected.theme];
        const wanted = {
          ...plain,
          ...expected,
          dark: scheme === "dark",
          scheme,
        };
        const env = environment(options);
        runInNewContext(bootstrap, env.context);
        assert.deepEqual(page(env), wanted, JSON.stringify(options));
        runInNewContext(controller, env.context);
        assert.deepEqual(page(env), wanted, JSON.stringify(options));
        assert.equal(
          env.buttons[0].attributes["aria-pressed"],
          String(scheme === "dark"),
        );
        assert.equal(env.buttons[1].hidden, false);
      }
    },
  );
  await t.test(
    "light is the default until an explicit choice is made, whatever the system prefers",
    () => {
      const env = environment({ dark: true });
      runInNewContext(controller, env.context);
      assert.equal(env.root.dataset.theme, "light");
      env.media.listeners.change();
      assert.equal(env.root.dataset.theme, "light");
      env.buttons[0].listeners.click();
      assert.equal(env.root.dataset.theme, "dark");
      assert.equal(env.storage.values.theme, "dark");
      env.buttons[0].listeners.click();
      assert.equal(env.root.dataset.theme, "light");
      assert.equal(env.storage.values.theme, "light");
      assert.equal(env.buttons[1].attributes["aria-label"], "Use dark theme");
    },
  );
  await t.test("auto is a choice, and then it follows the device", () => {
    const env = environment({ dark: true });
    runInNewContext(controller, env.context);
    assert.equal(env.parts["[data-auto-hint]"].hidden, true);
    env.pick("theme", "auto");
    assert.equal(env.storage.values.theme, "auto");
    assert.equal(env.root.dataset.theme, "dark");
    assert.equal(env.parts["[data-auto-hint]"].hidden, false);
    assert.deepEqual(env.checked("theme"), ["auto"]);
    env.media.matches = false;
    env.media.listeners.change();
    assert.equal(env.root.dataset.theme, "light");
    assert.equal(env.root.dark, false);
    // The header button leaves auto for the palette opposite the one showing.
    env.buttons[0].listeners.click();
    assert.equal(env.storage.values.theme, "dark");
    assert.equal(env.parts["[data-auto-hint]"].hidden, true);
  });
  await t.test("the header button answers any palette with paper or ink", () => {
    for (const [from, to] of [
      ["sepia", "dark"],
      ["snow", "dark"],
      ["midnight", "light"],
    ]) {
      const env = environment({ saved: { theme: from } });
      runInNewContext(controller, env.context);
      assert.equal(env.buttons[0].attributes["aria-pressed"], String(to === "light"));
      env.buttons[0].listeners.click();
      assert.equal(env.root.dataset.theme, to);
    }
  });
  await t.test("panel choices are applied, kept, and reset", () => {
    const env = environment();
    const reset = env.parts["[data-settings-reset]"];
    runInNewContext(controller, env.context);
    assert.equal(reset.attributes["aria-disabled"], "true");
    assert.deepEqual(env.checked("theme"), ["light"]);
    assert.deepEqual(env.checked("font"), ["geist"]);
    assert.deepEqual(env.checked("spacing"), ["normal"]);
    assert.equal(env.parts["[data-size-value]"].textContent, "100%");

    env.pick("theme", "midnight");
    env.pick("font", "mono");
    env.pick("spacing", "compact");
    assert.deepEqual(page(env), {
      theme: "midnight",
      dark: true,
      scheme: "dark",
      font: "mono",
      size: undefined,
      spacing: "compact",
    });
    assert.deepEqual(env.checked("font"), ["mono"]);
    assert.equal(reset.attributes["aria-disabled"], "false");

    // The stepper walks the list of sizes and stops at each end.
    const [smaller, larger] = env.steps;
    const sizes = preferences.TEXT_SIZES;
    for (let press = 0; press < sizes.length + 2; press++)
      larger.listeners.click();
    assert.equal(env.root.dataset.textSize, String(sizes.at(-1)));
    assert.equal(env.parts["[data-size-value]"].textContent, `${sizes.at(-1)}%`);
    assert.equal(larger.attributes["aria-disabled"], "true");
    assert.equal(smaller.attributes["aria-disabled"], "false");
    for (let press = 0; press < sizes.length + 2; press++)
      smaller.listeners.click();
    assert.equal(env.root.dataset.textSize, String(sizes[0]));
    assert.equal(smaller.attributes["aria-disabled"], "true");
    assert.deepEqual(env.storage.values, {
      theme: "midnight",
      font: "mono",
      "line-spacing": "compact",
      "text-size": String(sizes[0]),
    });

    reset.listeners.click();
    assert.deepEqual(env.storage.values, {});
    assert.deepEqual(page(env), {
      theme: "light",
      dark: false,
      scheme: "light",
      font: undefined,
      size: undefined,
      spacing: undefined,
    });
    assert.deepEqual(env.checked("theme"), ["light"]);
    assert.equal(reset.attributes["aria-disabled"], "true");
  });
  await t.test(
    "preferences remain usable with blocked storage and synchronize other tabs",
    () => {
      const env = environment({ blocked: true });
      runInNewContext(controller, env.context);
      env.buttons[0].listeners.click();
      assert.equal(env.root.dataset.theme, "dark");
      env.pick("font", "serif");
      assert.equal(env.root.dataset.font, "serif");
      env.window.listeners.storage({ key: "theme", newValue: "light" });
      assert.equal(env.root.dataset.theme, "light");
      assert.equal(env.root.dataset.font, "serif");
      env.window.listeners.storage({ key: "text-size", newValue: "110" });
      assert.equal(env.root.dataset.textSize, "110");
      env.window.listeners.storage({ key: "unrelated", newValue: "dark" });
      assert.equal(env.root.dataset.theme, "light");
      env.window.listeners.storage({ key: null, newValue: null });
      assert.equal(env.root.dataset.theme, "light");
      assert.equal(env.root.dataset.font, undefined);
      assert.equal(env.root.dataset.textSize, undefined);
    },
  );
  await t.test("every choice on offer has its styles", () => {
    const css = readFileSync(
      new URL("../src/styles/global.css", import.meta.url),
      "utf8",
    );
    const { DEFAULTS, THEME_OPTIONS, FONT_OPTIONS, TEXT_SIZES, SPACING_OPTIONS } =
      preferences;
    assert.deepEqual(
      THEME_OPTIONS.map(({ id }) => id)
        .filter((id) => id !== "auto")
        .sort(),
      Object.keys(THEMES).sort(),
    );
    assert.deepEqual(Object.keys(THEME_SCHEME).sort(), Object.keys(THEMES).sort());
    for (const theme of Object.keys(THEMES)) {
      if (theme === "light") continue;
      assert.ok(
        THEME_CSS.includes(`:root[data-theme="${theme}"] {`),
        `palette rule: ${theme}`,
      );
      assert.ok(
        THEME_CSS.includes(`color-scheme:${THEME_SCHEME[theme]}; }`),
        `color scheme: ${theme}`,
      );
    }
    for (const { id } of FONT_OPTIONS) {
      if (id === DEFAULTS.font) continue;
      assert.ok(css.includes(`:root[data-font="${id}"] {`), `font: ${id}`);
      assert.ok(css.includes(`[data-font-sample="${id}"]`), `font sample: ${id}`);
    }
    for (const size of TEXT_SIZES) {
      if (size === DEFAULTS.size) continue;
      const rule = css.match(
        new RegExp(`:root\\[data-text-size="${size}"\\] \\{\\s*--text-scale: ([\\d.]+);`),
      );
      assert.equal(Number(rule?.[1]), size / 100, `text size: ${size}`);
    }
    for (const { id } of SPACING_OPTIONS) {
      if (id === DEFAULTS.spacing) continue;
      assert.ok(css.includes(`:root[data-spacing="${id}"] {`), `spacing: ${id}`);
    }
  });
});

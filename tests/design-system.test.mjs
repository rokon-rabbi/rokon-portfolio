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
  const layout = readFileSync(
    new URL("../src/layouts/Layout.astro", import.meta.url),
    "utf8",
  );
  const bootstrap = layout.match(/<script is:inline>([\s\S]*?)<\/script>/)[1];
  const controller = compile("../src/scripts/theme.ts").replace(
    /export\s*\{\s*\};?/g,
    "",
  );
  function environment({
    preference = null,
    dark = false,
    blocked = false,
  } = {}) {
    const root = {
      dataset: {},
      style: {},
      classList: {
        toggle(_name, state) {
          root.dark = state;
        },
      },
    };
    const buttons = [0, 1].map(() => ({
      hidden: true,
      attributes: {},
      listeners: {},
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
    }));
    const media = {
      matches: dark,
      listeners: {},
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
    };
    const storage = {
      value: preference,
      getItem() {
        if (blocked) throw new Error("unavailable");
        return this.value;
      },
      setItem(_key, value) {
        if (blocked) throw new Error("unavailable");
        this.value = value;
      },
    };
    const window = {
      listeners: {},
      matchMedia: () => media,
      addEventListener(name, fn) {
        this.listeners[name] = fn;
      },
    };
    return {
      root,
      buttons,
      media,
      storage,
      window,
      context: {
        document: { documentElement: root, querySelectorAll: () => buttons },
        window,
        localStorage: storage,
        requestAnimationFrame: (fn) => fn(),
      },
    };
  }
  await t.test(
    "first paint follows saved choice, then system, including denied storage",
    () => {
      for (const [options, expected] of [
        [{ preference: "light", dark: true }, "light"],
        [{ preference: "dark", dark: false }, "dark"],
        [{ dark: true }, "dark"],
        [{ preference: "invalid", dark: true }, "dark"],
        [{ blocked: true, dark: true }, "dark"],
      ]) {
        const env = environment(options);
        runInNewContext(bootstrap, env.context);
        assert.equal(env.root.dataset.theme, expected);
        assert.equal(env.root.dark, expected === "dark");
        runInNewContext(controller, env.context);
        assert.equal(env.root.dataset.theme, expected);
        assert.equal(
          env.buttons[0].attributes["aria-pressed"],
          String(expected === "dark"),
        );
        assert.equal(env.buttons[1].hidden, false);
      }
    },
  );
  await t.test(
    "system changes are followed until an explicit choice is made",
    () => {
      const env = environment();
      runInNewContext(controller, env.context);
      env.media.matches = true;
      env.media.listeners.change();
      assert.equal(env.root.dataset.theme, "dark");
      env.buttons[0].listeners.click();
      assert.equal(env.root.dataset.theme, "light");
      assert.equal(env.storage.value, "light");
      env.media.listeners.change();
      assert.equal(env.root.dataset.theme, "light");
      assert.equal(env.buttons[1].attributes["aria-label"], "Use dark theme");
    },
  );
  await t.test(
    "theme remains usable with blocked storage and synchronizes other tabs",
    () => {
      const env = environment({ blocked: true });
      runInNewContext(controller, env.context);
      env.buttons[0].listeners.click();
      assert.equal(env.root.dataset.theme, "dark");
      env.window.listeners.storage({ key: "theme", newValue: "light" });
      assert.equal(env.root.dataset.theme, "light");
      env.window.listeners.storage({ key: null, newValue: null });
      assert.equal(env.root.dataset.theme, "light");
    },
  );
});

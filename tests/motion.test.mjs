import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const policy = await import(
  `data:text/javascript;base64,${Buffer.from(compile("../src/design/motion.ts")).toString("base64")}`
);
const controller = compile("../src/scripts/motion.ts")
  .replace('import("../lib/page-motion")', "loadMotion()")
  .replace(/if \(import\.meta\.hot\)[\s\S]*$/, "")
  .replace(/export \{\};?/, "");
const settle = async () => {
  for (let index = 0; index < 8; index++) await Promise.resolve();
};

function environment({
  reduced = false,
  deferred = false,
  failure = false,
  history = false,
} = {}) {
  const preference = Object.assign(new EventTarget(), { matches: reduced });
  const window = Object.assign(new EventTarget(), {
    matchMedia: () => preference,
  });
  const root = { isConnected: true, querySelector: () => ({}) };
  const document = Object.assign(new EventTarget(), {
    visibilityState: "visible",
    fonts: { ready: Promise.resolve() },
    getElementById: () => root,
  });
  const calls = { imports: 0, starts: [], stops: 0, warnings: 0 };
  const module = {
    createPageMotion: (target, seen, restored) => {
      calls.starts.push({ target, seen, restored });
      return () => {
        calls.stops++;
      };
    },
  };
  let release;
  const pending = new Promise((resolve) => {
    release = () => resolve(module);
  });
  runInNewContext(controller, {
    window,
    document,
    performance: {
      getEntriesByType: () => [{ type: history ? "back_forward" : "navigate" }],
    },
    location: { hash: "" },
    AbortController,
    WeakSet,
    requestAnimationFrame: (callback) => queueMicrotask(callback),
    console: {
      warn: () => {
        calls.warnings++;
      },
    },
    loadMotion: () => {
      calls.imports++;
      return failure
        ? Promise.reject(new Error("offline"))
        : deferred
          ? pending
          : Promise.resolve(module);
    },
  });
  return {
    calls,
    window,
    document,
    release,
    preference,
    change: (value) => {
      preference.matches = value;
      preference.dispatchEvent(new Event("change"));
    },
    show: () =>
      window.dispatchEvent(
        Object.assign(new Event("pageshow"), { persisted: true }),
      ),
  };
}

test("parallax excludes touch, narrow screens, constrained CPUs, memory and data connections", () => {
  const supported = { wide: true, fine: true, cores: 8, memory: 8 };
  assert.equal(policy.allowParallax(supported), true);
  for (const change of [
    { wide: false },
    { fine: false },
    { cores: 4 },
    { memory: 4 },
    { saveData: true },
  ])
    assert.equal(policy.allowParallax({ ...supported, ...change }), false);
  assert.ok(policy.MOTION.compact.distance <= 6);
  assert.ok(policy.MOTION.compact.duration < policy.MOTION.desktop.duration);
});

test("initial reduced motion does not download or mount GSAP; live changes clean up", async () => {
  const env = environment({ reduced: true });
  await settle();
  assert.equal(env.calls.imports, 0);
  env.change(false);
  await settle();
  assert.equal(env.calls.starts.length, 1);
  assert.equal(env.calls.starts[0].restored, true);
  env.change(true);
  await settle();
  assert.equal(env.calls.stops, 1);
  assert.equal(env.calls.starts.length, 1);
});

test("pagehide disposes once and repeated pageshow/page-load events cannot duplicate mounts", async () => {
  const env = environment();
  await settle();
  env.document.dispatchEvent(new Event("astro:page-load"));
  await settle();
  assert.equal(env.calls.starts.length, 1);
  env.window.dispatchEvent(new Event("pagehide"));
  env.window.dispatchEvent(new Event("pagehide"));
  assert.equal(env.calls.stops, 1);
  env.show();
  env.show();
  await settle();
  assert.equal(env.calls.starts.length, 2);
  assert.equal(env.calls.starts[1].restored, true);
  assert.equal(env.calls.starts[1].seen, env.calls.starts[0].seen);
});

test("a lazy import resolving after unmount cannot create orphan animations", async () => {
  const env = environment({ deferred: true });
  env.window.dispatchEvent(new Event("pagehide"));
  env.release();
  await settle();
  assert.equal(env.calls.starts.length, 0);
  assert.equal(env.calls.stops, 0);
});

test("back navigation skips intro replay and failed enhancement leaves the page usable", async () => {
  const back = environment({ history: true });
  await settle();
  assert.equal(back.calls.starts[0].restored, true);
  const offline = environment({ failure: true });
  await settle();
  assert.equal(offline.calls.starts.length, 0);
  assert.equal(offline.calls.warnings, 1);
});

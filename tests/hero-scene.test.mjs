import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import ts from "typescript";

const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
const moduleURL = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const policy = await import(moduleURL(compile("../src/design/hero-scene.ts")));
const controller =
  compile("../src/lib/systems-hero.ts")
    .replace(/^import .* from .*;$/gm, "")
    .replace(/export (class|function)/g, "$1") +
  "\nglobalThis.Controller = SystemsHeroController;";

function environment({
  reduced = false,
  compact = false,
  fine = true,
  cores = 8,
  memory = 8,
  deferred = false,
  broken = false,
  webgl = true,
  saveData = false,
} = {}) {
  class Element extends EventTarget {
    dataset = {};
    hidden = false;
    isConnected = true;
    attributes = {};
    setAttribute(key, value) {
      this.attributes[key] = value;
    }
    querySelector(selector) {
      return this.children?.[selector] ?? null;
    }
    closest() {
      return null;
    }
    getBoundingClientRect() {
      return { width: 450, height: 400, left: 0, top: 0 };
    }
  }
  const host = new Element(),
    viewport = new Element(),
    pause = new Element();
  host.dataset.heroEnabled = "true";
  host.children = {
    "[data-hero-viewport]": viewport,
    "[data-hero-pause]": pause,
  };
  pause.children = {
    "[data-hero-pause-label]": {},
    ".systems-pause-icon": { setAttribute() {} },
  };
  const document = Object.assign(new EventTarget(), {
    visibilityState: "visible",
    documentElement: new Element(),
    activeElement: null,
  });
  const queries = new Map([
    [
      "(prefers-reduced-motion: reduce)",
      Object.assign(new EventTarget(), { matches: reduced }),
    ],
    [
      "(max-width: 63.999rem)",
      Object.assign(new EventTarget(), { matches: compact }),
    ],
    [
      "(hover: hover) and (pointer: fine)",
      Object.assign(new EventTarget(), { matches: fine }),
    ],
  ]);
  const observers = [];
  class Observer {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }
    observe(node) {
      this.target = node;
    }
    disconnect() {
      this.disconnected = true;
    }
    emit(records = []) {
      if (!this.disconnected) this.callback(records);
    }
  }
  let nextIdle = 0;
  const idles = new Map();
  const window = Object.assign(new EventTarget(), {
    matchMedia: (query) => queries.get(query),
    requestIdleCallback(callback) {
      const id = ++nextIdle;
      idles.set(id, callback);
      queueMicrotask(() => {
        if (idles.has(id)) {
          idles.delete(id);
          callback();
        }
      });
      return id;
    },
    cancelIdleCallback: (id) => idles.delete(id),
  });
  const calls = { imports: 0, probes: 0, scenes: [] };
  const sceneModule = {
    createSystemsScene(target, tier, palette, callbacks) {
      const record = {
        target,
        tier,
        palette,
        callbacks,
        running: false,
        disposed: 0,
        themes: 0,
        resizes: 0,
      };
      calls.scenes.push(record);
      return {
        setRunning: (value) => {
          record.running = value;
        },
        setTheme: () => {
          record.themes++;
        },
        resize: () => {
          record.resizes++;
        },
        setPointer() {},
        dispose: () => {
          record.disposed++;
        },
        diagnostics: () => ({
          tier,
          running: record.running,
          disposed: !!record.disposed,
        }),
      };
    },
  };
  let release;
  const loading = new Promise((resolve) => {
    release = () => resolve(sceneModule);
  });
  const sandbox = {
    scenePolicy: policy.scenePolicy,
    window,
    document,
    navigator: {
      hardwareConcurrency: cores,
      deviceMemory: memory,
      ...(saveData ? { connection: { saveData: true } } : {}),
    },
    IntersectionObserver: Observer,
    ResizeObserver: Observer,
    MutationObserver: Observer,
    AbortController,
    clearTimeout,
    getComputedStyle: () => ({ getPropertyValue: () => "#56D9BA" }),
  };
  runInNewContext(controller, sandbox);
  const owner = new sandbox.Controller(
    host,
    () => {
      calls.imports++;
      return broken
        ? Promise.reject(new Error("offline"))
        : deferred
          ? loading
          : Promise.resolve(sceneModule);
    },
    () => {
      calls.probes++;
      return webgl;
    },
  );
  return {
    owner,
    calls,
    host,
    pause,
    window,
    document,
    observers,
    release,
    visible: (value) =>
      observers[0].emit([
        { isIntersecting: value, intersectionRatio: value ? 1 : 0 },
      ]),
    reduce: (value) => {
      const query = queries.get("(prefers-reduced-motion: reduce)");
      query.matches = value;
      query.dispatchEvent(new Event("change"));
    },
  };
}
const settle = async () => {
  for (let index = 0; index < 10; index++) await Promise.resolve();
};

test("scene policy skips reduced motion, constrained devices and data saving before loading", () => {
  const capable = {
    reduced: false,
    compact: false,
    fine: true,
    cores: 8,
    memory: 8,
  };
  assert.equal(policy.scenePolicy(capable).tier, "full");
  for (const change of [
    { reduced: true },
    { enabled: false },
    { cores: 2 },
    { memory: 2 },
    { saveData: true },
    { connection: "2g" },
  ])
    assert.equal(policy.scenePolicy({ ...capable, ...change }).tier, "static");
  for (const change of [
    { compact: true },
    { fine: false },
    { cores: 4 },
    { memory: 4 },
  ])
    assert.equal(policy.scenePolicy({ ...capable, ...change }).tier, "compact");
});
test("DPR and backing-pixel caps apply independently of viewport size", () => {
  assert.equal(policy.scenePixelRatio(450, 400, 3, "full"), 1.5);
  assert.equal(policy.scenePixelRatio(450, 400, 3, "compact"), 1);
  const ratio = policy.scenePixelRatio(4000, 4000, 4, "full");
  assert.ok(4000 * 4000 * ratio * ratio <= policy.HERO_SCENE.maxPixels + 1);
});
test("sustained frame-budget pressure degrades before abandoning WebGL", () => {
  const slow = Array.from({ length: 30 }, () => ({ cost: 22, interval: 120 }));
  assert.equal(policy.sceneBudgetAction("full", slow.slice(0, 29)), "keep");
  assert.equal(policy.sceneBudgetAction("full", slow), "compact");
  assert.equal(policy.sceneBudgetAction("compact", slow), "static");
  assert.equal(
    policy.sceneBudgetAction(
      "full",
      slow.map(() => ({ cost: 2, interval: 34 })),
    ),
    "keep",
  );
});
test("SSR always contains static artwork and disabling the component restores the original shell", async () => {
  const jsx = import.meta.resolve("react/jsx-runtime");
  const artwork = moduleURL(
    compile("../src/components/design/SystemAssembly.tsx").replaceAll(
      '"react/jsx-runtime"',
      JSON.stringify(jsx),
    ),
  );
  const { SystemsHero } = await import(
    moduleURL(
      compile("../src/components/design/SystemsHero.tsx")
        .replaceAll('"react/jsx-runtime"', JSON.stringify(jsx))
        .replaceAll('"./SystemAssembly"', JSON.stringify(artwork)),
    )
  );
  const html = renderToStaticMarkup(createElement(SystemsHero));
  assert.ok(html.includes("<svg"));
  assert.ok(html.includes("data-hero-fallback"));
  assert.ok(html.includes('aria-hidden="true"'));
  assert.ok(html.includes('hidden=""'));
  assert.equal(html.includes("<canvas"), false);
  assert.equal(html.includes("data-motion-parallax"), false);
  const disabled = renderToStaticMarkup(
    createElement(SystemsHero, { enabled: false }),
  );
  assert.ok(disabled.includes("<svg"));
  assert.equal(disabled.includes("data-system-hero"), false);
});
test("an invisible hero and reduced-motion preference never probe WebGL or load Three.js", async () => {
  for (const reduced of [false, true]) {
    const env = environment({ reduced });
    if (reduced) env.visible(true);
    await settle();
    assert.equal(env.calls.imports, 0);
    assert.equal(env.calls.probes, 0);
    env.owner.dispose();
  }
});
test("data-saving capability works without optional NetworkInformation event methods", async () => {
  const env = environment({ saveData: true });
  env.visible(true);
  await settle();
  assert.equal(env.calls.imports, 0);
  assert.equal(env.calls.probes, 0);
  env.owner.dispose();
});
test("visibility and manual pause control one scene without duplicate mounts", async () => {
  const env = environment();
  env.visible(true);
  env.visible(true);
  await settle();
  assert.equal(env.calls.scenes.length, 1);
  assert.equal(env.calls.scenes[0].running, true);
  env.pause.dispatchEvent(new Event("click"));
  assert.equal(env.calls.scenes[0].running, false);
  env.document.visibilityState = "hidden";
  env.document.dispatchEvent(new Event("visibilitychange"));
  env.document.visibilityState = "visible";
  env.document.dispatchEvent(new Event("visibilitychange"));
  assert.equal(env.calls.scenes[0].running, false);
  env.pause.dispatchEvent(new Event("click"));
  assert.equal(env.calls.scenes[0].running, true);
  env.visible(false);
  assert.equal(env.calls.scenes[0].running, false);
  env.visible(true);
  assert.equal(env.calls.scenes.length, 1);
  env.owner.dispose();
});
test("live reduced motion and pagehide dispose GPU owners; cached restoration mounts once", async () => {
  const env = environment();
  env.visible(true);
  await settle();
  env.reduce(true);
  assert.equal(env.calls.scenes[0].disposed, 1);
  assert.equal(env.host.dataset.heroReason, "reduced-motion");
  env.reduce(false);
  await settle();
  env.window.dispatchEvent(new Event("pagehide"));
  assert.equal(env.calls.scenes[1].disposed, 1);
  env.window.dispatchEvent(new Event("pageshow"));
  env.window.dispatchEvent(new Event("pageshow"));
  await settle();
  assert.equal(env.calls.scenes.length, 3);
  env.owner.dispose();
  env.owner.dispose();
  assert.ok(env.calls.scenes.every((scene) => scene.disposed === 1));
  assert.ok(env.observers.every((observer) => observer.disconnected));
});
test("a lazy module resolving after unmount cannot allocate scene resources", async () => {
  const env = environment({ deferred: true });
  env.visible(true);
  await settle();
  assert.equal(env.calls.imports, 1);
  env.owner.dispose();
  env.release();
  await settle();
  assert.equal(env.calls.scenes.length, 0);
});
test("WebGL, import and runtime failures keep a sticky static fallback", async () => {
  const unsupported = environment({ webgl: false });
  unsupported.visible(true);
  await settle();
  assert.equal(unsupported.calls.imports, 0);
  assert.equal(unsupported.host.dataset.heroReason, "webgl-unavailable");
  unsupported.owner.dispose();
  const offline = environment({ broken: true });
  offline.visible(true);
  await settle();
  assert.equal(offline.host.dataset.heroReason, "initialization-failed");
  offline.visible(false);
  offline.visible(true);
  await settle();
  assert.equal(offline.calls.imports, 1);
  offline.owner.dispose();
  const runtime = environment();
  runtime.visible(true);
  await settle();
  runtime.calls.scenes[0].callbacks.fallback("frame-budget");
  assert.equal(runtime.host.dataset.heroStatus, "static");
  assert.equal(runtime.calls.scenes[0].disposed, 1);
  runtime.visible(false);
  runtime.visible(true);
  await settle();
  assert.equal(runtime.calls.scenes.length, 1);
  runtime.owner.dispose();
});
test("theme/resize updates reuse resources and runtime disabling removes the enhancement", async () => {
  const env = environment({ compact: true });
  env.visible(true);
  await settle();
  assert.equal(env.calls.scenes[0].tier, "compact");
  env.observers[1].emit();
  env.observers[2].emit();
  assert.equal(env.calls.scenes[0].resizes, 1);
  assert.equal(env.calls.scenes[0].themes, 1);
  assert.equal(env.calls.scenes.length, 1);
  env.host.dataset.heroEnabled = "false";
  env.observers[3].emit();
  assert.equal(env.host.dataset.heroReason, "disabled");
  assert.equal(env.calls.scenes[0].disposed, 1);
  env.owner.dispose();
});

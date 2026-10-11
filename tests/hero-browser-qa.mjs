const QA_ORIGIN = process.env.QA_ORIGIN || "http://127.0.0.1:4321";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const targets = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const target = targets.find((t) => t.type === "page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let next = 0;
const pending = new Map();
const errors = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const handler = pending.get(message.id);
    if (handler) {
      pending.delete(message.id);
      message.error
        ? handler.reject(message.error)
        : handler.resolve(message.result);
    }
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(
      message.params.exceptionDetails.text +
        ": " +
        message.params.exceptionDetails.exception?.description,
    );
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const view = async (width, height = 1000) => {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await sleep(180);
};
const navigate = async (path) => {
  await send("Page.navigate", { url: QA_ORIGIN + path });
  await sleep(700);
  await evaluate("document.fonts.ready.then(() => true)");
};
const key = async (key) => {
  const code = {
    Enter: 13,
    Tab: 9,
    Escape: 27,
    ArrowRight: 39,
    ArrowLeft: 37,
    Home: 36,
    End: 35,
  }[key];
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code: key,
    windowsVirtualKeyCode: code,
    nativeVirtualKeyCode: code,
    ...(key === "Enter" ? { text: "\r" } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code: key,
    windowsVirtualKeyCode: code,
    nativeVirtualKeyCode: code,
  });
  await sleep(60);
};

const checks = [],
  diagnostics = {};
const fixtures = [];
const record = (label) => {
  checks.push(label);
  console.log("PASS", label);
};
const captures = new URL("../docs/hero-previews/", import.meta.url);
mkdirSync(captures, { recursive: true });
const sceneState = () =>
  evaluate(
    `document.querySelector('[data-system-hero]')?.systemsHero?.diagnostics()`,
  );
const waitFor = async (expression) => {
  const end = Date.now() + 12000;
  while (Date.now() < end) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(
    "Timed out: " + expression + " " + JSON.stringify(await sceneState()),
  );
};
const capture = async (name) => {
  await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL(name + ".png", captures), Buffer.from(data, "base64"));
};
const visibleContent = () =>
  evaluate(`(() => {
 const copy = document.querySelector('.hero-copy');
 return {h1:copy.querySelector('h1').textContent, links:[...copy.querySelectorAll('a')].map(el=>el.getAttribute('href')),
  hidden:[...copy.querySelectorAll('*')].filter(el=>getComputedStyle(el).opacity==='0'||getComputedStyle(el).visibility==='hidden').length,
  overflow:document.documentElement.scrollWidth > innerWidth};
})()`);
const threeRequested = () =>
  evaluate(
    "performance.getEntriesByType('resource').some(e=>e.name.includes('systems-scene')||e.name.includes('/three.js'))",
  );

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setHardwareConcurrencyOverride", {
    hardwareConcurrency: 8,
  });
  await send("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-reduced-motion", value: "no-preference" },
      { name: "prefers-color-scheme", value: "dark" },
    ],
  });
  await view(1440);
  await navigate("/");
  await waitFor("document.querySelector('[data-system-hero]')?.systemsHero");
  await evaluate("localStorage.setItem('theme','dark')");
  await sleep(200);
  diagnostics.native = await sceneState();
  assert.equal((await visibleContent()).hidden, 0);
  // The real capability check rejects software contexts with a major performance
  // caveat. Chrome below runs SwiftShader for reproducible shader/draw verification.
  if (diagnostics.native.status === "static") {
    assert.equal(diagnostics.native.reason, "webgl-unavailable");
    assert.equal(await threeRequested(), false);
    assert.equal(
      await evaluate(
        "getComputedStyle(document.querySelector('[data-hero-fallback]')).visibility",
      ),
      "visible",
    );
  }
  record(
    "native capability policy keeps readable content and honors reported WebGL availability",
  );

  const fixture = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
 const originalMedia = window.matchMedia.bind(window);
 window.matchMedia = query => originalMedia(query === '(hover: hover) and (pointer: fine)' ? '(min-width: 0px)' : query);
 const originalContext = HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext = function(type, options) {
  return originalContext.call(this,type,type==='webgl2' ? {...options,failIfMajorPerformanceCaveat:false} : options);
 };
`,
  });
  fixtures.push(fixture.identifier);
  await navigate("/");
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroStatus==='ready'",
  );
  await sleep(500);
  diagnostics.desktop = await sceneState();
  assert.equal(diagnostics.desktop.scene.tier, "full");
  assert.equal(diagnostics.desktop.scene.nodes, 5);
  assert.ok(diagnostics.desktop.scene.frames > 0);
  assert.ok(diagnostics.desktop.scene.calls <= 32);
  assert.ok(diagnostics.desktop.scene.triangles <= 300);
  assert.equal(diagnostics.desktop.scene.textures, 0);
  assert.ok(diagnostics.desktop.scene.pixelRatio <= 1.5);
  assert.equal(
    await evaluate("document.querySelectorAll('canvas.systems-canvas').length"),
    1,
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('[data-system-hero] [data-motion-parallax]').length",
    ),
    0,
  );
  assert.equal((await visibleContent()).hidden, 0);
  await capture("desktop-dark");
  record(
    "desktop fixture renders five connected nodes with bounded geometry, draw calls, DPR and no textures",
  );

  const geometry = await evaluate(
    "[document.querySelector('.systems-viewport').offsetHeight,document.querySelector('.hero-stage').offsetHeight,document.documentElement.scrollHeight]",
  );
  await evaluate("document.querySelector('[data-hero-pause]').focus()");
  await key("Enter");
  assert.equal((await sceneState()).paused, true);
  assert.equal((await sceneState()).scene.running, false);
  assert.equal(
    await evaluate(
      "document.querySelector('[data-hero-pause]').getAttribute('aria-label')",
    ),
    "Resume scene motion",
  );
  assert.equal(
    await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
    "solid",
  );
  const pausedFrames = (await sceneState()).scene.frames;
  await sleep(300);
  assert.equal((await sceneState()).scene.frames, pausedFrames);
  record(
    "keyboard pause stops the render loop and preserves focus with a visible outline",
  );

  await evaluate("document.querySelector('[data-theme-toggle]').click()");
  await sleep(150);
  assert.equal(
    await evaluate("document.documentElement.dataset.theme"),
    "light",
  );
  assert.equal((await sceneState()).scene.frames, pausedFrames);
  assert.equal((await sceneState()).scene.running, false);
  await capture("desktop-light-paused");
  assert.deepEqual(
    await evaluate(
      "[document.querySelector('.systems-viewport').offsetHeight,document.querySelector('.hero-stage').offsetHeight,document.documentElement.scrollHeight]",
    ),
    geometry,
  );
  record(
    "theme changes update the paused scene while reserved hero geometry stays unchanged",
  );
  await evaluate("document.querySelector('[data-hero-pause]').click()");
  await sleep(200);
  const point = await evaluate(
    "(() => {const b=document.querySelector('.systems-viewport').getBoundingClientRect();return {x:b.right-12,y:b.top+12};})()",
  );
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await sleep(500);
  const pointer = (await sceneState()).scene.pointer;
  assert.ok(Math.abs(pointer[0]) > 0.1);
  assert.ok(pointer.every((value) => Math.abs(value) <= 1));
  record("scoped mouse response is bounded and requires the desktop tier");

  await evaluate(
    "document.querySelector('#work').scrollIntoView({behavior:'instant'})",
  );
  await sleep(350);
  assert.equal((await sceneState()).scene.running, false);
  const offscreenFrames = (await sceneState()).scene.frames;
  await sleep(300);
  assert.equal((await sceneState()).scene.frames, offscreenFrames);
  await evaluate("window.scrollTo({top:0,behavior:'instant'})");
  await sleep(400);
  assert.equal((await sceneState()).scene.running, true);
  record(
    "leaving the hero pauses rendering and returning resumes the same scene",
  );

  const other = await send("Target.createTarget", { url: "about:blank" });
  await send("Emulation.setFocusEmulationEnabled", { enabled: false });
  await send("Target.activateTarget", { targetId: other.targetId });
  await sleep(250);
  assert.equal(await evaluate("document.visibilityState"), "hidden");
  assert.equal((await sceneState()).scene.running, false);
  await send("Target.activateTarget", { targetId: target.id });
  await send("Target.closeTarget", { targetId: other.targetId });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await sleep(300);
  assert.equal((await sceneState()).scene.running, true);
  record("a hidden tab stops rendering and foreground visibility resumes it");

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await sleep(200);
  assert.equal((await sceneState()).scene, null);
  assert.equal((await sceneState()).reason, "reduced-motion");
  assert.equal(
    await evaluate("document.querySelectorAll('.systems-canvas').length"),
    0,
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('[data-hero-fallback]')).visibility",
    ),
    "visible",
  );
  assert.equal((await visibleContent()).hidden, 0);
  await capture("reduced-motion-static");
  await navigate("/");
  assert.equal(await threeRequested(), false);
  assert.equal((await sceneState()).reason, "reduced-motion");
  record(
    "live reduced motion disposes the canvas; initial reduced motion skips Three.js entirely",
  );

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await view(390);
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 1000,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await navigate("/");
  await evaluate(
    "document.querySelector('.systems-viewport').scrollIntoView({behavior:'instant',block:'center'})",
  );
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroStatus==='ready'",
  );
  diagnostics.mobile = await sceneState();
  assert.equal(diagnostics.mobile.scene.tier, "compact");
  assert.equal(diagnostics.mobile.scene.nodes, 3);
  assert.equal(diagnostics.mobile.scene.packets, 1);
  assert.equal(diagnostics.mobile.scene.pixelRatio, 1);
  const canvasSize = await evaluate(
    "(() => {const c=document.querySelector('.systems-canvas');return {width:c.width,css:c.clientWidth};})()",
  );
  assert.ok(Math.abs(canvasSize.width - canvasSize.css) < 2);
  assert.deepEqual(diagnostics.mobile.scene.pointer, [0, 0]);
  assert.equal((await visibleContent()).overflow, false);
  await capture("mobile-light");
  const touch = await evaluate(
    "(() => {const b=document.querySelector('.systems-viewport').getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};})()",
  );
  const beforeTouch = await evaluate("scrollY");
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [touch],
  });
  await send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: touch.x, y: touch.y - 120 }],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(350);
  assert.ok((await evaluate("scrollY")) > beforeTouch);
  record(
    "mobile caps DPR at one, uses three nodes/one signal, and lets native touch scrolling cross the scene",
  );
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await view(1440);

  await send("Emulation.setHardwareConcurrencyOverride", {
    hardwareConcurrency: 2,
  });
  await navigate("/");
  assert.equal((await sceneState()).reason, "device-budget");
  assert.equal(await threeRequested(), false);
  await send("Emulation.setHardwareConcurrencyOverride", {
    hardwareConcurrency: 8,
  });
  record(
    "two-core policy keeps the static illustration without loading Three.js",
  );
  const saveData = await send("Page.addScriptToEvaluateOnNewDocument", {
    source:
      "Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true});",
  });
  fixtures.push(saveData.identifier);
  await navigate("/");
  assert.equal((await sceneState()).reason, "data-saving");
  assert.equal(await threeRequested(), false);
  await send("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: saveData.identifier,
  });
  fixtures.splice(fixtures.indexOf(saveData.identifier), 1);
  record(
    "data-saving preference skips GPU allocation and the optional module download",
  );

  const unavailable = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
 const contextBeforeFailure=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(type,options){return type==='webgl2'?null:contextBeforeFailure.call(this,type,options);};
`,
  });
  fixtures.push(unavailable.identifier);
  await navigate("/");
  assert.equal((await sceneState()).reason, "webgl-unavailable");
  assert.equal(await threeRequested(), false);
  assert.equal((await visibleContent()).hidden, 0);
  await send("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: unavailable.identifier,
  });
  fixtures.splice(fixtures.indexOf(unavailable.identifier), 1);
  record(
    "WebGL-unavailable browsers retain the complete hero and static artwork",
  );

  await navigate("/");
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroStatus==='ready'",
  );
  await evaluate(
    "document.querySelector('.systems-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()",
  );
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroReason==='context-lost'",
  );
  assert.equal((await sceneState()).scene, null);
  assert.equal(
    await evaluate("document.querySelectorAll('.systems-canvas').length"),
    0,
  );
  await sleep(250);
  assert.equal((await sceneState()).status, "static");
  record(
    "runtime context loss disposes resources and leaves a stable static fallback",
  );

  await navigate("/");
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroStatus==='ready'",
  );
  await evaluate(
    "document.querySelector('[data-system-hero]').dataset.heroEnabled='false'",
  );
  await sleep(150);
  assert.equal((await sceneState()).reason, "disabled");
  assert.equal((await sceneState()).scene, null);
  assert.equal((await visibleContent()).hidden, 0);
  await evaluate(
    "document.querySelector('[data-system-hero]').dataset.heroEnabled='true'",
  );
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroStatus==='ready'",
  );
  assert.equal(
    await evaluate("document.querySelectorAll('.systems-canvas').length"),
    1,
  );
  record(
    "runtime disabling removes the canvas without affecting content; re-enabling creates one owner",
  );

  await evaluate(`sessionStorage.removeItem('hero-pagehide'); window.addEventListener('pagehide',()=>{
 sessionStorage.setItem('hero-pagehide',JSON.stringify({canvases:document.querySelectorAll('.systems-canvas').length,scene:document.querySelector('[data-system-hero]').systemsHero.diagnostics().scene}));
},{once:true}); document.querySelector('.desktop-nav a[href="/work"]').click();`);
  await sleep(800);
  assert.equal(await evaluate("location.pathname"), "/work");
  assert.deepEqual(
    await evaluate("JSON.parse(sessionStorage.getItem('hero-pagehide'))"),
    { canvases: 0, scene: null },
  );
  assert.equal(
    await evaluate("document.querySelectorAll('[data-system-hero]').length"),
    0,
  );
  await evaluate("history.back()");
  await sleep(850);
  await waitFor(
    "document.querySelector('[data-system-hero]')?.dataset.heroStatus==='ready'",
  );
  assert.equal(
    await evaluate("document.querySelectorAll('.systems-canvas').length"),
    1,
  );
  record(
    "real navigation releases GPU ownership; back navigation restores a single isolated hero",
  );

  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await view(320);
  await navigate("/");
  assert.equal(
    await evaluate("document.querySelectorAll('.systems-canvas').length"),
    0,
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('[data-hero-fallback]')).visibility",
    ),
    "visible",
  );
  assert.equal((await visibleContent()).hidden, 0);
  assert.equal((await visibleContent()).overflow, false);
  await capture("no-javascript-mobile");
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  record(
    "320px no-JavaScript fallback keeps typography, links, artwork and layout intact",
  );
  assert.deepEqual(errors, []);
  record("no browser exceptions");
  writeFileSync(
    new URL("qa-results.json", captures),
    JSON.stringify(
      {
        checks,
        diagnostics,
        renderer:
          "SwiftShader fixture; major-performance-caveat gate relaxed only in test fixture",
        exceptions: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("COMPLETE", checks.length, "hero browser checks");
} finally {
  for (const identifier of fixtures)
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  socket.close();
}

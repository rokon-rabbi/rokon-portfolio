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

const checks = [];
const record = (label) => {
  checks.push(label);
  console.log("PASS", label);
};
const captures = new URL("../docs/motion-previews/", import.meta.url);
mkdirSync(captures, { recursive: true });
// Test-only handle to the already loaded Vite dependency; never imports GSAP
// into a reduced-motion page that has deliberately skipped that dependency.
const attach = () =>
  evaluate(`(async () => {
 const dependency = performance.getEntriesByType('resource').find(e => /\\/gsap\\.js\\?/.test(e.name));
 if (dependency) window.motionTestGsap = (await import(dependency.name)).gsap;
})()`);
const state = async () => {
  await attach();
  return evaluate(`(() => {
 const trigger = window.motionTestGsap?.core.globals().ScrollTrigger;
 return { loaded: !!trigger, count: trigger?.getAll().length ?? 0,
  parallax: trigger?.getAll().filter(t => t.trigger?.classList.contains('hero-stage')).length ?? 0,
  tracks: trigger?.getAll().filter(t => t.trigger?.classList.contains('timeline-content')).length ?? 0,
  hidden: [...document.querySelectorAll('[data-motion]')].filter(el => {
   const s = getComputedStyle(el); return s.opacity !== '1' || s.visibility !== 'visible' || s.display === 'none';
  }).length,
  transformed: [...document.querySelectorAll('[data-motion],[data-motion-track],[data-motion-parallax]')].filter(el => !!el.style.transform).length,
  scrollY, overflow: document.documentElement.scrollWidth > innerWidth,
  smooth: getComputedStyle(document.documentElement).scrollBehavior };
})()`);
};
const waitFor = async (expression, timeout = 5000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    await attach();
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(80);
  }
  throw new Error("Timed out: " + expression);
};
const screenshot = async (name) => {
  await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(new URL(name + ".png", captures), Buffer.from(data, "base64"));
};
const tap = async (selector) => {
  const point = await evaluate(`(() => {
    const bounds = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return {x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
  })()`);
  await send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sleep(250);
};
let pointerFixture;

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
  await waitFor(
    "window.motionTestGsap?.core.globals().ScrollTrigger.getAll().length > 0",
  );
  await evaluate('document.querySelector(".hero-actions a").focus()');
  assert.equal(
    await evaluate('document.querySelector(".hero-actions").style.transform'),
    "",
  );
  assert.equal(
    await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
    "solid",
  );
  await evaluate("document.activeElement.blur()");
  record(
    "keyboard focus immediately finishes its introduction and keeps the focus outline",
  );
  await sleep(700);
  const desktop = await state();
  assert.ok(desktop.count > 10);
  assert.equal(desktop.hidden, 0);
  assert.equal(desktop.overflow, false);
  assert.equal(desktop.smooth, "smooth");
  assert.equal(desktop.tracks, 2);
  assert.equal(desktop.parallax, 0);
  assert.equal(
    await evaluate(
      "window.motionTestGsap.globalTimeline.getChildren().some(t => t.vars.pin)",
    ),
    false,
  );
  record(
    "desktop entrances and timeline mount; Three.js hero has no competing GSAP parallax",
  );
  await screenshot("home-desktop-dark");

  const layout = await evaluate(
    "[document.documentElement.scrollHeight, ...[...document.querySelectorAll('[data-motion]')].map(el => [el.offsetTop, el.offsetHeight, el.offsetWidth])]",
  );
  await evaluate(`window.motionShifts = []; window.motionObserver = new PerformanceObserver(list => {
  window.motionShifts.push(...list.getEntries().filter(e => !e.hadRecentInput).map(e => e.value));
}); window.motionObserver.observe({type:'layout-shift'});`);
  await send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: 700,
    y: 700,
    deltaX: 0,
    deltaY: 640,
  });
  await sleep(1000);
  assert.ok((await state()).scrollY > 500);
  assert.equal((await state()).hidden, 0);
  assert.deepEqual(
    await evaluate(
      "[document.documentElement.scrollHeight, ...[...document.querySelectorAll('[data-motion]')].map(el => [el.offsetTop, el.offsetHeight, el.offsetWidth])]",
    ),
    layout,
  );
  assert.equal(await evaluate("window.motionShifts.reduce((a,b)=>a+b,0)"), 0);
  record(
    "native wheel scrolling triggers entrances without layout shifts or changing document geometry",
  );

  await evaluate(
    'document.querySelector("#work").scrollIntoView({behavior:"instant"})',
  );
  await sleep(700);
  const scales = await evaluate(
    "[...document.querySelectorAll('[data-motion-track]')].map(el => getComputedStyle(el).transform)",
  );
  assert.ok(scales.some((value) => value !== "matrix(1, 0, 0, 0, 0, 0)"));
  await screenshot("experience-progression-dark");
  record(
    "experience progression follows scroll while contribution text remains static and readable",
  );

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await sleep(200);
  const reducedLive = await state();
  assert.equal(reducedLive.count, 0);
  assert.equal(reducedLive.transformed, 0);
  assert.equal(reducedLive.smooth, "auto");
  assert.equal(reducedLive.hidden, 0);
  record(
    "live reduced-motion change reverts transforms and removes every owned ScrollTrigger",
  );
  await navigate("/work/chemistry-calculator");
  assert.equal((await state()).loaded, false);
  assert.equal((await state()).hidden, 0);
  assert.equal(
    await evaluate(
      'getComputedStyle(document.querySelector(".button")).transitionDuration',
    ),
    "0s",
  );
  record(
    "initial reduced motion skips the GSAP module and retains complete case-study content",
  );

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });
  await waitFor(
    "window.motionTestGsap?.core.globals().ScrollTrigger.getAll().length > 0",
  );
  await view(390);
  await navigate("/");
  await waitFor(
    "window.motionTestGsap?.core.globals().ScrollTrigger.getAll().length > 0",
  );
  await sleep(600);
  const mobile = await state();
  assert.equal(mobile.parallax, 0);
  assert.equal(mobile.tracks, 0);
  assert.equal(mobile.hidden, 0);
  assert.equal(mobile.overflow, false);
  await evaluate('document.querySelector("[data-mobile-nav] summary").focus()');
  await key("Enter");
  assert.equal(
    await evaluate('document.querySelector("[data-mobile-nav]").open'),
    true,
  );
  assert.equal(
    await evaluate(
      'getComputedStyle(document.querySelector(".mobile-nav-panel")).animationDuration',
    ),
    "0.18s",
  );
  await key("Escape");
  assert.equal(
    await evaluate(
      'document.activeElement.matches("[data-mobile-nav] summary")',
    ),
    true,
  );
  await screenshot("home-mobile-light");
  record(
    "mobile uses compact motion, omits scroll effects, and keeps native keyboard menu behavior",
  );
  await send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await tap("[data-mobile-nav] summary");
  assert.equal(
    await evaluate('document.querySelector("[data-mobile-nav]").open'),
    true,
  );
  await tap('.mobile-nav-panel a[href="/work"]');
  await sleep(700);
  assert.equal(await evaluate("location.pathname"), "/work");
  assert.equal(
    await evaluate('document.querySelector("[data-mobile-nav]").open'),
    false,
  );
  assert.equal((await state()).hidden, 0);
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  record(
    "real touch events open the native menu and navigate to Work without hover dependence",
  );

  await view(1440);
  await send("Emulation.setHardwareConcurrencyOverride", {
    hardwareConcurrency: 4,
  });
  await navigate("/");
  await waitFor(
    "window.motionTestGsap?.core.globals().ScrollTrigger.getAll().length > 0",
  );
  assert.equal((await state()).parallax, 0);
  assert.equal((await state()).tracks, 0);
  record("four-core device policy disables decorative continuous effects");
  await send("Emulation.setHardwareConcurrencyOverride", {
    hardwareConcurrency: 8,
  });

  await navigate(
    "/work/community-driven-social-volunteering-platform#architecture",
  );
  await waitFor("window.motionTestGsap?.core.globals().ScrollTrigger");
  await sleep(900);
  const anchorTop = await evaluate(
    'document.querySelector("#architecture").getBoundingClientRect().top',
  );
  assert.ok(
    anchorTop >= 95 && anchorTop < 200,
    `Architecture top: ${anchorTop}`,
  );
  await evaluate('document.querySelector(".case-code pre").focus()');
  assert.equal(
    await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
    "solid",
  );
  await screenshot("case-study-architecture-light");
  record(
    "direct fragments stay below the sticky header and code remains keyboard accessible",
  );

  await navigate("/");
  await waitFor("window.motionTestGsap?.core.globals().ScrollTrigger");
  await evaluate(
    'document.querySelector("#projects").scrollIntoView({behavior:"instant"})',
  );
  await sleep(800);
  const before = (await state()).scrollY;
  // Record cleanup synchronously before the browser freezes this document.
  await evaluate(`sessionStorage.removeItem('motion-pagehide'); window.addEventListener('pagehide', () => {
 sessionStorage.setItem('motion-pagehide', JSON.stringify({ count: window.motionTestGsap.core.globals().ScrollTrigger.getAll().length,
  transforms: [...document.querySelectorAll('[data-motion],[data-motion-track],[data-motion-parallax]')].filter(el=>!!el.style.transform).length }));
}, {once:true}); document.querySelector('.featured-project .project-title-link').click();`);
  await sleep(900);
  assert.equal(
    await evaluate("location.pathname"),
    "/work/community-driven-social-volunteering-platform",
  );
  assert.deepEqual(
    await evaluate("JSON.parse(sessionStorage.getItem('motion-pagehide'))"),
    { count: 0, transforms: 0 },
  );
  await evaluate("history.back()");
  await sleep(1100);
  assert.equal(await evaluate("location.pathname"), "/");
  await waitFor("window.motionTestGsap?.core.globals().ScrollTrigger");
  const back = await state();
  assert.ok(
    Math.abs(back.scrollY - before) < 3,
    `Restored ${back.scrollY}, expected ${before}`,
  );
  assert.ok(back.count <= desktop.count);
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('[data-motion=hero],[data-motion=intro]')].some(el=>!!el.style.transform)",
    ),
    false,
  );
  await evaluate("history.forward()");
  await sleep(900);
  assert.equal(
    await evaluate("location.pathname"),
    "/work/community-driven-social-volunteering-platform",
  );
  await evaluate("history.back()");
  await sleep(1100);
  assert.ok((await state()).count <= desktop.count);
  record(
    "real link navigation cleans up; repeated back/forward restores scroll without replay or duplicate triggers",
  );

  // Headless Linux reports no hovering pointer. Exercise the positive gate in
  // an explicit pointer-capability fixture; viewport/reduced motion stay native.
  pointerFixture = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => nativeMatchMedia(query === '(hover: hover) and (pointer: fine)' ? '(min-width: 0px)' : query);
  `,
  });
  await navigate("/");
  await waitFor(
    "window.motionTestGsap?.core.globals().ScrollTrigger.getAll().length > 0",
  );
  assert.equal((await state()).parallax, 0);
  await evaluate("window.scrollTo({top:1000,behavior:'instant'})");
  await sleep(300);
  assert.equal(
    await evaluate(
      "document.querySelectorAll('[data-system-hero] [data-motion-parallax]').length",
    ),
    0,
  );
  record("desktop-pointer fixture keeps Three.js and GSAP ownership separate");

  await send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const performanceSample = await evaluate(`new Promise(resolve => {
 const deltas = []; let start, previous;
 function tick(now) { start ??= now; if(previous) deltas.push(now-previous); previous=now;
  if(now-start < 1600) requestAnimationFrame(tick); else {
   deltas.sort((a,b)=>a-b); resolve({frames:deltas.length, median:deltas[Math.floor(deltas.length/2)], p95:deltas[Math.floor(deltas.length*.95)]});
  }
 }
 requestAnimationFrame(tick); window.scrollTo({top:document.querySelector('#skills').offsetTop,behavior:'smooth'});
})`);
  await send("Emulation.setCPUThrottlingRate", { rate: 1 });
  assert.ok(performanceSample.frames >= 35, JSON.stringify(performanceSample));
  record(
    "native scrolling and entrances remain responsive in a four-times CPU-throttled browser sample",
  );
  await send("Page.removeScriptToEvaluateOnNewDocument", {
    identifier: pointerFixture.identifier,
  });
  pointerFixture = undefined;

  await view(320);
  await navigate("/");
  await sleep(900);
  assert.equal((await state()).overflow, false);
  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await navigate("/");
  assert.equal(
    await evaluate("document.querySelectorAll('main > section').length"),
    8,
  );
  assert.equal((await state()).hidden, 0);
  assert.equal((await state()).transformed, 0);
  await evaluate('document.querySelector("[data-mobile-nav] summary").focus()');
  await key("Enter");
  assert.equal(
    await evaluate('document.querySelector("[data-mobile-nav]").open'),
    true,
  );
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  record(
    "320px layout and all homepage content/navigation remain usable without JavaScript",
  );
  assert.deepEqual(errors, []);
  record("no browser exceptions");
  writeFileSync(
    new URL("qa-results.json", captures),
    JSON.stringify(
      {
        checks,
        desktop,
        mobile,
        reducedLive,
        performanceSample,
        exceptions: errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("COMPLETE", checks.length, "motion browser checks");
} finally {
  if (pointerFixture)
    await send("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: pointerFixture.identifier,
    });
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await send("Emulation.setScriptExecutionDisabled", { value: false });
  socket.close();
}

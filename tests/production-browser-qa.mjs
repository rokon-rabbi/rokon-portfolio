import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:4173";
const targets = await (await fetch("http://127.0.0.1:9333/json/list")).json();
const socket = new WebSocket(
  targets.find((target) => target.type === "page").webSocketDebuggerUrl,
);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let id = 0;
const pending = new Map(),
  exceptions = [],
  requests = [];
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const handler = pending.get(message.id);
    pending.delete(message.id);
    message.error
      ? handler.reject(message.error)
      : handler.resolve(message.result);
  } else if (message.method === "Runtime.exceptionThrown")
    exceptions.push(message.params.exceptionDetails);
  else if (message.method === "Network.requestWillBeSent")
    requests.push(message.params.request.url);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const ticket = ++id;
    pending.set(ticket, { resolve, reject });
    socket.send(JSON.stringify({ id: ticket, method, params }));
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
const navigate = async (path) => {
  await send("Page.navigate", { url: origin + path });
  await sleep(900);
  await evaluate("document.fonts.ready.then(()=>true)");
};
const key = async (key) => {
  const code = { Enter: 13, Tab: 9, Escape: 27 }[key];
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code: key,
    windowsVirtualKeyCode: code,
    ...(key === "Enter" ? { text: "\r" } : {}),
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code: key,
    windowsVirtualKeyCode: code,
  });
  await sleep(100);
};
const checks = [],
  interactionSamples = [];
const record = (message) => {
  checks.push(message);
  console.log("PASS", message);
};
let init;
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Emulation.setCPUThrottlingRate", { rate: 4 });
  init = await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
    window.__cspViolations=[];window.__interactionEvents=[];
    document.addEventListener('securitypolicyviolation', e=>window.__cspViolations.push({directive:e.effectiveDirective,blocked:e.blockedURI}));
    if(PerformanceObserver.supportedEntryTypes.includes('event'))new PerformanceObserver(list=>{
      for(const e of list.getEntries())if(e.interactionId)window.__interactionEvents.push({name:e.name,id:e.interactionId,duration:e.duration});
    }).observe({type:'event',buffered:true,durationThreshold:16});
  `,
  });
  const routes = process.env.QA_ARTICLE_PATH
    ? [process.env.QA_ARTICLE_PATH]
    : [
        "/",
        "/about",
        "/contact",
        "/resume",
        "/work",
        "/work/chemistry-calculator",
        "/work/community-driven-social-volunteering-platform",
        "/work/courseflow",
        "/blog",
        "/design-system",
        "/missing-qa-page",
      ];
  for (const route of routes) {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await navigate(route);
    const response = await fetch(origin + route);
    assert.equal(response.status, route === "/missing-qa-page" ? 404 : 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(
      response.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.deepEqual(
      await evaluate("window.__cspViolations"),
      [],
      `${route} CSP`,
    );
    const state = await evaluate(
      `({h1:document.querySelectorAll('h1').length,main:document.querySelectorAll('main').length,overflow:document.documentElement.scrollWidth>innerWidth+1,theme:document.documentElement.dataset.theme,islands:document.querySelectorAll('astro-island').length})`,
    );
    assert.equal(state.h1, 1);
    assert.equal(state.main, 1);
    assert.equal(state.overflow, false);
    assert.ok(["light", "dark"].includes(state.theme));
    if (route !== "/design-system") assert.equal(state.islands, 0);
    await evaluate("document.querySelector('[data-theme-toggle]').focus()");
    const before = await evaluate("document.documentElement.dataset.theme");
    await key("Enter");
    assert.notEqual(
      await evaluate("document.documentElement.dataset.theme"),
      before,
    );
    assert.equal(
      await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
      "solid",
    );
    await evaluate("document.querySelector('.mobile-nav summary').focus()");
    await key("Enter");
    assert.equal(
      await evaluate("document.querySelector('.mobile-nav').open"),
      true,
    );
    assert.match(
      await evaluate("document.activeElement.getAttribute('aria-label')"),
      /menu/,
    );
    await key("Escape");
    assert.equal(
      await evaluate("document.querySelector('.mobile-nav').open"),
      false,
    );
    for (let n = 0; n < 6; n++) {
      await evaluate("document.querySelector('[data-theme-toggle]').focus()");
      await key("Enter");
    }
    await sleep(150);
    const events = await evaluate("window.__interactionEvents");
    const grouped = new Map();
    for (const event of events)
      grouped.set(
        event.id,
        Math.max(grouped.get(event.id) || 0, event.duration),
      );
    interactionSamples.push({
      route,
      cpuSlowdown: 4,
      recordedInteractions: grouped.size,
      maxObservedDurationMs: grouped.size
        ? Math.max(...grouped.values())
        : null,
      events,
    });
    assert.deepEqual(
      await evaluate("window.__cspViolations"),
      [],
      `${route} interactions CSP`,
    );
  }
  record(
    "Production headers and CSP permit genuine theme/menu interactions across all tested routes; keyboard focus is visible and layouts fit mobile.",
  );
  if (process.env.QA_ARTICLE_PATH) {
    const schema = await evaluate(
      "JSON.parse(document.querySelector('[data-article-schema]').textContent)",
    );
    assert.equal(schema["@type"], "BlogPosting");
    assert.ok(schema.author.url.endsWith("/about"));
    assert.ok(
      await evaluate(
        "document.querySelectorAll('[data-code-block] code span[style]').length>0",
      ),
    );
    await send("Browser.grantPermissions", {
      origin,
      permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
    });
    const expected = await evaluate(
      "document.querySelector('[data-code-block] code').textContent",
    );
    await evaluate("document.querySelector('[data-copy-code]').focus()");
    await key("Enter");
    await sleep(300);
    assert.equal(await evaluate("navigator.clipboard.readText()"), expected);
    assert.deepEqual(await evaluate("window.__cspViolations"), []);
    record(
      "An isolated published MDX fixture renders BlogPosting, highlighted code and keyboard clipboard controls under the production CSP.",
    );
  } else {
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });
    await navigate("/");
    const reducedAssets = await evaluate(
      "performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/systems-scene|page-motion/.test(n))",
    );
    assert.deepEqual(reducedAssets, []);
    record("Reduced motion prevents GSAP and Three.js downloads.");
    await send("Emulation.setScriptExecutionDisabled", { value: true });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 320,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    for (const path of [
      "/",
      "/work",
      "/about",
      "/contact",
      "/resume",
      "/blog",
    ]) {
      await send("Page.navigate", { url: origin + path });
      await sleep(600);
      const state = await evaluate(
        "({overflow:document.documentElement.scrollWidth>innerWidth+1,heading:document.querySelector('h1').textContent,links:document.querySelectorAll('main a[href]').length})",
      );
      assert.equal(state.overflow, false);
      assert.ok(state.heading.trim());
      assert.ok(state.links > 0);
    }
    record(
      "Public content and native links remain readable at 320px with JavaScript disabled.",
    );
    await send("Emulation.setScriptExecutionDisabled", { value: false });
    await navigate("/contact");
  }
  assert.deepEqual(exceptions, []);
  const thirdParty = [
    ...new Set(
      requests.filter(
        (url) => /^https?:/.test(url) && new URL(url).origin !== origin,
      ),
    ),
  ];
  assert.deepEqual(thirdParty, []);
  record("No browser exceptions or third-party requests occurred.");
  await evaluate(
    "const probe=document.createElement('script');probe.textContent='window.__unauthorizedInlineRan=true';document.body.append(probe)",
  );
  await sleep(100);
  assert.equal(await evaluate("window.__unauthorizedInlineRan===true"), false);
  assert.ok(
    (await evaluate("window.__cspViolations")).some((event) =>
      event.directive.startsWith("script-src"),
    ),
  );
  record(
    "An unauthorized injected inline script is blocked by the enforced CSP.",
  );
  mkdirSync("docs/hardening", { recursive: true });
  writeFileSync(
    `docs/hardening/${process.env.QA_ARTICLE_PATH ? "article-browser" : "production-browser"}.json`,
    JSON.stringify(
      {
        checks,
        origin,
        interactionSamples,
        thirdParty,
        exceptions,
        note: "Local lab Event Timing samples, quantized to 8ms and limited to events >=16ms. These are not field INP or a percentile from real visitors.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await send("Emulation.setScriptExecutionDisabled", { value: false }).catch(
    () => {},
  );
  await send("Emulation.setCPUThrottlingRate", { rate: 1 }).catch(() => {});
  await send("Emulation.setEmulatedMedia", { features: [] }).catch(() => {});
  await send("Browser.resetPermissions").catch(() => {});
  if (init)
    await send("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: init.identifier,
    }).catch(() => {});
  await send("Page.navigate", { url: "about:blank" }).catch(() => {});
  socket.close();
}

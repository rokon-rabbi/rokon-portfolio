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
const contrastAudit = `(() => {
 const rgb = s => { const n=s.match(/[\\d.]+/g)?.map(Number); return n?.length>=3 ? [n[0],n[1],n[2],n[3]??1] : [0,0,0,0]; };
 const composite=(a,b)=>[...a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3])),1];
 const background=el=>{const chain=[];for(let node=el;node;node=node.parentElement)chain.push(rgb(getComputedStyle(node).backgroundColor));return chain.reverse().reduce((a,b)=>composite(b,a),[255,255,255,1]);};
 const lum=c=>{const x=c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return x[0]*.2126+x[1]*.7152+x[2]*.0722;};
 const failed=[];let count=0;let minimum=Infinity;
 for(const el of document.querySelectorAll('body *')){
  if(el.closest('svg,script,style,astro-dev-toolbar,[aria-hidden="true"]')||!el.getClientRects().length||getComputedStyle(el).visibility==='hidden')continue;
  const text=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('');if(!text)continue;
  const style=getComputedStyle(el),fg=rgb(style.color),bg=background(el),low=Math.min(lum(fg),lum(bg)),high=Math.max(lum(fg),lum(bg)),ratio=(high+.05)/(low+.05);
  count++;minimum=Math.min(minimum,ratio);if(ratio<4.5)failed.push({tag:el.tagName,cls:el.className,text:text.slice(0,60),ratio,fg:style.color,bg});
 }
 return {count,minimum,failed};
})()`;

const checks = [];
const record = (label) => {
  checks.push(label);
  console.log("PASS", label);
};
const captures = new URL("../docs/work-previews/", import.meta.url);
mkdirSync(captures, { recursive: true });
async function screenshot(name) {
  await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(
    new URL(name + ".png", captures),
    Buffer.from(result.data, "base64"),
  );
}
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
const routes = [
  "/work",
  "/work/community-driven-social-volunteering-platform",
  "/work/courseflow",
  "/work/chemistry-calculator",
];
for (const path of ["/", ...routes, "/blog", "/design-system/"])
  assert.equal((await fetch(QA_ORIGIN + path)).status, 200, path);
for (const path of [
  "/work/unknown-project",
  "/work/enterprise-mis-contributions",
  "/work/shaheen-education-family-lms",
])
  assert.equal((await fetch(QA_ORIGIN + path)).status, 404, path);
record(
  "all work routes return 200; unknown and employer case-study routes return 404",
);
await view(1440);
await navigate("/work");
await evaluate('localStorage.removeItem("theme")');
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
await navigate("/work");
assert.equal(await evaluate("document.documentElement.dataset.theme"), "dark");
const contrastResults = [];
for (const path of routes) {
  await view(1440);
  await navigate(path);
  assert.deepEqual(
    await evaluate(
      '[document.querySelectorAll("h1").length,document.querySelectorAll("main").length,document.querySelectorAll("header").length,document.querySelectorAll("footer").length]',
    ),
    [1, 1, 1, 1],
  );
  assert.equal(
    await evaluate(
      'document.querySelector(".desktop-nav a:nth-child(2)").getAttribute("aria-current")',
    ),
    "page",
  );
  assert.ok(
    await evaluate(
      '![...document.querySelectorAll("a[href]")].filter(a=>a.getAttribute("href").startsWith("#")).some(a=>!document.getElementById(decodeURIComponent(a.hash.slice(1))))',
    ),
  );
  const internal = await evaluate(
    '[...new Set([...document.querySelectorAll("a[href]")].filter(a=>a.origin===location.origin).map(a=>a.pathname))]',
  );
  for (const link of internal)
    assert.equal(
      (await fetch(QA_ORIGIN + link)).status,
      200,
      path + " link " + link,
    );
  for (const mode of ["dark", "light"]) {
    if ((await evaluate("document.documentElement.dataset.theme")) !== mode)
      await evaluate('document.querySelector("[data-theme-toggle]").click()');
    const contrast = await evaluate(contrastAudit);
    assert.deepEqual(contrast.failed, [], path + " " + mode + " contrast");
    contrastResults.push({
      path,
      mode,
      count: contrast.count,
      minimum: contrast.minimum,
    });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await view(width);
      assert.ok(
        await evaluate("document.documentElement.scrollWidth<=innerWidth"),
        path + " " + mode + " overflow " + width,
      );
    }
    if (path === "/work") {
      await screenshot("work-" + mode);
      if (mode === "dark") {
        await view(390);
        await screenshot("work-mobile-dark");
        await view(1440);
      }
    }
  }
  record(
    path +
      ": landmarks, current Work navigation, links, contrast, and five responsive widths in both themes",
  );
}
await view(1440);
await navigate("/work/community-driven-social-volunteering-platform");
await evaluate('document.querySelector("[data-theme-toggle]").click()');
await screenshot("volunteering-header-dark");
await evaluate(
  'document.querySelector(".case-contents li:nth-child(3) a").focus()',
);
await key("Enter");
assert.equal(await evaluate("location.hash"), "#architecture");
assert.ok(
  await evaluate(
    'document.getElementById("architecture").getBoundingClientRect().top>=document.querySelector(".site-header").getBoundingClientRect().bottom',
  ),
);
record("keyboard section navigation clears the sticky header");
await evaluate(
  'document.querySelector(".architecture-visual").scrollIntoView()',
);
await screenshot("volunteering-architecture-dark");
await evaluate('document.querySelector("[data-theme-toggle]").click()');
await screenshot("volunteering-architecture-light");
await view(390);
await evaluate(
  'document.querySelector(".architecture-visual").scrollIntoView()',
);
await screenshot("volunteering-architecture-mobile-light");
await view(1440);
await evaluate('document.querySelector(".case-code pre").focus()');
assert.equal(
  await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
  "solid",
);
await evaluate('document.querySelector(".case-references summary").focus()');
await key("Enter");
assert.equal(
  await evaluate('document.querySelector(".case-references details").open'),
  true,
);
record(
  "code can receive keyboard focus and source-reference disclosure opens with Enter",
);
await view(390);
await evaluate('document.querySelector("[data-mobile-nav] summary").focus()');
await key("Enter");
await screenshot("work-navigation-mobile-light");
await key("Tab");
await key("Tab");
assert.equal(await evaluate("document.activeElement.pathname"), "/work");
await key("Enter");
await sleep(700);
assert.equal(await evaluate("location.pathname"), "/work");
assert.equal(
  await evaluate('document.querySelector("[data-mobile-nav]").open'),
  false,
);
record(
  "mobile menu navigates from a case study to the portfolio with keyboard",
);
await view(1440);
await navigate("/work/chemistry-calculator");
await screenshot("chemistry-header-light");
await view(390);
await evaluate('document.querySelector(".case-code").scrollIntoView()');
await screenshot("chemistry-code-mobile-light");
await view(1440);
await navigate("/work/courseflow");
await evaluate('document.querySelector("[data-theme-toggle]").click()');
await screenshot("courseflow-brief-dark");
assert.ok(
  await evaluate(
    'document.querySelector("meta[name=robots]").content.includes("noindex")',
  ),
);
assert.equal(
  await evaluate(
    'document.querySelectorAll(".architecture-visual,.case-code").length',
  ),
  0,
);
record(
  "CourseFlow stays an explicit noindex brief without invented diagrams or code",
);
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
assert.equal(
  await evaluate(
    'getComputedStyle(document.querySelector(".button")).transitionDuration',
  ),
  "0s",
);
record("reduced-motion preference remains respected");
await send("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-color-scheme", value: "dark" }],
});
await send("Emulation.setScriptExecutionDisabled", { value: true });
await view(390);
await navigate("/work/chemistry-calculator");
assert.equal(
  await evaluate('document.querySelectorAll(".case-section").length'),
  8,
);
assert.equal(
  await evaluate(
    'getComputedStyle(document.querySelector("[data-theme-toggle]")).display',
  ),
  "none",
);
assert.equal(
  await evaluate("getComputedStyle(document.body).backgroundColor"),
  "rgb(11, 16, 32)",
);
await evaluate('document.querySelector("[data-mobile-nav] summary").focus()');
await key("Enter");
assert.equal(
  await evaluate('document.querySelector("[data-mobile-nav]").open'),
  true,
);
record(
  "case-study content and native mobile navigation work without JavaScript",
);
await send("Emulation.setScriptExecutionDisabled", { value: false });
assert.deepEqual(errors, []);
record("no browser exceptions");
writeFileSync(
  new URL("qa-results.json", captures),
  JSON.stringify({ checks, contrastResults, exceptions: errors }, null, 2) +
    "\n",
);
socket.close();
console.log("COMPLETE", checks.length, "browser checks");

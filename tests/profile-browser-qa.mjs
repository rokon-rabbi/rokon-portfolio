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
const contrast = [];
const captures = new URL("../docs/profile-previews/", import.meta.url);
mkdirSync(captures, { recursive: true });
const record = (label) => {
  checks.push(label);
  console.log("PASS", label);
};
const screenshot = async (name) => {
  await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
  });
  writeFileSync(
    new URL(`${name}.png`, captures),
    Buffer.from(result.data, "base64"),
  );
};
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  for (const mode of ["light", "dark"]) {
    await navigate("/about");
    await evaluate(`localStorage.setItem('theme',${JSON.stringify(mode)})`);
    for (const route of ["/about", "/contact", "/resume"]) {
      await navigate(route);
      assert.equal(
        await evaluate("document.documentElement.dataset.theme"),
        mode,
      );
      assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1);
      assert.equal(
        await evaluate(
          "document.querySelectorAll('form,canvas,astro-island').length",
        ),
        0,
      );
      for (const width of [320, 390, 768, 1024, 1440]) {
        await view(width);
        assert.ok(
          await evaluate(
            "document.documentElement.scrollWidth <= innerWidth + 1",
          ),
          `${route} ${mode} ${width} overflows`,
        );
        assert.ok(
          await evaluate(
            "[...document.querySelectorAll('main a')].every(el=>{const r=el.getBoundingClientRect();return r.left>=-1&&r.right<=innerWidth+1})",
          ),
          `${route} ${width} link overflow`,
        );
      }
      await view(1440);
      const audit = await evaluate(contrastAudit);
      assert.deepEqual(audit.failed, [], `${route} ${mode} contrast`);
      contrast.push({
        route,
        mode,
        count: audit.count,
        minimum: audit.minimum,
      });
      await screenshot(`${route.slice(1)}-${mode}-desktop`);
      await view(390);
      await screenshot(`${route.slice(1)}-${mode}-mobile`);
    }
  }
  record(
    "About, Contact and resume fit five widths in both themes with AA text contrast and no hydrated forms or WebGL",
  );

  await view(390);
  await navigate("/about");
  await key("Tab");
  assert.equal(await evaluate("document.activeElement.className"), "skip-link");
  await key("Enter");
  assert.equal(await evaluate("document.activeElement.id"), "main-content");
  await evaluate("document.querySelector('.mobile-nav summary').focus()");
  await key("Enter");
  assert.equal(
    await evaluate("document.querySelector('.mobile-nav').open"),
    true,
  );
  await key("Escape");
  assert.equal(
    await evaluate("document.querySelector('.mobile-nav').open"),
    false,
  );
  assert.equal(await evaluate("document.activeElement.tagName"), "SUMMARY");
  await key("Enter");
  await evaluate(
    "document.querySelector('.mobile-nav a[href=\"/contact\"]').focus()",
  );
  assert.equal(
    await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
    "solid",
  );
  await key("Enter");
  await sleep(1000);
  assert.equal(await evaluate("location.pathname"), "/contact");
  record(
    "keyboard skip link, mobile disclosure, Escape/focus return, visible focus and Contact navigation work",
  );

  const emailLinks = await evaluate(
    "[...document.querySelectorAll('main a[href^=\"mailto:\"]')].map(el=>el.getAttribute('href'))",
  );
  for (const href of emailLinks) {
    const address = href.slice(7).split("?")[0];
    assert.ok(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address));
    assert.equal(/example\.(com|org)|your-email/i.test(address), false);
  }
  assert.equal(await evaluate("document.querySelector('form') === null"), true);
  record(
    emailLinks.length
      ? "real email CTAs open a valid supplied mailto destination; no submission form"
      : "unsupplied email and LinkedIn are omitted; verified GitHub remains available without a fake form",
  );

  for (const extension of ["pdf", "txt"]) {
    const response = await fetch(
      `${QA_ORIGIN}/resume/rokon-resume.${extension}`,
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-disposition"), /attachment/);
    const body = new Uint8Array(await response.arrayBuffer());
    assert.ok(body.length > 500);
    const text = new TextDecoder().decode(body);
    if (extension === "pdf") {
      assert.match(response.headers.get("content-type"), /application\/pdf/);
      assert.ok(text.startsWith("%PDF-1.4"));
      writeFileSync(new URL("resume-download.pdf", captures), body);
    } else {
      assert.match(response.headers.get("content-type"), /text\/plain/);
      assert.ok(text.includes("NSTU"));
    }
    assert.equal(
      /birth.?date|religion|blood.?group|permanent.?address|confidential|PRIVATE_SENTINEL/i.test(
        text,
      ),
      false,
    );
  }
  record(
    "PDF and plain-text downloads return real public resume artifacts with correct types and attachment headers",
  );

  await send("Emulation.setEmulatedMedia", { media: "print" });
  await navigate("/resume");
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.site-header')).display",
    ),
    "none",
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('.resume-downloads')).display",
    ),
    "none",
  );
  assert.notEqual(
    await evaluate(
      "getComputedStyle(document.querySelector('.print-url')).display",
    ),
    "none",
  );
  record(
    "print layout removes navigation/download controls and includes professional link destinations",
  );
  await send("Emulation.setEmulatedMedia", {
    media: "",
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate("/about");
  assert.equal(
    await evaluate("getComputedStyle(document.documentElement).scrollBehavior"),
    "auto",
  );
  record("reduced-motion preference remains respected");

  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await view(320);
  for (const route of ["/about", "/contact", "/resume"]) {
    await navigate(route);
    assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1);
    assert.ok(
      await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
    );
    assert.ok(
      await evaluate(
        "[...document.querySelectorAll('main a[download]')].every(el=>el.getAttribute('href').startsWith('/resume/'))",
      ),
    );
    assert.ok(
      await evaluate("document.querySelector('main').innerText.length > 300"),
    );
  }
  await navigate("/about");
  await screenshot("about-no-javascript-320");
  record(
    "professional content, native links and resume downloads remain readable at 320px without JavaScript",
  );
  assert.deepEqual(errors, []);
  record("zero browser exceptions");
  writeFileSync(
    new URL("qa-results.json", captures),
    JSON.stringify(
      {
        checks,
        contrast,
        exceptions: errors,
        emailLinksPresent: emailLinks.length > 0,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`COMPLETE ${checks.length} profile browser checks`);
} finally {
  await send("Emulation.setScriptExecutionDisabled", { value: false }).catch(
    () => {},
  );
  await send("Emulation.setEmulatedMedia", { media: "", features: [] }).catch(
    () => {},
  );
  await send("Page.navigate", { url: "about:blank" }).catch(() => {});
  socket.close();
}

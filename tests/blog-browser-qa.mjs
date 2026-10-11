import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { spawn } from "node:child_process";
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
  await send("Page.navigate", { url: "http://127.0.0.1:4321" + path });
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
const origin = "http://127.0.0.1:4321";
const captures = new URL("../docs/blog-previews/", import.meta.url);
mkdirSync(captures, { recursive: true });
const fixtures = [];
let server;
let serverOutput = "";
const addFixture = (slug, frontmatter) => {
  const file = new URL(`../src/content/blog/${slug}.mdx`, import.meta.url);
  const body = `
This is temporary publication QA content, not a personal engineering claim.

## Define the contract

Readable technical prose with a [reference](https://docs.astro.build/en/guides/content-collections/).

### A smaller boundary

A useful explanation with an inline \`identifier\`.

\`\`\`typescript title="example.ts"
const message = 'A code sample copied from this block only';
const deliberatelyLongLine = 'This line is intentionally long enough to require horizontal scrolling on a compact mobile screen without overflowing the document.';
console.log(message);
\`\`\`

## Define the contract

Duplicate headings should receive distinct anchors.

| Boundary | Failure behavior | Recovery contract |
| --- | --- | --- |
| Request acceptance | Retain a useful diagnostic | Repeat only when safe |
| Worker execution | Preserve job identity | Verify completion |

![Conceptual feature boundaries.](/images/blog/interfaces.svg)

\`\`\`java title="Second.java"
System.out.println("The second block has different content.");
\`\`\`
`;
  writeFileSync(file, `---\n${frontmatter}\n---\n${body}`);
  fixtures.push(file);
};
const common = `author: "Publication QA"\ntags: ["testing", "caching"]\ntopic: "backend"\ncoverImage: "/images/blog/systems.svg"\ncoverAlt: "A conceptual cache and queued-work diagram."`;
async function screenshot(name) {
  await evaluate('document.querySelector("astro-dev-toolbar")?.remove()');
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(
    new URL(`${name}.png`, captures),
    Buffer.from(result.data, "base64"),
  );
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(150);
  }
  throw new Error(`Timed out: ${expression}`);
}
const visibleIds = () =>
  evaluate(
    "[...document.querySelectorAll('[data-blog-entry]:not([hidden])')].map(el=>el.dataset.blogEntry)",
  );
const contrast = [];
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  // The user drafts remain untouched. These local fixtures are removed in finally.
  addFixture(
    "qa-publication-alpha",
    `${common}\ntitle: "Cache boundaries and reliable reads"\ndescription: "Freshness, explicit ownership, and a careful cache contract."\ndate: "2020-01-03"\nupdatedDate: "2020-01-04"\nfeatured: true\ndraft: false`,
  );
  addFixture(
    "qa-publication-beta",
    `${common}\ntitle: "Observing asynchronous work"\ndescription: "Queue depth, errors, and completion."\ndate: "2020-01-02"\ndraft: false`,
  );
  addFixture(
    "qa-publication-gamma",
    `author: "Publication QA"\ntags: ["testing", "angular"]\ntopic: "frontend"\ntitle: "Maintainable interface boundaries"\ndescription: "Feature ownership and readable applications."\ndate: "2020-01-01"\ndraft: false`,
  );
  addFixture(
    "qa-publication-draft",
    `author: "Publication QA"\ntags: ["private-draft-tag"]\ntopic: "testing"\ntitle: "Unapproved QA draft"\ndescription: "Must not be discoverable."\ndate: "2020-01-01"\ndraft: true`,
  );
  addFixture(
    "qa-publication-future",
    `author: "Publication QA"\ntags: ["future-only-tag"]\ntopic: "testing"\ntitle: "Future QA note"\ndescription: "Must not be discoverable before its date."\ndate: "2999-01-01"\ndraft: false`,
  );
  server = spawn(
    "pnpm",
    ["dev", "--ignore-lock", "--host", "127.0.0.1", "--port", "4321"],
    {
      cwd: new URL("../", import.meta.url),
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk.toString();
  });
  let index;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(serverOutput);
    const response = await fetch(`${origin}/blog/search-index.json`).catch(
      () => null,
    );
    if (response?.ok) {
      index = await response.json();
      if (index.length === 3) break;
    }
    await sleep(300);
  }
  assert.deepEqual(
    index.map((post) => post.id),
    ["qa-publication-alpha", "qa-publication-beta", "qa-publication-gamma"],
  );
  const rss = await fetch(`${origin}/rss.xml`);
  assert.match(rss.headers.get("content-type"), /application\/rss\+xml/);
  const xml = await rss.text();
  assert.equal((xml.match(/<item>/g) ?? []).length, 3);
  for (const forbidden of [
    "Unapproved QA draft",
    "Future QA note",
    "reliable-jenkins-pipeline",
    "private-draft-tag",
    "future-only-tag",
  ]) {
    assert.equal(
      (xml + JSON.stringify(index)).includes(forbidden),
      false,
      forbidden,
    );
  }
  for (const route of [
    "/blog/reliable-jenkins-pipeline",
    "/blog/qa-publication-draft",
    "/blog/qa-publication-future",
    "/blog/tags/private-draft-tag",
    "/blog/tags/unknown-topic",
  ]) {
    assert.equal((await fetch(origin + route)).status, 404, route);
  }
  record(
    "only eligible published fixtures reach article paths, tag paths, build-time metadata and RSS",
  );

  await view(1440);
  await navigate("/blog");
  await evaluate("localStorage.setItem('theme','dark')");
  for (const mode of ["dark", "light"]) {
    await evaluate(`localStorage.setItem('theme',${JSON.stringify(mode)})`);
    await navigate("/blog");
    await waitFor("!document.querySelector('[data-blog-search]').hidden");
    assert.equal(
      await evaluate("document.documentElement.dataset.theme"),
      mode,
    );
    assert.equal((await visibleIds()).length, 3);
    assert.equal(
      await evaluate(
        "document.querySelectorAll('.publication-feature').length",
      ),
      1,
    );
    for (const width of [320, 390, 768, 1024, 1440]) {
      await view(width);
      assert.ok(
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1",
        ),
        `${mode} archive ${width}`,
      );
    }
    await view(1440);
    const audit = await evaluate(contrastAudit);
    assert.deepEqual(audit.failed, [], `${mode} archive contrast`);
    contrast.push({
      surface: "archive",
      mode,
      count: audit.count,
      minimum: audit.minimum,
    });
    await screenshot(`archive-${mode}-fixtures`);
  }
  record(
    "featured presentation and editorial cards fit five widths in both themes with AA text contrast",
  );

  await evaluate(
    "document.querySelector('#article-search').value='spring cache'; document.querySelector('#article-search').dispatchEvent(new Event('input',{bubbles:true}))",
  );
  await sleep(220);
  // Search uses labels, title, description, author and topic; no unindexed article bodies.
  assert.equal((await visibleIds()).length, 0);
  await evaluate(
    "document.querySelector('#article-search').value='reliable'; document.querySelector('#article-search').dispatchEvent(new Event('input',{bubbles:true}))",
  );
  await sleep(220);
  assert.deepEqual(await visibleIds(), ["qa-publication-alpha"]);
  assert.ok(await evaluate("location.search.includes('q=reliable')"));
  await evaluate(
    "document.querySelector('#article-topic').value='frontend'; document.querySelector('#article-topic').dispatchEvent(new Event('change',{bubbles:true}))",
  );
  assert.deepEqual(await visibleIds(), []);
  assert.equal(
    await evaluate("document.querySelector('[data-search-empty]').hidden"),
    false,
  );
  await evaluate("document.querySelector('[data-search-reset]').click()");
  assert.equal((await visibleIds()).length, 3);
  assert.equal(await evaluate("document.activeElement.id"), "article-search");
  assert.equal(await evaluate("location.search"), "");
  record(
    "search, topic intersection, zero-results feedback, URL state and reset work without HTML injection",
  );

  await navigate("/blog?q=queue&topic=backend");
  await waitFor("!document.querySelector('[data-blog-search]').hidden");
  assert.deepEqual(await visibleIds(), ["qa-publication-beta"]);
  await navigate("/blog/tags/caching");
  await waitFor("!document.querySelector('[data-blog-search]').hidden");
  assert.deepEqual(await visibleIds(), [
    "qa-publication-alpha",
    "qa-publication-beta",
  ]);
  assert.equal(
    await evaluate(
      "document.querySelector('.archive-tags [aria-current=page]').getAttribute('href')",
    ),
    "/blog/tags/caching",
  );
  record(
    "bookmarkable metadata filters and native tag archives contain the right articles",
  );

  await view(1440);
  await navigate("/blog/qa-publication-beta");
  assert.equal(
    await evaluate(
      "document.querySelector('meta[property=\"og:type\"]').content",
    ),
    "article",
  );
  assert.ok(
    await evaluate(
      "document.querySelector('meta[property=\"article:published_time\"]').content.startsWith('2020-01-02')",
    ),
  );
  const ld = await evaluate(
    "JSON.parse(document.querySelector('script[data-article-schema]').textContent)",
  );
  assert.equal(ld.author.name, "Publication QA");
  assert.equal(ld["@type"], "BlogPosting");
  assert.ok(ld.url.endsWith("/blog/qa-publication-beta"));
  assert.ok(
    await evaluate(
      "document.querySelector('meta[property=\"og:image:alt\"]').content.length > 10",
    ),
  );
  const pagination = await evaluate(
    "[...document.querySelectorAll('.article-pagination a')].map(el=>el.getAttribute('href'))",
  );
  assert.deepEqual(pagination, [
    "/blog/qa-publication-gamma",
    "/blog/qa-publication-alpha",
  ]);
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.article-related [data-blog-entry]').length",
    ),
    2,
  );
  record(
    "article SEO, Open Graph, dates, chronological navigation and related notes render from verified metadata",
  );

  const anchors = await evaluate(`(() => {
    const links=[...document.querySelectorAll('.article-toc a[href^="#"],.heading-anchor')];
    return {count:links.length, missing:links.filter(a=>!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash), headings:[...document.querySelectorAll('.article-prose h2')].map(h=>h.id)};
  })()`);
  assert.ok(anchors.count >= 7);
  assert.deepEqual(anchors.missing, []);
  assert.equal(new Set(anchors.headings).size, anchors.headings.length);
  await evaluate("document.querySelector('.article-toc a').click()");
  await sleep(450);
  assert.ok(
    await evaluate(
      "document.querySelector(location.hash).getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom - 1",
    ),
  );
  record(
    "TOC and heading links use real unique anchors and clear the sticky navigation",
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
  await waitFor(
    "document.querySelector('[data-copy-code]').textContent === 'Copied'",
  );
  assert.equal(await evaluate("navigator.clipboard.readText()"), expected);
  assert.ok(
    await evaluate(
      "document.querySelector('[data-copy-status]').textContent.includes('copied')",
    ),
  );
  assert.equal(
    await evaluate("getComputedStyle(document.activeElement).outlineStyle"),
    "solid",
  );
  await evaluate(
    "Object.defineProperty(navigator.clipboard,'writeText',{value:()=>Promise.reject(new Error('denied')),configurable:true});document.querySelectorAll('[data-copy-code]')[1].click()",
  );
  await waitFor(
    "document.querySelectorAll('[data-copy-status]')[1].textContent.includes('manually')",
  );
  await evaluate("delete navigator.clipboard.writeText");
  record(
    "keyboard copy writes the correct block to the real clipboard and permission failure announces a manual option",
  );

  for (const mode of ["dark", "light"]) {
    await evaluate(`localStorage.setItem('theme',${JSON.stringify(mode)})`);
    await navigate("/blog/qa-publication-alpha");
    const audit = await evaluate(contrastAudit);
    assert.deepEqual(audit.failed, [], `${mode} article/code contrast`);
    contrast.push({
      surface: "article",
      mode,
      count: audit.count,
      minimum: audit.minimum,
    });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await view(width);
      assert.ok(
        await evaluate(
          "document.documentElement.scrollWidth <= innerWidth + 1",
        ),
        `${mode} article ${width}`,
      );
      assert.ok(
        await evaluate(
          "[...document.querySelectorAll('.article-prose img')].every(img=>img.getBoundingClientRect().width<=document.querySelector('.article-prose').getBoundingClientRect().width+1)",
        ),
      );
    }
    await view(1440);
    await screenshot(`article-${mode}-fixture`);
  }
  await view(390);
  await evaluate(
    "document.querySelector('.code-scroll').scrollIntoView({block:'center'}); document.querySelector('.code-scroll').focus()",
  );
  assert.ok(
    await evaluate(
      "document.querySelector('.code-scroll').scrollWidth > document.querySelector('.code-scroll').clientWidth",
    ),
  );
  await key("ArrowRight");
  await sleep(150);
  assert.ok(
    await evaluate("document.querySelector('.code-scroll').scrollLeft > 0"),
  );
  assert.ok(
    await evaluate(
      "document.querySelector('.article-table').scrollWidth > document.querySelector('.article-table').clientWidth",
    ),
  );
  await screenshot("article-mobile-code-fixture");
  record(
    "long code, tables and images stay inside the reading column; overflow remains keyboard accessible at mobile widths",
  );

  await navigate("/preview/blog/reliable-jenkins-pipeline");
  assert.equal(
    await evaluate("document.querySelector('meta[name=robots]').content"),
    "noindex, follow",
  );
  assert.ok(
    await evaluate(
      "document.querySelector('.article-preview-notice').textContent.includes('Unpublished')",
    ),
  );
  assert.equal(
    await evaluate(
      "document.querySelector('script[type=\"application/ld+json\"]') === null",
    ),
    true,
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('.article-prose h2').length >= 5",
    ),
    true,
  );
  await screenshot("jenkins-draft-mobile");
  await view(1440);
  await evaluate("window.scrollTo(0,0)");
  await screenshot("jenkins-draft-desktop");
  for (const slug of [
    "spring-boot-caching-and-async",
    "maintainable-angular-enterprise-applications",
  ]) {
    assert.equal((await fetch(`${origin}/preview/blog/${slug}`)).status, 200);
  }
  record(
    "all three unapproved drafts render only in local noindex previews and contain no publication schema",
  );

  await send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });
  await navigate("/blog/qa-publication-alpha");
  assert.equal(
    await evaluate("getComputedStyle(document.documentElement).scrollBehavior"),
    "auto",
  );
  assert.equal(await evaluate('document.querySelectorAll("canvas").length'), 0);
  record("reading respects reduced motion and has no WebGL dependency");

  await send("Emulation.setScriptExecutionDisabled", { value: true });
  await view(320);
  await navigate("/blog");
  assert.equal((await visibleIds()).length, 3);
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('[data-blog-search]')).display",
    ),
    "none",
  );
  await navigate("/blog/tags/caching");
  assert.equal((await visibleIds()).length, 2);
  await navigate("/blog/qa-publication-alpha");
  assert.ok(
    await evaluate("document.querySelectorAll('.heading-anchor').length >= 3"),
  );
  assert.ok(
    await evaluate(
      "document.querySelectorAll('.article-prose code').length >= 2",
    ),
  );
  assert.equal(
    await evaluate(
      "getComputedStyle(document.querySelector('[data-copy-code]')).display",
    ),
    "none",
  );
  assert.ok(
    await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
  );
  await screenshot("no-javascript-mobile-fixture");
  record(
    "archive, tag browsing, article content and anchors remain readable at 320px without JavaScript",
  );
  assert.deepEqual(errors, []);
  record("no browser exceptions");
  writeFileSync(
    new URL("qa-results.json", captures),
    JSON.stringify(
      {
        checks,
        contrast,
        exceptions: errors,
        fixtureNotice:
          "Published content in these captures is temporary test material. User drafts remain unpublished.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`COMPLETE ${checks.length} publication browser checks`);
} finally {
  await send("Page.navigate", { url: "about:blank" }).catch(() => {});
  if (server && server.exitCode === null) {
    process.kill(-server.pid, "SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("close", resolve)),
      sleep(3000),
    ]);
  }
  for (const file of fixtures) unlinkSync(file);
  await send("Emulation.setScriptExecutionDisabled", { value: false }).catch(
    () => {},
  );
  await send("Browser.resetPermissions").catch(() => {});
  socket.close();
}

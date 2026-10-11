# 11 — Systems in Motion hero

Implemented 2026-10-10 after inspecting the existing Astro/React component graph and GSAP ownership. Direct Three.js 0.186.1 provides a single decorative scene without React hydration, React Three Fiber, controls, textures, or postprocessing. The existing Tailwind 4/shadcn semantic palette and typography remain authoritative.

## Composition and ownership

Five matte geometric services connect through fine routed lines above a restrained engineering grid. Small warm signals travel along those routes. An orthographic camera, shared slab geometry, subtle automatic rotation, and a bounded mouse response keep the illustration quiet beside the editorial heading. This is conceptual artwork; it does not represent employer infrastructure.

`src/components/design/SystemsHero.tsx` renders the complete static SVG and reserves the artwork's aspect ratio on the server. Only the homepage imports `src/scripts/systems-hero.ts`, which gives each shell one controller. `src/lib/systems-hero.ts` checks eligibility and visibility before importing `src/lib/systems-scene.ts`. The scene reads colors from the existing CSS variables and updates materials on theme changes, including while manually paused. `src/design/hero-scene.ts` centralizes policy and budgets; `src/styles/hero-scene.css` owns positioning and controls.

Hero text, identity, links, and navigation have no WebGL dependency. Only the decorative viewport is `aria-hidden`. Canvas and fallback use absolute positioning in the same reserved space and ignore pointer hit testing; the viewport receives passive mouse events without blocking native touch scrolling. A native, keyboard-accessible Pause/Resume button has a reserved header area and a visible focus outline. There is no camera control or interactive information that a touch or keyboard user would miss. GSAP does not target the scene or its fallback.

To disable the enhancement, use `<SystemsHero enabled={false} />`; this restores the original static `SystemAssembly`. Replacing the component with `SystemAssembly` also removes it independently of content. Setting the mounted shell's `data-hero-enabled` to `false` immediately releases GPU resources. Remove the homepage script import when removing the component entirely. No other route or decoration loads Three.js.

## Performance and fallback strategy

| Budget | Full | Compact |
| --- | --- | --- |
| Render ceiling | 30 fps | 20 fps |
| DPR ceiling | 1.5 | 1 |
| Nodes / moving signals | 5 / 3 | 3 / 1 |
| Slab layers per node | 3 | 2 |
| Measured draw calls / triangles | 28 / 240 | 15 / 108 |
| Shared GPU geometries / textures | 5 / 0 | 5 / 0 |

Both tiers also cap the backing buffer at approximately 650,000 pixels. Antialiasing keeps the fine geometry readable at compact DPR without an extra render pass. The renderer requests low power, disables stencil, and uses no shadows, large textures, bloom, or render targets.

Below 64rem, without a fine hovering pointer, or with four reported cores/4GB memory or fewer, policy chooses compact mode. Two cores/2GB or fewer, Save-Data, slow-2g/2g, reduced motion, or an explicit disable retain SVG and skip the optional Three.js download. Missing optional hardware/network signals do not block otherwise capable browsers.

A WebGL2 probe requests `failIfMajorPerformanceCaveat` before the heavy import and releases its temporary context, matching the current [WebGLRenderer API](https://threejs.org/docs/pages/WebGLRenderer.html). This flag follows the browser's capability judgment; it is not a guarantee that every software renderer is rejected. Unsupported WebGL, failed initialization/import/rendering, and context loss fall back to the unchanged SVG. Runtime failures remain static for that controller's lifetime rather than repeatedly retrying an unhealthy context.

Loading starts only when the illustration intersects the viewport, after an idle callback (1.5-second timeout, 200ms timer fallback). Rendering pauses offscreen, in hidden tabs, and on manual pause. Resume does not advance by the time spent hidden. Page departure releases the context; cached restoration creates one new scene. Reduced-motion changes immediately dispose the canvas, and CSS independently forces the static illustration.

After 30 warmup frames, each 30-frame sample checks synchronous rendering cost and actual frame intervals. An average cost above 10ms/full or 18ms/compact, or more than 60% of intervals above 75ms/full or 110ms/compact, degrades full to compact and then compact to static. This is a sustained-pressure heuristic, not a GPU benchmark. Geometry/material buffers are shared; moving signals update one existing position buffer.

Disposal cancels RAF and pending idle/timer work, rejects stale imports, removes context/pointer/media/visibility/lifecycle listeners, disconnects observers, disposes all 13 shared geometry/material resources, clears the scene, disposes the renderer, loses its context, and removes the canvas. Astro swaps, HMR, normal navigation, and browser history are covered. No OrbitControls or unmanaged timelines are created.

The production homepage controller is approximately 7.2KB minified / 2.8KB gzip. The optional Three.js scene chunk is approximately 529KB minified / 133KB gzip. Vite's large-chunk warning is left visible; deferring that dependency avoids making it a prerequisite for reading the hero. Reduced-motion/data-saving/unsupported devices do not request it.

## Verification

`pnpm check:hero` covers 11 policy, SSR, lifecycle, stale-import, capability, failure, theme, resize, and disposal tests. `tests/hero-browser-qa.mjs` uses native Chrome DevTools Protocol with no new browser-testing dependency. Start the local server and a dedicated browser:

```sh
pnpm dev --host 127.0.0.1
google-chrome --headless --no-sandbox --disable-dev-shm-usage \
  --use-angle=swiftshader --enable-unsafe-swiftshader \
  --no-first-run --no-default-browser-check --remote-debugging-port=9333 \
  --user-data-dir=/tmp/rokon-hero-browser about:blank
pnpm check:hero:browser
pnpm check:motion:browser
pnpm check:work:browser
```

The 17 hero checks exercise actual rendered geometry, both themes, keyboard pause, bounded mouse response, offscreen/hidden-tab suspension, initial/live reduced motion, mobile DPR and touch scrolling, device/data-saving gates, WebGL failure, context loss, runtime disabling, real navigation/back restoration, 320px/no-JavaScript content, and browser exceptions. The test records native capability behavior separately, then explicitly relaxes the major-performance-caveat gate in its SwiftShader fixture to exercise positive WebGL paths. A fine-pointer fixture covers desktop input because Linux headless Chrome reports no fine hover pointer.

Results and five captures are in [hero-previews](hero-previews/qa-results.json). These browser tests establish functional behavior in desktop/mobile emulation, not physical GPU frame pacing. A real mid-range phone remains the final manual performance check. The runtime budget and static fallback remain active in production.

The existing content/design/work/motion suites, TypeScript, Astro checks, build, and generated route checks also remain required. Existing pnpm build-permission warnings and the empty blog collection are unrelated outstanding foundation items; no articles or build-script permissions were invented to suppress them.

| Final verification | Result |
| --- | --- |
| Content / design / work / motion / hero tests | 16 / 10 / 14 / 5 / 11 passed |
| Generated portfolio routes and internal links | 10 tests passed |
| Hero / motion / portfolio browser checks | 17 / 15 / 12 passed; zero browser exceptions |
| Astro diagnostics / TypeScript | Passed; 108 files, zero errors, warnings, or hints |
| Production build | Passed; expected empty-blog and optional Three.js chunk warnings remain |
| Built homepage | Static hero shell present, no SSR canvas, no eager scene script/preload |
| Local QA processes | Stopped after verification |

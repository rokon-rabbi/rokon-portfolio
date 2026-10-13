# 10 — Motion system

Implemented 2026-10-10. The active component graph was inspected before installing GSAP 3.15.0. The existing `motion` dependency is used only by unreferenced legacy Magic UI components; it does not animate the active homepage, navigation, or case studies. Existing Tailwind 4, shadcn conventions, semantic colors, and reduced-motion CSS remain the foundation.

## Ownership and integration

The subsequent [Three.js hero](11-three-hero.md) now owns the homepage illustration. Its static fallback deliberately omits `data-motion-parallax`, so GSAP and Three.js never animate the same visual. The SVG parallax preset below remains available to the original disabled/static component; the current homepage browser runner checks ownership separation instead of SVG displacement.

`src/design/motion.ts` owns distances, durations, stagger, easing, and the device gate. `src/lib/page-motion.ts` owns GSAP/ScrollTrigger setup and returns a disposer. `src/scripts/motion.ts` is the single page controller, loaded by `Layout.astro`; it imports GSAP lazily only on annotated pages with motion enabled. `src/styles/motion.css` owns native scrolling and interaction feedback.

GSAP uses [context](https://gsap.com/docs/v3/GSAP/gsap.context%28%29/) and [matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia%28%29/) to collect and revert animations and triggers. Deferred callbacks are registered to their owning context, including keyboard-focus handlers. No components create independent timelines or import animation libraries.

| Annotation | Convention |
| --- | --- |
| `data-motion="hero"` | A semantic hero line; shares the short introductory stagger. Never split accessible text into individual character nodes. |
| `data-motion="intro"` | Identity, introduction, capabilities, action group, or editorial page header. Plays once on a fresh top-of-page visit. |
| `data-motion="reveal"` | Section heading, project preview/copy, capability row, technology group, article, or approved media figure. Its transform starts only when it enters the viewport at `top 92%`. |
| `data-motion-track` | An absolutely positioned, `aria-hidden` decorative timeline stroke. Scroll affects `scaleY`, never text or layout. |
| `data-motion-parallax` | The existing `aria-hidden` hero SVG. A bounded desktop decoration, independent of the future 3D experience. |

Keep entrance annotations on separate elements. Do not animate both a content container and its descendants with entrances. Do not put Motion, CSS entrance keyframes, or another GSAP owner on an annotated element. The annotation transfers transform ownership to GSAP until completion/revert; avoid pre-existing authored transforms on that target. CSS hover arrows are separate descendants of GSAP entrance groups.

## Presets and behavior

| Preset | Entrance distance | Hero distance | Duration | Stagger |
| --- | --- | --- | --- | --- |
| Wide, unconstrained screen | 16px | 12px | 620ms | 70ms |
| Small screen or constrained device | 6px | 6px | 400ms | 40ms |

Entrances use `power2.out`, finish once, and clear their inline transforms. Text stays fully opaque throughout, preserving the approved contrast ratios. No baseline CSS hides content, no opacity-zero setup is used, and no image dimensions, heights, margins, or padding are animated. The controller waits for fonts and two animation frames before measuring; media retain intrinsic dimensions.

The experience timeline uses two short strokes that follow scroll directly on wide, unconstrained screens. The hero SVG moves at most 14px and requires a wide viewport, a fine hovering pointer, more than four reported CPU threads, more than 4GB reported memory when available, and no data-saving preference. Missing optional capacity signals do not block otherwise suitable devices. Small screens and four-core/low-memory/data-saving devices omit continuous effects. There are no loops, pinning, scroll normalization, scroll listeners that prevent default, custom scroll containers, or blanket `will-change` layers.

Buttons and text-link arrows move 2px on keyboard focus and fine-pointer hover. Desktop navigation uses a short underline transition; the native mobile disclosure enters by 4px over 180ms. Native CSS smooth scrolling handles fragment links. Full route changes remain normal browser navigation with a short incoming editorial-header entrance; no outgoing animation delays links. Keyboard, touch, focus outlines, menu Escape behavior, and history restoration remain native.

## Homepage, 2026-10-13

The one-column homepage carries no `data-motion` annotations and does not load GSAP. Its motion is CSS, in `src/styles/home.css`, with a few lines of `src/scripts/page.ts`:

- **Opening.** The intro's lines and the sections share one `arrive` keyframe (a 10px rise from transparent, 640ms, 65ms apart, `backwards` fill so nothing lingers as a stacking context). This is the only place text starts transparent, and it is a CSS animation that the browser itself finishes: no script can leave it hidden.
- **Further down.** A section that was below the window when the page opened gets `data-reveal="in"` from an IntersectionObserver as it arrives, and its heading and body play `settle`, a 16px rise with no change of opacity. Nothing is held back beforehand, so a whole-page capture, a print or a visit without scripts shows every section. An earlier version hid those sections until they were reached; a full-page screenshot came out blank below the first screen, which is why the rule above (no baseline CSS hides content) applies here too.
- **Reading.** The header's veil, the accent filling its hairline, the section list's marker, a stack row lit for a moment when the intro links to it (`:target`), and the tool names that light together under a role are all transitions or short keyframes. The one loop is the ring round the "currently" dot.

All of it stops under `prefers-reduced-motion: reduce` through the base rule in `global.css`; the observer is not created at all in that case.

## Lifecycle and accessibility

- Initial reduced motion skips the GSAP module download. Changing the preference immediately reverts contexts, transforms, listeners, and every owned ScrollTrigger. Existing CSS disables interaction transitions and returns scrolling to `auto`.
- `pagehide` disposes the page before it is cached. A persisted `pageshow` remounts once, preserves scroll, and skips introductions and already-viewed content. Fresh history documents detect `back_forward` navigation. Astro swap/page-load hooks and HMR disposal protect future integration and development.
- An in-flight import cannot mount after disposal: a generation guard rejects stale initialization. Repeated lifecycle events cannot duplicate mounts. Previously entered elements are remembered in a `WeakSet`, including across responsive changes.
- Direct fragments and restored pages skip entrances for content already in view. Focusing an annotated group ends its entrance immediately; link and code focus never waits for an animation.
- All text, project links, native navigation, and technical descriptions remain present without JavaScript or if the optional motion module fails. No ARIA state or focus order depends on GSAP. The decorative strokes/SVG carry no semantic information.

## Verification

`pnpm check:motion` covers five behavior tests: device gates, initial/live reduced motion, duplicate lifecycle events and cached restoration, stale imports after unmount, and failed enhancement. Existing content, design, work-rendering, generated-route, TypeScript, Astro, and build checks remain required.

For browser verification, start `pnpm dev --host 127.0.0.1` and a separate Chrome instance:

```sh
google-chrome --headless --no-sandbox --disable-dev-shm-usage --disable-gpu \
  --no-first-run --no-default-browser-check --remote-debugging-port=9333 \
  --user-data-dir=/tmp/rokon-motion-browser about:blank
pnpm check:motion:browser
pnpm check:work:browser
```

The motion runner uses Chrome DevTools Protocol with no new browser-test dependency. Its 15 checks cover keyboard focus during introductions, actual wheel scrolling, unchanged geometry/zero observed animation layout shifts, timeline progression, live and initial reduced motion, compact mobile behavior/native keyboard navigation, touch events opening the menu and navigating to Work, four-core policy, direct fragments/code focus, real link navigation and repeated back/forward, hero animation ownership, CPU-throttled scrolling, 320px/no-JavaScript content, and browser exceptions.

Linux headless Chrome reports no fine hovering pointer. The runner checks that native capability gate first, then uses an explicitly labeled pointer-capability fixture to verify the hero still has no competing GSAP parallax. CPU throttling is a reproducible proxy, not a physical-device measurement; final touch/GPU/frame-pacing evaluation on a real mid-range phone remains a manual check. Do not claim this runner proves a particular device’s frame rate.

Results and four visual captures live in [motion-previews](motion-previews/qa-results.json). The GSAP/ScrollTrigger production chunk is lazy and approximately 116KB before compression (46KB gzip). Reduced-motion pages do not request it. The existing pnpm workspace dependency-build policy still reports `ERR_PNPM_IGNORED_BUILDS` during installation; GSAP and the lockfile were installed successfully, and build/check results are recorded separately. No unrelated build-script permission was changed.

| Final check | Result |
| --- | --- |
| Content / design / work rendering / generated routes | 16 / 10 / 14 / 10 reported tests passed |
| Motion lifecycle and device policy | 5 tests passed |
| Astro / TypeScript / production build | Passed; Astro reports 101 files with zero errors, warnings, or hints |
| Motion / existing portfolio browser runners | 15 / 12 checks passed; no browser exceptions |
| Motion layout-shift sample | Zero observed shifts; document geometry unchanged |
| Four-times CPU-throttled scroll sample | 96 frame intervals over 1.6 seconds; median and 95th percentile approximately 16.7ms in this environment |

The browser runners include five portfolio widths in both themes, native keyboard and touch navigation, normal-text contrast, route/fragment resolution, source/code disclosures, and no-JavaScript behavior. Build output still reports the expected empty blog collection; no articles were invented to suppress that message. Local QA processes were stopped after verification.

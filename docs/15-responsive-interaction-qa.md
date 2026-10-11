# Responsive and interaction QA — 2026-10-10–11 (Asia/Dhaka)

The static portfolio was reviewed with Playwright 1.64.0 in Chromium 156.0.8078.4, Firefox 157.0, and Chromium mobile touch emulation (DPR 2). Tests exercise the built files with their actual CSP and security headers. Selected rendered screenshots were visually inspected, including all major page types, both themes, article reading layouts, project media, and the live scene.

## Coverage

| Pages | Routes |
| --- | --- |
| Overview and profile | `/`, `/about`, `/contact`, `/resume` |
| Work and all project pages | `/work`, `/work/chemistry-calculator`, `/work/community-driven-social-volunteering-platform`, `/work/courseflow` |
| Publication, components, and error handling | `/blog`, `/design-system`, an unknown route returning HTTP 404 |
| Isolated publication/media fixtures | Angular, Jenkins, and Spring article bodies; tag archive; search results; long code and table specimens; diagnostic project-media component |

Every matrix route is checked in **light and dark at 320, 375, 390, 768, 1024, 1440, 1920, and 2560 CSS pixels**, in all three browser projects. Small screens use 844px height; larger screens use 1000px. Touch interactions additionally use portrait 390×844 and landscape 844×390. Separate no-JavaScript checks cover 320px.

Checks include document and element overflow, heading/body scaling, responsive navigation, keyboard skip/menu/Escape/focus/history, theme persistence and synchronized controls, gallery tab arrows and filters, labeled input/error/disabled states, lazy image loading, internal URLs and fragment targets, real resume downloads, scroll reveals, reduced-motion switching, and console/network exceptions. Article checks cover keyboard and touch scrolling, wrapping code filenames, copy success/failure feedback, TOC offsets, search/topic filtering, empty-state reset, and tag navigation.

The 3D checks cover unavailable WebGL, constrained device budgets, readable SVG fallback, absence of unnecessary scene downloads, actual Three.js rendering, frame pause, theme changes without resizing, offscreen suspension, and disposal when reduced motion is enabled. The live-render tests use a **test-only software-WebGL capability override**, and exercise desktop/full and touch/compact modes. Normal production capability gating remains enabled.

## Findings and changes

- **Fixed duplicate article anchor spacing:** root scroll padding already reserves space for the sticky header; article headings added another 8rem. TOC navigation placed the heading approximately **248px** below the viewport top. Reduced the extra margin to 0.5rem; Chromium and Firefox now place it approximately **128px** down, clear of the 96px header. [Before](responsive-qa/before/article-toc-double-offset-320.png) and [after](responsive-qa/fixture-screenshots/article-toc-320.png).
- Existing layouts, typography, project diagrams, navigation, and theme behavior passed their reviewed cases. No redesign was needed. Scrollable code/tables intentionally contain horizontal overflow within labeled keyboard-focusable regions.
- Diagnostic project media retains its 3:2 intrinsic ratio with `object-fit: contain`; all four corners remain visible. Current project pages use conceptual diagrams rather than approved project screenshots. The fixture verifies the media component without presenting diagnostic material as portfolio evidence.
- Added repeatable Playwright suites, browser availability probing, screenshot capture/indexing, raw JSON measurements, and isolated fixture orchestration. Extended the release guard to temporary QA page files as well as articles. The runner verifies that ordinary release builds reject fixtures, then removes its temporary files and build directory.
- Corrected QA-only setup/assertions for the diagnostic heading/source identifier, skip-link URL fragments, case-insensitive table labels, and expected HTTP 404 fragment navigation. These were test harness issues, not site regressions.

## Verification

Final counts and measurements are recorded in [the generated summary](responsive-qa/summary.json), with complete [release](responsive-qa/playwright-results.json) and [fixture](responsive-qa/fixture-playwright-results.json) results. [Screenshot index](responsive-qa/README.md) links desktop, tablet, mobile, full-page, Firefox, touch, and component captures.

The clean release passed **90 tests** with **12 intentional skips**; nine of these belong to fixture-only article/media checks. The fixture run passed **129 tests** with **3 intentional skips**: touch-only gestures are skipped in desktop projects, and the Chromium-specific software-WebGL override is skipped in Firefox. Both runs had **0 failures and 0 flaky tests**. Across **528 release and 768 fixture layout samples**, the maximum page overflow was **0px**, with **0 overflowing elements** outside intentional code/table scroll regions. No unexpected console errors, failed requests, or broken images were recorded in the observed checks.

The clean production build, **108 Node regression tests**, TypeScript, and `git diff --check` passed. Astro checked **139 files** with **0 errors, warnings, or hints**. Theme contrast tests also passed: minimum approved reading-token contrast was **4.525:1 light / 6.213:1 dark**; control borders and focus rings meet the tested 3:1 pairs. These are defined token-pair checks, not a claim to have automatically measured every rendered pixel.

Dependency auditing after adding Playwright reported **0 vulnerabilities**. This pass does not claim new Lighthouse or field Core Web Vitals measurements; the measured hardening results and their limits remain in [the production report](14-production-hardening.md).

## Limits

WebKit 27.2 was downloaded but could not launch: this host lacks ICU 74, libjpeg-turbo8, libmanette, and GStreamer libav runtime dependencies. [Browser availability details](responsive-qa/browser-availability.json) preserve the launch failure. Safari/WebKit is therefore **untested**. Mobile emulation tests browser touch behavior, not a physical iPhone/Android device. Clipboard outcomes are deterministically simulated to check UI feedback; this does not establish system clipboard behavior on every OS. Visual inspection covers selected rendered captures, not a pixel-perfect automated comparison of every screenshot. Screen-reader testing and deployed-device/field measurements remain outside these checks.

The three original articles remain unpublished drafts. Their copies are tested only in an isolated build, then removed. No production article/tag routes or diagnostic assets are released. The Contact page still awaits the owner's verified email and LinkedIn URL, as documented in the profile report; no invented destinations or backend submission form are introduced.

## Repeat locally

```sh
pnpm exec playwright install chromium firefox webkit
pnpm check:responsive:engines
pnpm check:responsive:fixtures
pnpm check:responsive
pnpm report:responsive
```

If browser files live outside Playwright's default cache, set `PLAYWRIGHT_BROWSERS_PATH` consistently for all commands. This review used `/tmp/rokon-playwright-browsers`. Install appropriate runtime libraries on a supported host to enable WebKit, then rerun the probe; the configuration selects engines that actually launch. The runner starts and stops its own production QA server and uses separate output for fixtures. Do not run fixture and release orchestration concurrently. `node scripts/capture-responsive-components.mjs` optionally captures lower-page tabs/filter/input sections from a clean build, with its own server; run it before regenerating the summary. Probe results and screenshots belong under `docs/responsive-qa`; local failure traces stay in ignored `test-results`.

Primary tooling references: [Playwright browser support](https://playwright.dev/docs/browsers) and [device/mobile emulation](https://playwright.dev/docs/emulation).

# Production hardening — 2026-10-10

The portfolio now builds as a fully static Astro 7 site. This pass adds crawler files, consistent metadata and structured data, working raster social previews, enforced CSP, deployment header artifacts, dependency patches, and additional release/browser checks. Measurements below are local production-build results, not claims about an unmeasured deployment or real visitor traffic.

## Measured Lighthouse results

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home (median of 3) | 95 | 100 | 100 | 100 | 1.606s | 0.00128 | 240ms |
| About | 100 | 100 | 100 | 100 | 1.502s | 0.00000 | 0ms |
| Contact | 100 | 100 | 100 | 100 | 1.502s | 0.00000 | 0ms |
| Public resume | 100 | 100 | 100 | 100 | 1.502s | 0.00000 | 0ms |
| Work | 100 | 100 | 100 | 100 | 1.352s | 0.00000 | 0ms |
| Chemistry case study | 100 | 100 | 100 | 100 | 1.352s | 0.00000 | 0ms |
| Volunteering case study | 100 | 100 | 100 | 100 | 1.352s | 0.00000 | 0ms |
| Engineering archive | 100 | 100 | 100 | 100 | 1.352s | 0.00000 | 0ms |

The eight indexable routes meet the 90+ Lighthouse goal in these runs. Individual homepage runs scored **96, 95 and 95**; its median LCP is **1.606s** and median TBT **240ms**. All measured LCP values are **1.352–1.690s**, and the largest CLS is **0.00128**. The homepage median performance score is one point below the single baseline run, and its LCP is higher; no overall speedup is claimed. Intentional noindex pages are checked for correctness rather than rewarded for indexing. Field Core Web Vitals remain unverified.

The baseline homepage was **96 performance / 100 accessibility / 100 best practices / 100 SEO**, with LCP **1.083s**, TBT **231ms**, and CLS **0.00226**. Its unweighted accessible-name audit failed on the mobile menu and scene pause glyph. The final runs correct that failure. A high aggregate score did not establish complete metadata, structured data, crawler configuration, or security.

Reports are saved under [hardening/](hardening/). [The baseline JSON](hardening/lighthouse-before-home.json) and [final summary](hardening/lighthouse-summary.json) preserve settings and measured values. Three sequential homepage runs provide a median; each other indexable route has one run. Lighthouse 13.5.0, Chrome 155.0.8059.39, Node 24.18.1 and pnpm 12.6.0 were used. Default mobile simulation: 412×823, 4× CPU slowdown, 150ms RTT and 1638.4Kbps. The localhost server serves the actual `dist/client` files with Brotli/gzip, immutable hashed assets, revalidated HTML, real HTTP 404s, and the generated security headers.

All scores and loading timings depend on the machine, cache, network model and build. Baseline and final Lighthouse LCP are not field measurements; compare the recorded results without claiming every metric improved. TBT is reported as a lab diagnostic and is **not INP**.

## SEO and publication

- Every generated HTML page has a unique title and description, canonical URL without query/fragment, Open Graph fields, and Twitter metadata. The root keeps `/`; other preferred canonical paths omit trailing slashes. `PUBLIC_SITE_URL` must be an HTTPS origin without credentials, path, query or fragment. Metadata, sitemap and structured data use this shared origin.
- A real 1200×630 PNG at `public/images/social-card.png` supplies the fallback social preview. Its authored vector source is retained in `reference/design/social-card.svg`. SVG article illustrations remain in articles; social metadata uses the PNG fallback. Published article titles/descriptions remain specific to the article.
- `/robots.txt` points to the existing `/sitemap.xml` index, which references the generated sitemap files. RSS links, autodiscovery and feed generation have been removed.
- Indexable pages expose `Person` and `BreadcrumbList` JSON-LD. Published articles expose `BlogPosting`, accurate dates, the configured canonical, a raster image, and the author's professional profile when the author is Rokon. Guest authors do not inherit Rokon's identity. Breadcrumb links resolve to real pages, including topic archives.
- All article files have been removed. Writing has an empty state and an empty search index; the publication machinery remains ready for future articles. Development previews produce no production paths. The CourseFlow brief, component gallery and 404 have `noindex`, are excluded from the sitemap and receive an HTTP `X-Robots-Tag` in the header artifacts. They remain crawlable so a crawler can read their noindex directive.
- A release build now refuses temporary `qa-` article fixtures. The production article check requires an explicitly isolated build directory, tests release rejection, and removes its fixture in `finally`.
- Native internal links, descriptive article/project links, one H1 per page, landmarks, fragment targets and safe external destinations are checked against rendered output.

## Accessibility and interaction measurements

The final Node regression suite passed **108 tests**. Astro checked **131 files with zero errors, warnings or hints**; TypeScript, the production build, frozen install and `git diff --check` also passed. Rendered-output checks verify unique metadata, schema/canonical alignment, every inline CSP hash, image dimensions, private-file exclusion and absent draft discovery.

The production profile suite passed **8 checks**, the work suite **12**, the Three.js suite **17**, and the publication suite **12**. Profile/work contrast and overflow checks cover both themes at **320, 390, 768, 1024 and 1440px**. Profile/publication text contrast minima were **4.553:1 in light mode** and **7.656:1 in dark mode**, above the 4.5:1 body-text threshold. Their detailed results and screenshots are in `docs/profile-previews`, `docs/work-previews`, `docs/hero-previews` and `docs/blog-previews`; publication screenshots use temporary test content, while the user drafts remain unpublished.

[Production browser evidence](hardening/production-browser.json) verifies actual response headers, CSP compatibility, theme changes, visible keyboard focus, mobile disclosure open/close, Escape behavior, 390px layout, reduced motion, zero public React islands, and readable native links at 320px with JavaScript disabled. Skip navigation, menu focus return, sticky-header offsets, keyboard code scrolling and working resume attachments were exercised by the profile/work suites. [The isolated production article evidence](hardening/article-browser.json) verifies BlogPosting, highlighted code and real keyboard clipboard copying with the policy enforced.

The mobile menu's accessible name now includes its visible “Menu” label. The scene's decorative pause/play symbol is CSS-generated and hidden from assistive technology; its text and accessible name agree. Existing semantic landmarks, labels, focus outlines, reduced-motion handling and image alt text remain in place. MDX media now reserves dimensions and uses `preload="none"` for video; authored media should supply its actual dimensions.

Event Timing was measured with trusted keyboard input and **4× real CPU throttling** for theme/menu interactions across 11 routes, including the noindex gallery, brief and 404. The largest recorded durations ranged from **16–128ms**. Event durations are quantized and this observer only records events at or above 16ms; these limited local samples do not establish field INP, a real-user percentile, or every interaction's responsiveness. The published-article fixture has a separate recorded sample.

Automated accessibility checks are not a complete WCAG conformance assessment. Screen-reader usability has not been tested with NVDA, JAWS or VoiceOver. The public PDF is searchable but untagged; the semantic HTML resume and text download remain its accessible alternatives. No fake contact form or backend submission claim was introduced.

## Performance and bundles

- Outfit and Geist Mono remain local Latin variable WOFF2 fonts with `font-display: swap`; the heading font is preloaded. No external font service is required.
- Tailwind now scans `src`, preventing archived template material, tests and documentation from adding unused utilities to production CSS.
- All public pages render React components on the server and ship no React hydration islands. The noindex component gallery hydrates its two controls only when visible.
- Three.js stays dynamically imported behind capability, visibility, idle, reduced-motion, hardware and data-saving checks. Its real rendering path, keyboard pause, resource budgets, context loss and disposal were verified in Chrome. A native capability rejection keeps the static illustration. GSAP remains dynamically imported only on pages with motion annotations; initial reduced motion prevents both optional downloads.
- Noncritical article/project images are lazy, article hero images can be eager, and media/artwork reserve geometry. Theme changes and scene fallback keep the hero's geometry stable. Public pages and navigation work without JavaScript.

[The bundle inventory](hardening/bundles.json) reports minified, gzip and Brotli sizes, script/preload references and island counts. The Three.js scene chunk is approximately **525.8KiB minified / 130.2KiB gzip**; GSAP/page motion is **112.3KiB / 43.8KiB**. React's renderer is **179.7KiB / 56.0KiB**, confined to the gallery. Shared CSS is approximately **74.5KiB / 13.9KiB**, down from roughly 84KiB before narrowing Tailwind's scan. The two fonts are about **31.5KiB and 30.6KiB**. These are individual asset sizes, not an aggregate page payload; actual requests are in each Lighthouse report.

The optional Three.js chunk still triggers Vite's 500KB build warning. Its dynamic loading and capability gates are retained rather than removing the feature to inflate scores. Production JS sourcemaps are not emitted; Lighthouse can report a source-map diagnostic. Remaining failed diagnostics are listed per run in the summary. Evaluate any future heavier hero/image content and longer interactions on actual target devices.

## Security and dependency auditing

`pnpm audit --json` reported **75 advisory entries before**: 1 critical, 38 high, 27 moderate and 9 low. The final audit reports **0 vulnerabilities**, across production/development dependencies. The audit's dependency count changed from **659 to 552**. The [before](hardening/dependency-audit-before.json) and [after](hardening/dependency-audit-after.json) reports retain the registry results. This is a point-in-time audit, not a guarantee against future advisories.

Astro is updated to 7.3.8 with compatible React, MDX and sitemap integrations. Markdown plugins now use the supported unified processor; build, type checks, MDX, publication and browser regressions pass. Unused Cloudflare/Worker tooling, animation/theme/markdown libraries, Radix components and icon dependencies were removed. Unused template components and the former middleware/Worker configuration are preserved as reference text outside `src` and `public`. Minimal transitive overrides patch yaml, esbuild, fast-uri, http-cache-semantics, source-map-js and postcss-selector-parser. pnpm's current settings and native build permissions are explicit, and the frozen install succeeds.

Built HTML places CSP before scripts and styles. The final emitted bytes are hashed, including the theme bootstrap, `set:html` theme CSS and JSON-LD; the HTTP policy uses the same hashes. Script elements require same-origin files or approved hashes, with no `unsafe-inline` or `unsafe-eval`; script attributes are prohibited. Defaults are same-origin, with `base-uri`, objects, frames and form submissions disabled, and fonts/images/connections restricted to local assets (image data URLs are permitted). HTTP CSP adds `frame-ancestors 'none'`. A deliberately injected unauthorized inline script was blocked in Chrome.

**Scoped allowance:** `style-src-attr 'unsafe-inline'` supports Shiki token styles, theme state and animated element styles. Inline style elements remain hashed. Astro warns that scoped attribute directives override generic resources; this is intentional and has been tested under the emitted policy. External media/scripts or a real form endpoint require an explicit policy review and functional implementation.

Responses also specify `nosniff`, `X-Frame-Options: DENY`, strict-origin referrer policy, restricted device permissions and one-year HSTS. HSTS takes effect on HTTPS hosting; localhost QA does not prove live TLS or HSTS behavior. External links opening new tabs use `noopener`. Pattern scans found no credential-like strings in shipped text assets and no private references, environment files, raw CV or Git metadata in the public artifact. The scan checks common token/private-key patterns and is not exhaustive secret detection. Environment variants are ignored by Git. No third-party requests or tracking were observed during production browser QA.

## Deployment boundary

Serve **only `dist/client`**, not the source tree or all of `dist`. The build generates:

| Artifact | Purpose |
| --- | --- |
| `dist/client/_headers` | Header rules for compatible static hosts; includes page CSP, noindex and resume attachments |
| `dist/security-headers.json` | Exact policy manifest used by the local production QA server |
| `dist/nginx-security-map.conf` | Include in Nginx's `http` context; maps routes/file paths to CSP and robots values |
| `dist/nginx-security-headers.conf` | Include in the `server` context and in locations that define any `add_header` |

Nginx does not read `_headers`. Wire the generated map and header includes into the actual host configuration, retain HTTP 404 status via `error_page`, avoid an SPA fallback, serve hashed `_astro` assets with immutable caching, and configure compression and HTTPS. Locations that add caching or attachment headers must also include the security headers because of Nginx header inheritance. Deny dotfiles and the public `/_headers` URL. Keep resume PDF/text responses as attachments. Regenerate and deploy the maps/header files alongside every HTML release so hashes stay synchronized.

No server was deployed or changed. At the time of this hardening report, Nginx was unavailable in the workspace. The later [static VPS hosting review](16-static-vps-hosting.md) adds and tests the real Nginx configuration locally, including `nginx -t`, headers, redirects, compression and caching. DNS, public TLS and the selected VPS still require verification before a later deployment. The configured origin remains the previously supplied `https://rokonuzzaaman.web.app`; set the confirmed `PUBLIC_SITE_URL` and rebuild before deploying elsewhere. Professional email, exact LinkedIn destination, original CV and unprovided education details remain pending; they have not been invented.

## Reproduce

Run fixture-producing checks sequentially. Do not build a release while publication browser fixtures are active.

```sh
pnpm install --frozen-lockfile
pnpm exec astro check
pnpm exec tsc --noEmit
pnpm check:blog:browser
pnpm check:article:production
pnpm build
node --test --test-isolation=none tests/*.test.mjs
pnpm analyze:bundles
pnpm audit --json
pnpm serve:production
```

Browser runners require local Chrome's DevTools on port 9333. In another terminal:

```sh
google-chrome --headless --no-sandbox --disable-dev-shm-usage \
  --remote-debugging-port=9333 --user-data-dir=/tmp/rokon-hardening-chrome about:blank
QA_ORIGIN=http://127.0.0.1:4173 node tests/profile-browser-qa.mjs
QA_ORIGIN=http://127.0.0.1:4173 node tests/work-browser-qa.mjs
QA_ORIGIN=http://127.0.0.1:4173 node tests/hero-browser-qa.mjs
pnpm check:production:browser
node scripts/measure-lighthouse.mjs
```

Restart the QA server after rebuilding; it caches file bytes. The measurement runner uses pinned Lighthouse 13.5.0 and overwrites its ten JSON reports and summary. Chrome flags above are for this local test environment, not instructions for weakening an everyday browser.

Primary references: [Astro 7 migration](https://docs.astro.build/en/guides/upgrade-to/v7/) documents the compiler/Vite/markdown changes; [Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp) describes hashed directives and their scopes; [Nginx header handling](https://nginx.org/en/docs/http/ngx_http_headers_module.html) describes header inheritance and `always`; [Web Vitals](https://web.dev/articles/vitals) distinguishes lab diagnostics from real visitor metrics.

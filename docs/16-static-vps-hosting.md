# Static production hosting on Linux — 2026-10-11

All required production features can be hosted as static files. The current checkout already uses **Astro 7.3.8, `output: "static"`, no adapter, and `outDir: "./dist/client"`** following the earlier portfolio/hardening changes. This pass inspected the current routes, integrations, browser scripts, content loaders, dependency manifest/lockfile and generated files before modifying hosting behavior. It does not repeat an already-completed migration or deploy anything.

The subsequent [production deployment guide](../deploy/README.md) adds plan-first scripts, sealed releases, atomic selection, rollback, a shared immutable asset pool, per-site logs and ACME routing. For that workflow, prepare with its additional asset/log options and retain the generated `nginx-hosting.json`. `static-build.json` now includes every public file's SHA-256 checksum for transfer validation. The original local hosting measurements below remain a record of this initial preparation pass; later deployment-workflow results are [reported separately](deployment-qa/README.md).

The upstream Git revision used `output: "server"`, `@astrojs/cloudflare`, Wrangler type generation and Worker configuration. Its blog archive originally read request pagination and needed runtime execution. The current archive renders an approved publication list at build time and filters in the browser using generated JSON. No current production route reads request cookies, sessions, credentials, runtime bindings or remote APIs. There is no middleware, Astro Action or server island requiring a host process.

## Route audit

All 17 current page/endpoint source modules declare `prerender = true`. Dynamic production pages enumerate paths with `getStaticPaths`; GET endpoint functions execute during the build, not per visitor request.

| Source / routes | Execution and emitted files |
| --- | --- |
| `index.astro`, `about.astro`, `contact.astro` | Build-time HTML: `/index.html`, `/about/index.html`, `/contact/index.html` |
| `work/index.astro`, `work/[slug].astro` | Build-time portfolio plus three enumerated project routes: Chemistry Calculator, volunteering platform and CourseFlow brief |
| `resume/index.astro` | Build-time professional HTML |
| `resume/rokon-resume.pdf.ts`, `.txt.ts` | Build-time PDF/text bytes; Nginx restores attachment headers |
| `blog/index.astro` | Build-time archive with an empty writing state |
| `blog/[slug].astro`, `blog/tags/[tag].astro` | Paths selected from approved, non-draft, eligible posts |
| `blog/search-index.json.ts` | Build-time JSON; same publication gate as archive/articles |
| `robots.txt.ts` | Build-time text; sitemap integration also emits index and route XML files |
| `design-system.astro` | Static, noindex gallery with two `client:visible` React islands |
| `404.astro` | Actual `/404.html`, noindex; served with HTTP 404 by Nginx |
| `preview/blog/[slug].astro` | Development only: `getStaticPaths` returns `[]` in production |

The build emits static HTML and endpoint files, three sitemap XML files, fonts, illustrations, social previews, CSS, and browser JavaScript. All article files have been removed; the content collection is empty and ready for future writing. RSS, development preview paths, draft article/tag routes, and QA fixtures are absent from the release. Publishing an article or reaching a scheduled publication date requires a **new build and release**; time passing does not modify static files.

## Features preserved and Cloudflare removal

React renders portfolio/MDX component HTML at build time; the gallery's small interactive islands hydrate only when visible. GSAP and Three.js remain dynamic browser imports with their existing visibility, device and reduced-motion gates. MDX, Shiki highlighting, native copy controls, publication discovery, sitemap, canonical metadata, Open Graph and structured data remain intact. The only application fetch is the same-origin static search-index JSON.

The active package manifest and pnpm lockfile contain no Cloudflare adapter, Wrangler or Workerd dependencies. Worker configuration, middleware and obsolete template code had already been removed from active source and retained only as reference text outside `src`/`public`. Those reference files are not shipped. There is no Cloudflare Images endpoint, KV/session use, D1/R2 binding or request-time image optimization requirement.

This review found an important leftover: **`dist/server` still contained an old Cloudflare Worker build**, because a static build cleans `dist/client` only. The production-artifact integration now removes that known legacy directory before a normal release build. Isolated QA build directories are kept separate. `build.format: "directory"` is explicit so nested index files remain stable.

No required feature blocks static hosting. A future real contact submission form would need a working external or separately hosted endpoint plus a CSP change; it is not currently implemented. Contact links and resume downloads remain static. Unprovided email/LinkedIn and the final VPS domain remain content/configuration inputs, not server dependencies.

## Artifact and Nginx architecture

```text
pnpm + Node (build machine only)
  → Astro static HTML + local CSS/JS/fonts/media + build-time endpoints
  → Nginx on Linux serves release/client
  → browser hydrates islands and lazily loads GSAP/Three.js
```

Only `client/` is the web root. Keep the adjacent configuration and manifests outside it:

```text
dist/
  client/                         # The only publicly served directory
    index.html, 404.html
    about/index.html, contact/index.html, ...
    work/<slug>/index.html
    blog/search-index.json
    resume/rokon-resume.pdf, rokon-resume.txt
    robots.txt, sitemap*.xml
    _astro/, images/, favicon.svg
    _headers                      # Compatibility artifact; Nginx does not read it
  security-headers.json            # QA policy manifest
  static-build.json                # Output, origin, routes and aliases
  nginx-security-map.conf          # Generated page CSP and noindex maps (http context)
  nginx-routing-map.conf           # Generated canonical alias map (http context)
  nginx-security-headers.conf      # Generated add_header directives
  nginx-site.conf                  # Rendered HTTP/HTTPS virtual hosts, after prepare:vps
  nginx-static-server.conf         # Rendered routing/caching/compression, after prepare:vps
```

The reviewed source templates are [site.conf.template](../deploy/nginx/site.conf.template) and [static-server.conf.template](../deploy/nginx/static-server.conf.template). Prepare the two rendered files with [prepare-vps.mjs](../scripts/prepare-vps.mjs). They preserve the existing slashless canonical policy: `/about` and nested project/article URLs serve `index.html` directly; existing `/about/` and `/about/index.html` aliases redirect with **308** to `/about`, retaining query parameters. `/index.html` redirects to `/`. Unknown paths are not redirected to Home or given a successful SPA response.

The root has an explicit `/index.html` rule. Real Nginx testing discovered that the generic `$uri/index.html` rule resolved `/` as `//index.html`, selecting the fallback CSP and blocking assets. The explicit root location fixes that URI/policy mismatch. The custom error location retains **404 status**, the 404 page's exact CSP, noindex and `no-store`; direct `/404.html`, missing assets and denied metadata paths also use it.

Nginx applies the generated CSP and security headers in every location that adds a header, including attachments and caching. This handles header inheritance on older supported Nginx versions. HTML and resumes revalidate, hashed `/_astro/` assets use one-year immutable caching, ordinary static assets use a one-hour cache, and gzip compresses HTML/CSS/JS/XML/JSON/SVG. PDF/text downloads retain their filenames. Dotfiles and `/_headers` are denied. `map_hash_bucket_size 256` accommodates long nested route aliases; on a shared multi-site host, define that http-level directive once.

## Build and prepare locally

Use Node **22.12+** and the pinned **pnpm 12.6.0**. The frozen lockfile install has been verified. Build with the actual HTTPS VPS origin before preparing configuration; canonical URLs, sitemap, social metadata and schema are compiled into files.

```sh
pnpm install --frozen-lockfile
# Set your actual domain in an ignored .env.production file:
# PUBLIC_SITE_URL=https://your-confirmed-domain.example
pnpm exec astro check
pnpm exec tsc --noEmit
pnpm build
node --test --test-isolation=none tests/*.test.mjs
pnpm prepare:vps --release-root /srv/www/rokon/releases/2026-10-11-review
```

The last command writes **local `dist/` files only**. The root should identify a versioned release; the same root supplies HTML and all CSP/routing includes. Paths are validated before template substitution. Certificate paths default to `/etc/letsencrypt/live/<built-domain>/fullchain.pem` and `privkey.pem`; supply `--certificate` and `--private-key` for existing alternatives. These are paths, not embedded keys. The emitted virtual-host configuration belongs inside Nginx's `http` context, commonly through `sites-enabled` or `conf.d`.

The current build still uses the previously supplied **`https://rokonuzzaaman.web.app`**. That is not a claim that the Linux VPS owns or serves that domain. Set the confirmed VPS origin and rebuild before deploying. Do not edit generated canonical strings, move the site to a subpath, or change domains only in Nginx.

## Local hosting verification

The local [check-vps.mjs](../scripts/check-vps.mjs) runner builds the site, inspects artifacts, renders the same configuration templates and launches real **Nginx 1.30.5** in a disposable official-image container. Image digest: `sha256:0985e772fb9f729e6fa0980da05fca5d9c468e870eed43071545afa9d2e27d94`. Docker is a test dependency, **not a VPS hosting requirement**. It binds localhost only, mounts generated files read-only, and stops its own container afterward.

The runner validates `nginx -t`, direct and nested URLs, alias/query redirects, exact page CSP and noindex, MIME types, resume attachments, real custom 404 behavior, hidden-file denial, asset caching, gzip, ETag/304, HEAD responses, and the HTTP-to-HTTPS redirect. Playwright then checks rendered pages and browser interactions through that Nginx instance. Its HTTPS listener uses a temporary self-signed certificate; verification ignores that local certificate only. Listener ports and filesystem roots differ from VPS paths. This is evidence of working static serving, not proof of a publicly trusted certificate, DNS, firewall or the user's installed Nginx.

Fixture verification copies draft article bodies into an explicitly isolated build, checks ordinary release rejection, exercises static article/tag paths and publication controls through Nginx, then removes the temporary source/files. Normal release artifacts remain separate. Run these checks sequentially:

```sh
pnpm exec playwright install chromium firefox webkit
pnpm check:responsive:engines
pnpm check:vps
pnpm check:vps:fixtures
```

Use `PLAYWRIGHT_BROWSERS_PATH=/tmp/rokon-playwright-browsers` consistently when reproducing this machine's browser-cache location. Chromium, Firefox and Chromium touch emulation are available here; WebKit cannot launch because host runtime libraries are missing. Raw results are under [vps-qa/](vps-qa/). Browser captures use the existing [responsive screenshot directories](responsive-qa/README.md); the measured Nginx runs have separate JSON reports.

## Measured verification

Verified locally on **2026-10-11 (Asia/Dhaka)**. Both runs used the generated site through real Nginx over localhost HTTPS, rather than Astro's development or preview server.

| Check | Measured result |
| --- | --- |
| Frozen pnpm install | Passed; lockfile resolution unchanged |
| Astro diagnostics / TypeScript | 142 files, 0 errors/warnings/hints; `tsc --noEmit` passed |
| Node regression checks | **108 passed**, 0 failures/skips |
| Normal production build and artifact inspection | Passed; 11 HTML files, 37 regular public files, no server/Worker/private output; the initial counter included one empty directory |
| Nginx version / syntax | 1.30.5; `nginx -t` passed for both rendered test configurations |
| Release HTTP/artifact checks | **52 passed**; [raw results](vps-qa/nginx-results.json) |
| Isolated article/tag HTTP/artifact checks | **100 passed**; 27 HTML files in temporary output; [raw results](vps-qa/fixture-nginx-results.json) |
| Release Playwright | **90 passed, 12 intentional skips, 0 failures, 0 flaky**; [results](vps-qa/playwright-results.json) |
| Isolated fixture Playwright | **129 passed, 3 intentional skips, 0 failures, 0 flaky**; [results](vps-qa/fixture-playwright-results.json) |

The browser matrix covers **320, 375, 390, 768, 1024, 1440, 1920 and 2560 px**, both themes, Chromium, Firefox and touch Chromium. Checks include direct navigation, downloads, keyboard/menu focus, responsive layout, theme persistence, React gallery controls, reduced motion, real Three.js lifecycle and device/WebGL fallbacks. Fixture checks also cover highlighted code scrolling/copy, publication search, topic/tag navigation and uncropped media. Console errors and failed requests are checked. Skips are fixture-only interactions in the empty release archive, touch-only tests on desktop engines, and software-WebGL rendering in Firefox; Firefox's fallback is tested.

Selected captures were visually inspected: mobile dark Home, desktop light Contact, tablet light article and mobile dark tag archive. Layout screenshots use reduced motion for stable capture; separate interaction checks exercise animation. Fixture sources and temporary output were removed, and the normal release still contains no article, tag or preview pages. Local generated configuration was prepared for `/srv/www/rokon/releases/2026-10-11-review`; that directory was **not created on or transferred to a VPS**.

The build retains the existing deferred Three.js chunk-size warning; the library loads behind the documented desktop/device gates. This pass does not remeasure Lighthouse or claim field LCP/INP/CLS. Earlier measured performance findings remain in [the production hardening report](14-production-hardening.md). WebKit, public certificate trust, DNS, the actual VPS/Nginx version, firewall and public-network performance remain unverified.

## Later VPS release procedure — not executed

After the domain, certificate strategy and VPS paths are confirmed, transfer only the reviewed `client/` tree and adjacent generated Nginx configuration into a versioned release directory. Never upload the source checkout, `.env`, `.git`, `reference/private`, development server or Cloudflare artifacts. The VPS needs Nginx and TLS certificates; it needs no Node, pnpm, Docker, Cloudflare account or application process for serving this release.

Give the Nginx worker read/traverse access to those public files while keeping certificate keys appropriately restricted. Configure the HTTP include, validate with the VPS's own `nginx -t`, and reload Nginx only after reviewing the actual configuration. Point both HTML root and generated map includes to the same versioned release so workers never mix new HTML with old CSP hashes. Keep the previous release/configuration for rollback, and verify HTTPS, redirects, status codes, CSP, caching, MIME and downloads after any later switch. Ordinary browser caches and long-lived workers mean releases should retain old hashed assets/release directories during transition.

The HTTP template redirects all requests; if using Let's Encrypt HTTP-01 renewal, provision an accessible challenge location before enabling the redirect. Existing certificates or DNS validation are alternatives. Optional `http2 on` requires Nginx 1.25.1+; it is left commented so routing does not depend on that newer directive. Actual TLS, certificate renewal, OS permissions/SELinux and VPS deployment are not performed by any repository preparation command.

References: [Astro static deployment](https://docs.astro.build/en/guides/deploy/), [output format and trailing-slash configuration](https://docs.astro.build/en/reference/configuration-reference/#buildformat), [Nginx try_files/error handling](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files), [Nginx add_header inheritance](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header), and [official Nginx container](https://hub.docker.com/_/nginx).

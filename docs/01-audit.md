# 01 — Technical and design audit

Audit date: 2026-10-10. Scope: repository inspection, reference review, baseline verification, and planning only. No redesign, dependency changes, production access, or deployment performed.

## Evidence and limits

Repository findings below come from source files, the installed dependency tree, and generated build artifacts. Visual observations use the existing `public/starfolio-preview.png`; that image is a template preview, not a screenshot captured from the current running application. No interactive browser, Lighthouse, screen reader, or Playwright assessment was executed. External pages were reviewed through a web text retrieval tool; their rendered animation and responsive behavior were not visually tested.

`reference/private/cv.docx` does not exist at the requested path. A workspace search found no alternate `.docx`. No CV facts have been extracted or inferred. Reference access and content provenance are recorded in [04-content-inventory.md](04-content-inventory.md).

The working tree was clean before this audit. The only intended tracked additions are the five documents in `docs/`. Checks generated ignored local output in `.astro/`, `.wrangler/`, and `dist/` as needed.

## Executive assessment

Starfolio provides a usable Astro 6, React, Tailwind 4, and MDX foundation, strict TypeScript configuration, syntax highlighting, and sitemap generation. The existing portfolio presentation and content need substantial replacement to meet “Systems in Motion.” Its deployment is a mixture of prerendered pages and a Cloudflare runtime, rather than a standalone static artifact suitable for Nginx.

Successful compilation is the baseline, not evidence that content, accessibility, SEO, or interactions are ready for publication. The highest-priority issues are template professional claims, a client-only homepage, runtime blog pagination, and incomplete accessible semantics.

## Baseline verification

Environment: Node `v24.18.1`; pnpm reports `12.6.0`. The declared Node requirement is `>=22.12.0`. Existing dependencies were used; no install or upgrade was performed.

| Command / inspection | Actual result | Interpretation |
| --- | --- | --- |
| `pnpm exec astro check` in sandbox | Exit 1: `uv_interface_addresses returned Unknown system error 1` | Cloudflare Vite plugin could not inspect network interfaces; an environment restriction, not an observed type error |
| Same check outside sandbox, with approval | Exit 0; 62 files, 0 errors, 0 warnings, 0 hints | Astro baseline passes |
| `pnpm exec tsc --noEmit` | Exit 0, no diagnostics | TypeScript baseline passes; does not substitute for Astro or runtime tests |
| `pnpm build` in sandbox | Exit 1 with the same Cloudflare network-interface failure | Environment restriction |
| Same build outside sandbox, with approval | Exit 0; Cloudflare server build completed in about 11.45 seconds | Current application builds for its existing target |
| Build artifact inspection | Home, custom 404, and seven article HTML files generated; no `dist/client/blog/index.html` | Blog index is still a runtime route |
| Test / lint / format / accessibility scripts | None declared | No existing automated suites to execute |
| Dependency vulnerability scan | Not executed | No claim that dependencies are vulnerability-free |
| Fresh frozen-lockfile install | Not executed | Reproducible installation remains unverified |

The build reported inspector port 9229 unavailable and selected 9230; this did not fail the build. Adapter logs also announce Cloudflare Images and KV session bindings, although source inspection found no application use of sessions.

## Current route map

| Route | File | Rendering | Current purpose and concern |
| --- | --- | --- | --- |
| `/` | `src/pages/index.astro` | Prerendered shell; `HomePage client:only="react"` | All portfolio body content requires JavaScript |
| `/blog/` and `?page=N` | `src/pages/blog/index.astro` | On demand under `output: 'server'` | Reads request search parameters; hard-coded page size 5 |
| `/blog/[slug]/` | `src/pages/blog/[slug].astro` | `getStaticPaths`, prerendered | Seven MDX articles; no draft/publication filtering |
| Missing URL / `404.html` | `src/pages/404.astro` | Prerendered | Recovery link exists; indexing policy and HTTP handling need review |
| Sitemap endpoints | Sitemap integration | Generated XML | Currently advertises template domain, including runtime `/blog/` |

About, work, education, skills, projects, photos, hackathons, and contact are homepage sections. There are no dedicated About, Experience, Projects, Project Details, or Contact pages. `robots.txt`, RSS, search, and a contact endpoint are absent. `favicon.ico` is referenced but missing; SVG favicon exists.

## Configuration, scripts, and data

- `astro.config.mjs`: React, MDX, sitemap, Tailwind Vite plugin, GFM, custom code metadata, and pretty-code are configured. `output: 'server'` and the Cloudflare adapter are explicit. Keep the content/build integrations when moving to static output.
- `tsconfig.json`: extends Astro strict settings, defines `@/*`, and uses React JSX. `skipLibCheck` and TS 6 deprecation suppression mean the passing check does not prove every dependency type is compatible. Cloudflare-generated `worker-configuration.d.ts` is included.
- `package.json`: dev/build/preview/Astro passthrough and Wrangler type generation only. No `check`, test, CI, or formatting workflow. A root Vite 7 override and a TS 6 peer allowance require compatibility review before changes; do not upgrade blindly.
- `pnpm-workspace.yaml`: `allowBuilds` entries for esbuild, sharp, and workerd contain literal “set this to true or false” strings, not resolved boolean decisions. Treat installation behavior as unverified; settle explicit build permissions in the foundation phase.
- `src/data/config.ts`: deployment URL, typography, SEO, theme values, and pagination setting. `blog.postsPerPage` is 10 but the actual route uses 5. Twitter handle is configured but not emitted by the layout.
- `src/data/resume.tsx`: a large inferred `as const` object containing personal profile, all section copy, employers, education, projects, photos, awards, icons, component references, and JSX. This separates some content from markup, but it is not a portable, independently validated content model.
- `src/lib/remark-code-meta.ts` and BlurFade's margin cast use `any`. Strict project settings alone do not ensure strict types throughout custom code.
- `components.json`: useful shadcn/Radix generation conventions and aliases. It is tooling metadata, not a runtime dependency or accessibility guarantee.

## Component map and disposition

| Current unit | Responsibility | Recommendation |
| --- | --- | --- |
| `layouts/Layout.astro` | Document metadata, theme variables, wrapper, grid, navigation | Retain metadata concepts; redesign shell, landmarks, spacing, and hydration |
| `HomePage.tsx` | Hero and all section assembly | Replace with Astro-rendered composition; isolate actual interactions |
| `NavbarIsland.tsx`, `navbar.tsx`, MagicUI dock | Theme provider, tooltips, magnifying icon dock | Replace primary navigation with named text links and responsive menu |
| `mode-toggle.tsx`, `theme-provider.tsx` | Light/dark state | Reuse behavior if necessary; fix naming, system preference, and icon state; prefer small script |
| `section/work-section.tsx` | Accordion career list | Reuse disclosure concept; redesign as readable timeline with visible core contributions |
| `section/projects-section.tsx`, `project-card.tsx` | Repeated project tiles, media and outbound links | Replace composition with editorial project rows and case study links |
| `section/contact-section.tsx` | Contact copy and flickering backdrop | Replace with real verified contact links; current section has no actionable contact link |
| `section/photos-section.tsx`, `hackathons-section.tsx` | Travel gallery and event history | Remove from public composition unless verified material warrants inclusion |
| `timeline.tsx` | Timeline layout primitives | Reuse concepts after semantic and responsive review |
| `BlogList.tsx` | Article list and pagination links | Render statically in Astro; reuse information hierarchy, not whole React hydration |
| `content.config.ts`, article route | Collection loading and static paths | Retain and extend validation and filtering |
| `mdx-components.tsx`, `mdx/code-block.tsx` | Article components and code copy | Keep highlighting; replace unhydrated copy interaction with progressive enhancement |
| `mdx/media-container.tsx` | Fixed-height media rendering | Redesign with image dimensions, captions, ratios, and video accessibility |
| `ui/*` | Radix wrappers, variants, simple primitives | Reuse where they earn their JavaScript; audit styling and naming; static primitives can become Astro |
| `ui/svgs/*`, `icons.tsx` | Technology and social icons | Reuse only relevant icons; map semantic string IDs to icons inside UI |
| `magicui/blur-fade*`, `flickering-grid`, `dock` | Blur reveals, continuous canvas, hover springs | Retire from primary presentation; establish controlled GSAP/CSS motion |
| `lib/utils.ts`, `pagination.ts` | Class merge, date display, pagination | Retain class merge; correct date semantics and empty/invalid pagination cases |

## Dependency audit

Versions below are declared ranges unless stated otherwise. Recommendations describe later work; nothing has been removed or added.

| Package(s) | Version(s) | Current use / decision |
| --- | --- | --- |
| `astro` | `^6.2.1`, lockfile 6.2.1 | Keep Astro 6; migrate output rather than changing framework |
| `@astrojs/react` | `^5.0.4` | Keep for narrowly scoped islands |
| `react`, `react-dom` | `^19.2.5` | Keep paired; reduce page-level hydration |
| `@astrojs/mdx` | `^5.0.4` | Keep for articles and rich case studies |
| `@astrojs/sitemap` | `^3.7.2` | Keep; verify draft exclusions and canonical domain |
| `tailwindcss`, `@tailwindcss/vite` | `^4.2.4` | Keep Tailwind 4 and Vite integration |
| `@tailwindcss/typography` | `^0.5.19` | Keep for editorial article styling |
| `@fontsource-variable/outfit`, `@fontsource-variable/geist-mono` | `^5.2.8`, `^5.2.7` | Keep initially; evaluate editorial suitability and selected subsets |
| `@radix-ui/react-accordion`, `react-avatar` | `^1.2.12`, `^1.1.11` | Conditional reuse; native disclosure/static portrait may be sufficient |
| `@radix-ui/react-tooltip`, `react-separator`, `react-slot` | `^1.2.8`, `^1.1.8`, `^1.2.4` | Keep only where interactive primitives remain necessary |
| `@radix-ui/react-icons`, `lucide-react` | `^1.3.2`, `^1.14.0` | Two icon systems; consolidate where practical; don't require React for every static icon |
| `class-variance-authority`, `clsx`, `tailwind-merge` | `^0.7.1`, `^2.1.1`, `^3.5.0` | Useful maintainable styling utilities |
| `tw-animate-css` | `^1.4.0` | Used by UI wrappers; retain only required transitions with motion preferences |
| `motion` | `^12.38.0` | Current reveal/dock engine; phase out if GSAP covers the remaining deliberate animation |
| `next-themes` | `^0.4.6` | React theme behavior; can be replaced with small accessible theme control |
| `react-markdown` | `^10.1.0` | Portfolio summaries/descriptions; remove only after content rendering moves to Astro/collections |
| `rehype-pretty-code`, `remark-gfm`, `shiki` | `^0.14.3`, `^4.0.1`, `^4.0.2` | Keep build-time highlighting/GFM; validate title metadata and markup |
| `@astrojs/cloudflare`, `wrangler` | `^13.3.0`, `^4.87.0` | Remove in static migration after runtime features have replacements |
| `@types/react`, `@types/react-dom` | `^19.2.14`, `^19.2.3` | Build-time types; consider moving to devDependencies |
| `typescript`, `@astrojs/check` | `^6.0.3`, `^0.9.9` | Existing devDependencies; keep and expose a check script |
| Vite override | `^7`, lockfile 7.3.2 | Document reason and verify Astro/adapter peer behavior before modifying |
| Planned: `gsap`, `three`, `@types/three` as needed | Not installed | Add only in motion/3D phases; measure cost and verify compatibility |
| Planned: `@playwright/test`, accessibility tooling | Not installed | Add in test phase with reproducible browser setup |

No direct package is proven redundant solely because it lacks an import under `src`: integrations, React DOM, types, and highlighting packages have configuration or transitive roles. A vulnerability scan and license review of new packages remain future checks.

## Cloudflare-specific coupling

1. Adapter import and `adapter: cloudflare()` in `astro.config.mjs`; server output defaults routes to on-demand rendering. [Astro rendering reference](https://docs.astro.build/en/guides/on-demand-rendering/).
2. `wrangler.jsonc`: Worker entrypoint, assets binding, compatibility date/flag, observability, and Worker name.
3. `wrangler` dependency and `generate-types` script; Worker type include and ignore rules.
4. Adapter-provided Images/KV integrations announced during check/build. These do not imply application business logic uses KV.
5. Blog index runtime pagination and any request-derived canonical URLs need static replacements.
6. `src/middleware.ts` is portable Astro code, not a Cloudflare API, but response headers from it are not a substitute for Nginx headers on static files.
7. README deployment guidance, Cloudflare deploy badge, and server artifact layout must be updated while preserving upstream attribution.

Do not copy only `dist/client` to the VPS and assume the application is complete: that currently omits the blog index runtime.

## Design, performance, accessibility, and SEO findings

| Priority | Evidence | Impact / planned response |
| --- | --- | --- |
| Critical before publication | `DATA` and all MDX author fields use Alex Mercer; fabricated-for-template employers, metrics, projects, awards, contact and education remain | Replace with verified content; no template claim may become Rokon's claim |
| High | `HomePage client:only`; built homepage contains 0 `<h1>` tags and no rendered portfolio body | Static-readable pages and semantic hero heading |
| High | Blog index reads `Astro.url.searchParams`; page size ignores config | Build-time pagination routes with native links |
| High | No reduced-motion branching in custom reveals, canvas, dock, or CSS | Disable nonessential motion; keep content visible without JS |
| High | Navbar consists of icon links with tooltips and no explicit accessible names; theme button unnamed | Named primary navigation, landmark, active-page state, keyboard controls |
| High | MDX code-copy button SSR markup exists, but its React handler has no hydration boundary in the article route | Progressive copy script, accessible feedback, failure state; runtime test later |
| Medium | Home hero uses spans rather than a heading; article sample creates a second `<h1>`; blog/404 layout lacks a shared main landmark and skip link | One page heading; article bodies begin at h2; semantic shell |
| Medium | Theme startup script follows system preference; provider defaults to light with system disabled; sun always shown, moon hidden | Consistent preference policy, correct icon and state |
| Medium | Projects wrapper and component both declare `id="projects"` | Remove duplicate IDs; ensure anchor navigation is unique |
| Medium | Photos use generic alt text; img markup usually has no intrinsic dimensions or lazy loading; MediaContainer crops to 300px | Audited media, responsive sources, dimensions, informative captions |
| Medium | Project videos autoplay/loop without a pause affordance or preference handling | Poster by default; controlled accessible media only where useful |
| Medium | `formatDate` uses absolute time difference and build-time relative labels | Future dates can appear “ago”; static pages become stale; use stable explicit dates |
| Medium | Empty collection can normalize page to 0; numeric parsing accepts partial strings; sort doesn't return 0 for ties | Deterministic sorting and validated pagination |
| Medium | `updatedAt` and author exist but article JSON-LD uses publication date and global template name | Emit validated author and modification metadata |
| Medium | `CONFIG.site.url` and `DATA.url` duplicate template domain; canonical can derive from request; 404 inherits index policy | One site origin; explicit canonical paths; noindex for 404 |
| Medium | No robots or feed; favicon ICO reference missing; `og:type` always website | Complete technical SEO and article-specific metadata |
| Low / design | Narrow `max-w-2xl` shell, repeated pills/rounded cards, large empty sides in template preview | Architectural grid, editorial layouts, distinct hierarchy |
| Low / design | Dense inline prose overrides with many `!`, pointer cursor on ordinary table rows, hard-coded amber blockquotes | Token-based styles with clear content semantics |

The existing neutral palette, local variable fonts, external-link `rel` attributes, basic focus styles, and Radix primitives are positive starting points. Color contrast and screen reader outcomes have not been measured; don't claim WCAG conformance from those choices.

### Asset observations

`public/` is about 3.8 MiB on disk, including a roughly 836 KiB portrait and 1.7 MiB template preview. Public assets are copied to build output; they are not necessarily all downloaded by a visitor. Example screenshots, travel photos, external favicons, and demo videos are template assets, not evidence of Rokon's work.

Build artifact measurements: HomePage chunk 147,224 bytes raw / 44,482 bytes gzip; React client chunk 182,343 / 57,551; NavbarIsland 56,629 / 20,681. Additional shared chunks include one of 123,543 / 40,509 bytes. These are individual file sizes using local gzip, not measured transferred page totals or a Lighthouse performance score. The homepage has three explicit Astro islands, and its content composes further React components.

## Risks and next gate

| Risk | Severity | Mitigation / gate |
| --- | --- | --- |
| Missing primary CV; previous portfolio unavailable to retrieval tool | High | Keep career content blocked from publication until professional facts are supplied and reviewed |
| Public GitHub page may be stale/partial | High for attribution | Confirm project ownership and actual contribution through code/history and user evidence |
| Static migration drops runtime blog listing or security headers | High | Build every listing route; test headers on Nginx and unknown URLs |
| GSAP plus Three.js plus React exceeds performance budget | High | Route-scoped imports, static fallback, staged measurements |
| Dependencies pass existing checks but fresh install is uncertain | Medium | Explicit pnpm build permissions, frozen install and CI compatibility checks |
| Design audit based on code/template preview, not runtime browser | Medium | Add real viewport, keyboard, assistive technology and no-JS tests in later phases |

Acceptance criteria for this audit: five requested documents exist; route/component/dependency maps and phase risks are explicit; real baseline results and access limitations are recorded; implementation is not started. CV extraction remains an unavailable-source task, not a completed verification.

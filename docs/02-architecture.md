# 02 — Website and content architecture

Status: proposed architecture, 2026-10-10. This document does not describe changes already implemented. See [01-audit.md](01-audit.md) for current behavior and [05-implementation-plan.md](05-implementation-plan.md) for phase gates.

## Architectural principles

This document records the original architecture blueprint. The implemented configuration is now Astro 7 static output at `dist/client`, with slashless canonical HTML routes. The current audited route inventory, Nginx behavior and hosting instructions are in [16-static-vps-hosting.md](16-static-vps-hosting.md); historical proposals below are not deployment instructions.

Use Astro static output for all public content pages, semantic HTML for the reading experience, and small scripts or React islands for interactions that require state. Retain MDX collections, build-time highlighting, Tailwind 4, strict TypeScript, and Starfolio's MIT attribution. No CMS, database, account system, runtime GitHub fetch, or contact backend is necessary for the first release.

Every page must remain meaningful when JavaScript is unavailable. Navigation and contact links are ordinary anchors. Three.js enhances a static engineering illustration on Home; it is not the renderer for professional content.

## Proposed route map and information architecture

Canonical policy proposed: trailing slash for HTML routes, one confirmed production origin. Use explicit static paths. Slugs are lowercase kebab-case and stable after publication.

| Page / route | Purpose | Main content | Cross-links |
| --- | --- | --- | --- |
| Home `/` | Establish identity and engineering credibility quickly | Verified introduction, selected contributions, expertise overview, experience excerpt, latest approved writing, contact CTA, signature visual | Projects, Experience, About, Blog, Contact |
| About `/about/` | Explain professional background and approach | Verified biography, engineering principles, skill groups grounded in work, education, optional sanitized resume | Experience, relevant case studies, Contact |
| Experience `/experience/` | Explain employment and responsibilities | Chronological roles, dates, employer labels, contribution bullets, technology context; distinguish personal work from employer work | Approved professional case studies |
| Projects `/projects/` | Browse substantive engineering work | Editorial project list with kind, role, problem, stack and case-study link; optional enhanced filters when inventory warrants | `/projects/[slug]/` |
| Project Details `/projects/[slug]/` | Demonstrate reasoning through evidence | Context, ownership/contribution, problem, constraints, decisions, architecture, implementation, supported outcomes, tradeoffs, links | Related projects, relevant articles, Contact |
| Blog `/blog/` | Browse engineering writing | Titles, summaries, publication dates, topics and native pagination | Article routes |
| Blog pagination `/blog/page/[page]/` | Keep archive static and crawlable | Same list layout; generate pages 2 onward; `/blog/` is page 1 | Native previous/next links |
| Blog Article `/blog/[slug]/` | Comfortable long-form reading | Title, summary, author, dates, reading estimate, optional table of contents, article, related writing | Blog, related case studies |
| Contact `/contact/` | Make contact straightforward | Verified email and professional profile links, concise purpose prompt; availability only if confirmed | About, GitHub |
| Custom error `/404.html` | Recover from an unknown route | Clear error heading, Home/Projects/Blog links, optional static “disconnected route” illustration | Primary pages; served with HTTP 404 |
| `/sitemap-index.xml`, generated child sitemap | Discovery | All published canonical HTML pages; exclude error/draft content | Robots reference |
| `/robots.txt` | Crawling policy | Production allow policy and sitemap URL; staging policy separate | Sitemap |
| `/rss.xml` | Follow writing | Published article metadata/content policy | Blog |

Primary navigation: About, Experience, Projects, Blog, Contact; identity mark links Home. Footer repeats useful destinations and attribution. Avoid eight equal-weight tabs at every viewport. On Home, section anchors are optional conveniences, not replacements for standalone routes.

Contact starts with `mailto:` and profile anchors. Add a form only in a later explicitly requested scope that includes backend, spam controls, storage policy, delivery status and accessibility.

The 404 document is an error resource, not a regular indexed page. Validate that Nginx serves it for arbitrary missing URLs with the original 404 status.

## Proposed file and component map

```text
src/
  data/
    site.ts                   # Origin, navigation, SEO defaults
    profile.ts                # Public professional identity and biography
    experience.ts             # Typed roles and contributions
    education.ts              # Verified qualifications
    skills.ts                 # Semantic skill IDs and labels
    sources.ts                # Public provenance IDs, URLs, verification status
  schemas/
    portfolio.ts              # Portable public-data validation and types
  content.config.ts           # Separate projects and blog collections
  content/
    projects/<slug>.mdx        # Metadata + long-form case study in one record
    blog/<slug>.mdx            # Metadata + independent engineering article
  assets/
    profile/                  # Approved optimized portrait
    projects/<slug>/          # Real assets or clearly labeled original diagrams
    illustrations/            # Native SVG and fallback for optional 3D
  layouts/
    BaseLayout.astro           # Document, skip link, header, main, footer
    ArticleLayout.astro        # Reading width, article metadata and content
    ProjectLayout.astro        # Case study composition and role context
  components/
    layout/                   # Header, Navigation, Footer, Breadcrumbs
    typography/               # PageHeading, SectionHeading, RichText
    home/                     # Hero, SelectedProjects, ExperienceSummary
    portfolio/                # ExperienceTimeline, ProjectRow, SkillGroup
    content/                  # ArticleList, Pagination, Figure, CodeBlock
    ui/                       # Only useful accessible primitives
    interactive/              # Optional filter/menu islands, named controls
    visuals/                  # Static SystemsDiagram, isolated SystemsScene
  scripts/                    # Menu, theme, copy-code, GSAP enhancement
  lib/                        # Content queries, URLs, dates, reading estimate
  styles/                     # Tokens, base styles, prose, motion utilities
  pages/                      # Static routes from the route map
tests/
  e2e/                        # Route, keyboard, motion, content checks
public/
  favicon.svg                 # Original identity
  robots.txt                  # Or generated endpoint with the same policy
docs/                         # Architecture, evidence, deployment runbook
```

Avoid fragmenting every heading into a component. Extract only repeated responsibilities or behavior. Content queries and publication rules must be shared by Home excerpts, lists, detail pages, sitemap and RSS, so these surfaces cannot disagree.

| Proposed component | Input | Delivery |
| --- | --- | --- |
| BaseLayout / Header / Footer | Title, summary, canonical path, navigation | Astro HTML; small progressive menu/theme scripts |
| HomeHero | Profile and static illustration | Astro HTML; optional deferred scene import |
| ExperienceTimeline | Validated role records | Astro HTML; native disclosures for optional detail |
| ProjectRow / ProjectMetadata | Project collection entry | Astro HTML; no hydration for links or hover styling |
| ProjectLayout | Validated frontmatter and MDX body | Build-time rendering |
| ArticleList / Pagination | Published article records and page data | Astro HTML with ordinary anchors |
| ArticleLayout / TOC | Metadata, headings and article body | Astro HTML; anchor links, optional small scroll indicator |
| CodeBlock | Highlighted code and optional filename | Static `<pre><code>`; progressive copy script using a local reference |
| Figure / Media | Approved asset, alt, caption and dimensions | Optimized static images; controlled video only when needed |
| ThemeControl / MobileMenu | Named stateful controls | Prefer small script; React only when complexity warrants |
| ProjectFilter | Small verified inventory | Optional React island with static list fallback; deferred until useful |
| SystemsScene | Theme and preference state | Dynamic Three.js import, not part of article bundles |

## Content model

### Public portfolio records

Use plain typed values, not React nodes or imported icons. Validate with Zod at the build boundary and derive TS types from schemas where practical. Use explicit stable IDs and `satisfies` for authored TypeScript records. Separate site origin from person identity so URLs have one source of truth.

| Record | Fields and validation |
| --- | --- |
| Site | Absolute canonical origin, language, title pattern, default OG asset, navigation; staging indexing policy |
| Profile | Name, professional headline, short intro, approved biography, optional coarse location, approved contact links, portrait with alt; no private CV fields |
| Experience | ID, employer, title, start month `YYYY-MM`, nullable end month, contribution list, skill IDs, optional public employer URL, project IDs, provenance IDs |
| Education | ID, institution, qualification, supported date precision, optional public link and provenance IDs |
| Skill | ID, label, category, optional related role/project IDs; no invented percentage ratings |
| Source | ID, public URL or safe source descriptor, checked date, verification state; never CV raw excerpts or confidential evidence |

Allow month, year, or undated precision where evidence supports it; do not synthesize exact dates from a year. A missing end date means “Present” only when current employment is confirmed. Empty optional fields render no invented placeholder fact.

For private CV provenance, store only a descriptor such as `cv-professional-review` and verification date. Raw extraction, CV XML, private quotations, contact details awaiting approval, and original CV stay out of Git, public assets, tests and screenshots.

### Project collection

Each project has one MDX record. Lists read its frontmatter; detail pages render its body. Do not maintain duplicate project metadata in a separate portfolio array.

Proposed frontmatter fields:

- `title`, `summary`, stable entry slug/ID, `featured`, `order`.
- `kind`: `personal | open-source | professional | academic`.
- `role`, contribution summary, optional employer/context; require professional contribution wording for employer work.
- `status`: publication state such as `draft | published`; separately model project lifecycle if needed.
- Optional evidence-supported date/date range with its precision, `stack` as semantic IDs, topics.
- Optional cover asset with alt, caption and attribution; don't require a fake screenshot to satisfy the schema.
- Optional links `{ label, kind, url }`, with kind such as `source | demo | employer` and safe protocol validation.
- `sourceIds`, `verifiedAt`, and an explicit public-content review state.

Refine the schema: professional projects require employer/contribution context; links must use approved protocols; slugs must be unique and safe; featured published projects require a verified summary. A source repository proves code exists, not sole ownership, production deployment, adoption, or business results.

Case study body template: context → problem → personal role → constraints → selected decisions and alternatives → implementation/architecture → evidenced results or qualitative lessons → tradeoffs → links. Unverified metrics are omitted. Illustrative diagrams must say what they represent and must not imply access to confidential architecture.

### Blog collection

Independent records with `title`, `summary`, validated `publishedAt`, optional `updatedAt`, `authorId`, topics, optional image with alt, `draft` defaulting true for new content, and optional related project IDs. Validate dates, require modification date not earlier than publication, and derive reading estimates/headings at build time.

Use date-only `YYYY-MM-DD` parsing with an explicit UTC convention. Sort by publication date then stable ID. Render stable absolute dates using `<time datetime>`. Article bodies begin at h2; the layout owns h1. Existing sample posts remain template material until separately reviewed for authorship, correctness and reuse.

[Astro content collections](https://docs.astro.build/en/guides/content-collections/) support schema validation and typed queries. Verify implementation details against the installed Astro 6 types; current online documentation may describe newer releases too.

### Publication policy

Centralize `getPublishedProjects()` and `getPublishedPosts()` rather than implementing filtering separately per route. Exclude drafts, future scheduled posts until their date, and unreviewed records from lists, static paths, RSS and sitemap. A scheduled post requires a later rebuild to appear on a static site. Slug changes require an explicit redirect map and broken-link review.

Production content may use verified, public-safe facts only. The schema should fail closed for incomplete public records. Draft previews, if needed, are a local development feature and must not generate production pages.

## Static migration and delivery architecture

1. Replace runtime blog query pagination with `/blog/` and generated `/blog/page/2/` etc. Use shared page size; define empty archive behavior. [Astro routing/pagination](https://docs.astro.build/en/guides/routing/#pagination).
2. Replace client-only page assembly with prerendered Astro markup before removing its dependencies.
3. Set static output; remove Cloudflare adapter/Worker configuration and type generation only after all runtime dependencies have been removed.
4. Use local build-time image optimization suitable for static hosting. Remove reliance on Cloudflare Images and prohibit remote image fetching as a runtime requirement.
5. Transfer response-security headers from Astro middleware into the reviewed Nginx configuration. HTML response headers are deployment concerns in this architecture.
6. Keep generated HTML, CSS, JS and approved public assets in the deploy artifact; never copy the source tree, `.env`, private references or `.git` to the web root.

## SEO and VPS strategy

One URL utility constructs canonical and absolute image URLs from the confirmed production origin. Metadata includes per-page titles/summaries, OG images with dimensions/alt, article OG type, and optional verified social handles. Use Person/WebSite data for verified profile identity, BlogPosting for articles, and breadcrumbs for details; never publish unsupported awards or employer relationships in JSON-LD. Serialize JSON-LD safely. Exclude error and draft pages from discovery surfaces.

Prepare a later deployment runbook: pinned local/CI toolchain → frozen install → check/test/build → artifact review → explicit user approval → upload to a versioned release directory on the Linux VPS → validate Nginx config → switch release symlink atomically → smoke checks → retain previous release for rollback. SSH credentials remain in private configuration and never in documents or logs.

Nginx should serve static directories, use the custom error document, provide TLS and compression, set security headers consistently on HTML/errors/assets, cache hashed `_astro` assets immutably, and allow HTML to revalidate. Do not use an SPA fallback to Home. Validate actual installed Nginx modules/version when deployment work is authorized. [Nginx core directives](https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page).

A deployment outline, not an active config:

```nginx
# Illustrative routing only; final root/TLS/headers reviewed in deployment phase.
location / {
    try_files $uri $uri/ =404;
}
error_page 404 /404.html;
location = /404.html {
    internal;
}
```

Keeping 404 internal is an optional policy; the final preview tests must align with it. Keep the 404 status rather than changing it to 200. Review Nginx `add_header` inheritance and `always` behavior before introducing per-location cache headers. Prepare CSP around actual shipped scripts/styles, including the theme startup script and dynamic style needs; don't promise a restrictive policy without testing it. No server has been inspected or modified during this audit.

## Architecture acceptance

The later implementation is acceptable when all public routes render static readable content; public records contain no JSX/private fields; project metadata has one source; drafts never leak; normal navigation works without JavaScript; deployment requires no Cloudflare runtime; and unknown routes remain HTTP 404. Phase-specific risks and verification gates are in [05-implementation-plan.md](05-implementation-plan.md).

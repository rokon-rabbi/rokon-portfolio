# Rokon portfolio

Portfolio and engineering blog for **Md. Rokonuzzaman**, Full-Stack Software Engineer. Built with Astro 7, TypeScript, React, Tailwind CSS 4, and MDX, starting from [Starfolio](https://github.com/webrating/starfolio).

The professional content foundation, visual design system, homepage, sticky navigation, project portfolio, case-study routes, GSAP motion system, isolated Three.js hero, engineering publication, About and Contact pages, and public resume are implemented. Contact email and LinkedIn destinations remain pending. The production build is fully static, including publication routes and resume downloads. It emits crawler files, structured data, raster social previews, and CSP/security-header artifacts. Production deployment remains a separate step.

For the Linux VPS, serve `dist/client` with Nginx and keep the generated CSP/routing includes outside the web root. No Cloudflare adapter or Node application server is required. Build with your confirmed `PUBLIC_SITE_URL`, then prepare local configuration with `pnpm prepare:vps --release-root /srv/www/rokon/releases/RELEASE`. See [the static VPS architecture and runbook](docs/16-static-vps-hosting.md) before using the output. `pnpm check:vps` runs real Nginx and Playwright on localhost; Docker is a QA dependency only.

For versioned releases, atomic activation and rollback, use [the production deployment guide](deploy/README.md). Its scripts default to previewing a plan and require explicit activation hooks. The guide keeps server-specific values as placeholders pending the VPS inventory; no remote deployment has been performed.

## Local development

Use Node.js 22.12 or newer and pnpm 12.6.0 with the checked-in lockfile.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

pnpm 12.6.0 is pinned in `packageManager`. Dependency build permissions and narrow security overrides live in `pnpm-workspace.yaml`; the frozen install and audited lockfile have been verified.

```sh
pnpm check:content
pnpm check:design
pnpm check:work
pnpm check:motion
pnpm check:hero
pnpm check:blog
pnpm check:resume
pnpm exec astro check
pnpm exec tsc --noEmit
pnpm build
pnpm check:work:routes
pnpm check:blog:routes
pnpm check:profile:routes
pnpm check:production
pnpm analyze:bundles
```

`check:content` runs Node's test API directly so every assertion also executes in environments that restrict isolated test workers. It checks schemas, attribution, private-field rejection, project publication, blog scheduling, and calendar dates.

## Content editing

| Location | Responsibility |
| --- | --- |
| `src/data/profile.ts` | Public identity, summary, technical highlights, and approved contacts |
| `src/data/experience.ts` | Employer roles, month-precision dates, and contributions |
| `src/data/skills.ts` | User-confirmed core technology groups |
| `src/data/projects.ts` | Separate personal projects and employer contributions; publication state and case-study preparation |
| `src/data/case-studies.ts` | Sourced case-study sections, diagrams, approved media, code references, metrics, and explicit gaps |
| `src/lib/work.ts` | Shared portfolio, static-path, brief, and related-project selection |
| `src/data/sources.ts` | Evidence IDs, reviewed URLs, dates, and claim boundaries |
| `src/data/about.ts` | About copy, development interests, and confirmed education details |
| `src/data/contact.ts` | Validated public email and exact LinkedIn profile URL; null destinations are omitted |
| `src/lib/public-resume.ts` | Explicit professional-only resume projection shared by HTML, PDF, and text |
| `src/schemas/` | Runtime validation and inferred content types |
| `src/data/resume.tsx` | Compatibility facade for existing consumers; no JSX or UI imports |
| `src/lib/portfolio-content.ts` | Build-time portfolio and relationship validation |
| `src/content/blog/` | Original sample MDX articles awaiting text review, with drafts enabled by default |
| `src/lib/blog.ts` | Shared published-post selection for archive and article routes |

Keep claims within their source's scope. Draft and unverified projects are excluded from published selection. CourseFlow remains a draft, with an explicitly opted-in, identity-only brief at `/work/courseflow`; it is `noindex`, excluded from the sitemap, and absent from the homepage's featured projects. Draft and future articles are excluded from archive queries and generated article paths.

Only GitHub is currently supplied as a public contact. `PUBLIC_SITE_URL` can override the previously supplied portfolio origin during a build; the final production origin remains unconfirmed. Keep local overrides in ignored environment files.

Review the three unpublished engineering samples at `/preview/blog/<slug>` with `pnpm dev`. These previews generate no production paths. The public archive, article/tag routes, metadata search index, RSS, and homepage share one publication gate. See [the publication guide](docs/12-engineering-publication.md) for frontmatter, draft review, and browser QA instructions.

The original CV belongs at `reference/private/cv.docx`, which is ignored by Git. It is currently missing. Never move it into `public/` or add a raw CV download. Original template articles and media are retained under `reference/template/`, outside the collection and public assets.

The public resume at `/resume` uses confirmed professional records and the supplied NSTU institution, with actual PDF and text downloads generated during the build. Unknown degree/dates and unsupplied email/LinkedIn are omitted. See [About, Contact, and resume](docs/13-about-contact-resume.md) for evidence, privacy, and verification details.

## Documentation

- [Audit](docs/01-audit.md), [architecture](docs/02-architecture.md), and [design blueprint](docs/03-design-blueprint.md)
- [Audit content inventory](docs/04-content-inventory.md) and [implementation plan](docs/05-implementation-plan.md)
- [Implemented content, claim sources, verification, and outstanding details](docs/06-content-foundation.md)
- [Design tokens, component conventions, contrast, and previews](docs/07-design-system.md)
- [Homepage composition, navigation, routes, and reviewed previews](docs/08-homepage-redesign.md)
- [Project routes, structured case studies, media conventions, and tests](docs/09-project-portfolio.md)
- [Motion presets, annotations, lifecycle, accessibility, and browser verification](docs/10-motion-system.md)
- [Three.js hero, performance budgets, fallback strategy, and browser verification](docs/11-three-hero.md)
- [Engineering publication, frontmatter, draft review, discovery, and browser verification](docs/12-engineering-publication.md)
- [About, Contact, professional resume exports, privacy, and accessibility](docs/13-about-contact-resume.md)
- [Production hardening, measured Lighthouse results, browser checks, deployment headers, and limitations](docs/14-production-hardening.md)
- [Responsive and interaction QA, cross-browser results, screenshots, and reproduction](docs/15-responsive-interaction-qa.md)
- [Static production route audit, Linux VPS/Nginx configuration, artifact layout, and hosting verification](docs/16-static-vps-hosting.md)
- [GitHub Actions CI/CD, production approval, SSH secrets, release retention and rollback](deploy/CI-CD.md)

Review the component gallery at `/design-system` in local preview. It includes both themes, accessible tabs and filters, form states, badges, project rows, and loading/empty patterns.

## Attribution

Derived from Starfolio by WebsiteRating / webrating. Preserve the upstream copyright notice and [MIT license](LICENSE). Archived examples remain reference material and are not attributed to Rokon.

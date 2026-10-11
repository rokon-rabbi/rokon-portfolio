# 09 — Project portfolio and case studies

Implemented 2026-10-10. Uses the approved semantic tokens, typography, shared navigation, and theme behavior. All work pages are prerendered; no React hydration or additional animation dependency is introduced. The existing Cloudflare adapter and server-rendered blog remain in place.

Subsequent stage: the shared [motion system](10-motion-system.md) now progressively enhances these pages with GSAP, without adding React hydration.

## Public routes and content boundaries

| Route | Content and publication |
| --- | --- |
| `/work` | Two repository-backed projects, a separately labeled CourseFlow brief, and approved employer experience summaries in a distinct section |
| `/work/community-driven-social-volunteering-platform` | Partial case study supported by the confirmed project identity, README, dependency manifests, and event/help-request controllers |
| `/work/chemistry-calculator` | Partial repository study, visibly credited as a fork of IIT-NSTU/chemistry-calculator; individual changes remain unverified |
| `/work/courseflow` | Explicit project brief; `noindex`, excluded from sitemap; name and personal-project attribution only |

The user requested CourseFlow among the initial projects and asked for missing details to be flagged. Its record therefore remains an unverified draft with an explicit `caseStudy.publicPreview` opt-in. It does not become a published project, enter the homepage's featured selection, or acquire invented features. Ordinary drafts remain inaccessible. The Work collection, header, footer, and homepage now link to the new portfolio routes.

Employer-related records never generate `/work/[slug]` routes. Their expanded case-study data must remain planned and empty of claims, diagrams, screenshots, code, and metrics. The portfolio only presents existing, approved experience summaries and links back to the employment timeline. Unknown and employer project slugs use the existing 404 page.

## Structured content

`src/data/projects.ts` remains the project identity, publication, attribution, technology, and verified-link source. Its `caseStudy` field now consumes structured records from `src/data/case-studies.ts`. `ProjectSchema` validates the complete record; there is no independent case-study publication system.

Every case study has seven typed sections: `problem`, `role`, `architecture`, `decisions`, `features`, `challenges`, and `lessons`. Titles live in `src/lib/work.ts`; the same selectors produce the index, static paths, and related navigation.

| Field | Convention |
| --- | --- |
| `status` | `planned`, `partial`, or `ready`. Ready requires verified content in every section. Planned permits only missing-section notes. |
| `publicPreview` | Explicit, identity-only opt-in for an unverified personal draft. Never allowed for employer records. |
| `sections` | All seven section IDs exactly once; `verified` requires sourced claims, `partial` requires claims plus `missingDetails`, and `missing` requires an empty claim list plus a useful explanation. |
| `claims[].sourceIds` | IDs from the existing provenance registry; unknown IDs fail validation. Repository observations do not establish individual authorship or tested runtime behavior. |
| `diagram` | Title, caption, labeled nodes with details, and labeled edges; every node/edge carries provenance. Node IDs are unique; edges connect distinct existing nodes. |
| `media` | Approved screenshot/diagram assets, with ID, local path, alt text, caption, credit, intrinsic dimensions, public clearance, and provenance. IDs must be unique. |
| `codeSamples` | ID, title, language, escaped plain-text code, caption, and provenance. Samples are source references; no live API console is implied. |
| `metrics` | Label, value, context, and provenance. No current project has verified metrics. Only supplied metrics render. |

For example, after verifying an asset and its publication rights, a media entry can use this shape:

```ts
{
  id: "event-discovery",
  kind: "screenshot",
  src: "/projects/volunteering/event-discovery.webp",
  alt: "Describe the actual interface and relevant workflow",
  caption: "Describe what this verified image demonstrates",
  credit: "Record the actual creator and attribution",
  width: 1600,
  height: 1000,
  clearance: "public",
  sourceIds: ["user-content-brief"], // Use the actual confirming evidence ID.
}
```

This is a shape example, not an existing image. Add the real asset under `public/projects/` and register its evidence before adding a record. Remote URLs, traversal paths, private clearance, missing alt text, and nonpositive dimensions are rejected. The Astro `rokon-project-assets` integration checks existence, regular-file status, and resolved containment in the public directory during Node configuration. Filesystem checks stay outside Cloudflare's Worker prerenderer. Missing assets stop development/build configuration instead of producing broken image links.

The first approved screenshot becomes the case-study cover. Remaining screenshots and image diagrams appear in the features section. Without a screenshot, the existing original feature illustration remains the cover. Images reserve their intrinsic aspect ratio and use lazy loading. A responsive, semantic architecture diagram can be supplied independently of raster images.

## Evidence and missing details

The volunteering system sketch shows the documented React client, Spring Boot APIs, and PostgreSQL persistence. It is labeled as a repository-level conceptual diagram, with no deployment topology or operational claims. Controller code takes precedence over the README: help-request status updates use `PATCH`, although the README describes `GET`.

The chemistry diagram shows the Swing interface, calculation panels, and supporting Java calculation classes. The additional `chemistry-panels` evidence record references the reviewed EquationBalancePanel and MolarMassPanel at the existing pinned commit. Observed source error handling is distinguished from a personal challenge/solution story; no scientific-accuracy claim is introduced.

Both studies identify missing exact contributions, decision rationale, firsthand challenges or lessons, product screenshots, demo links, and measured outcomes. Their repository links and source references are available for review. CourseFlow has no confirmed repository, technologies, features, media, metrics, or implementation ownership beyond its listed personal-project identity.

## Presentation and accessibility

- Full-width editorial headers lead with project identity, attribution, evidence level, and contribution status. Large covers are clearly labeled illustrations until real approved screenshots exist.
- The desktop reading layout places a sticky contents navigation beside a bounded prose column. On mobile the contents links form two columns, followed by the full study. Section targets clear the sticky header.
- Architecture nodes and connections are semantic lists with readable labels. They stack on small screens and use three columns where space allows. Connections are described in text as well as visually.
- Code scrolls inside a keyboard-focusable `pre`, preserving the page's mobile width. Source references use native disclosures with accessible keyboard behavior.
- Related navigation excludes the current project, unverified briefs, and employer records. Published work remains linked from every completed route.
- `src/styles/work.css` adds composition classes in the existing `components` layer and consumes the shared semantic variables. It defines no color tokens, theme provider, or second design system.

## Verification

```sh
pnpm check:content
pnpm check:design
pnpm check:work
pnpm exec tsc --noEmit
pnpm exec astro check
pnpm build
pnpm check:work:routes
```

The content/render tests exercise actual schemas, publication selectors, server-rendered components, and media-file validation. The route tests inspect the generated Astro HTML: static path inventory, metadata, landmarks, ID/label references, internal links, fragment targets, source-backed chapters, fork attribution, sitemap exclusion, and the absence of employer case-study pages.

`pnpm check:work:browser` runs the additional Chrome/CDP review. Start the local server on `127.0.0.1:4321` and Chrome with a page target and remote debugging on port 9333 before running it. The script uses Node's built-in WebSocket API and requires no browser automation dependency. It verifies live route statuses, current navigation, both themes at 320/390/768/1024/1440px, normal-text contrast, section anchors, keyboard menu/source/code behavior, reduced motion, and no-JavaScript content. It saves captures and results under `docs/work-previews/`.

Production builds retain the expected notice about the empty original-article collection. No template content, speculative outcomes, or confidential employer implementation details are introduced.

Completed checks:

| Check | Result |
| --- | --- |
| `pnpm check:content` | 16 tests passed |
| `pnpm check:design` | 10 tests passed |
| `pnpm check:work` | 14 tests passed |
| `pnpm check:work:routes` | 10 tests passed against the production build |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm exec astro check` | 96 files; zero errors, warnings, or hints |
| `pnpm build` | Passed; all four work routes prerendered |
| Chrome/CDP review | 12 checks passed; zero browser exceptions |
| `git diff --check` | Passed |

Rendered normal-text contrast meets 4.5:1 in both themes on every work route: the lowest measured ratio is **4.553:1 in light** and **7.656:1 in dark**. Reflow checks passed at all five tested widths. The [browser report](work-previews/qa-results.json) includes the individual page measurements.

Reviewed previews: [dark portfolio](work-previews/work-dark.png), [light portfolio](work-previews/work-light.png), [mobile portfolio](work-previews/work-mobile-dark.png), [volunteering header](work-previews/volunteering-header-dark.png), [dark architecture](work-previews/volunteering-architecture-dark.png), [light architecture](work-previews/volunteering-architecture-light.png), [mobile architecture](work-previews/volunteering-architecture-mobile-light.png), [chemistry header](work-previews/chemistry-header-light.png), [mobile code](work-previews/chemistry-code-mobile-light.png), [CourseFlow brief](work-previews/courseflow-brief-dark.png), and [mobile navigation](work-previews/work-navigation-mobile-light.png).

# 08 — Homepage and navigation

The [subsequent project portfolio stage](09-project-portfolio.md) adds `/work` and project-detail routes, updates shared Work navigation, and connects homepage project links to the new case studies.

Implemented 2026-10-10, using the approved [design system](07-design-system.md). This stage redesigns the homepage and shared navigation. The current Astro/Cloudflare rendering architecture remains in place.

## Composition

The hero identifies Md. Rokonuzzaman as a Full-Stack Software Engineer before the large editorial heading, “Reliable systems. Thoughtful experiences.” This is positioning inspired by the user's homepage brief, rather than a claim about measured reliability. The introduction and selected capabilities derive from the verified profile. Primary navigation leads to selected work; the secondary CTA opens the existing blog. The quieter contact link provides the requested résumé/contact option without inventing a résumé download or an email address.

The seven sections follow the requested order:

| Anchor | Composition and content |
| --- | --- |
| `/#projects` | Two large feature illustrations paired with sourced summaries, technical context, technology badges, attribution, and repository links. Alternating desktop composition; preview first on mobile. |
| `/#work` | Visible employment timeline, month-precision dates, role, employer, and all verified contributions. Employer work is distinct from personal projects. |
| `/#capabilities` | Four numbered editorial rows explaining interface work, APIs, data/search/asynchronous processing, and delivery workflows. Copy derives from profile highlights and experience; no employer-specific technology assignments are introduced. |
| `/#skills` | A solid muted surface containing four readable technology lists, with no unsupported proficiency scores or certification claims. |
| `/#writing` | Up to three published articles, selected through the same publication policy as the blog. Currently shows an honest empty state and a project link. |
| `/#about` | Verified biography beside an original typographic monogram and GitHub profile link. |
| `/#contact` | Oversized closing typography, a restrained connection motif, and the approved GitHub contact. Followed by the shared footer. |

## Component conventions

- `HomePage` remains server-rendered React without a client hydration directive. `index.astro` selects published posts and passes only their preview fields. Drafts, future articles, and unverified projects do not become home content.
- `FeaturedProject` is the homepage's large editorial composition. `ProjectCard` remains the compact design-system specimen. Both consume the existing validated project records.
- `ProjectPreview` uses original CSS geometry and real feature labels. Illustrations are explicitly labeled as feature illustrations; they are not screenshots or employer architecture diagrams. New project IDs receive a neutral conceptual fallback until a specific illustration is added.
- Chemistry Calculator remains visibly attributed as a fork, with its upstream repository link. Repository features are not presented as verified individual contributions.
- `SectionHeading` accepts an optional heading ID for labeled sections. `BlogCard` accepts `headingLevel="h3"` inside a homepage section; its archive default stays `h2`.
- New composition classes consume the existing semantic theme variables and shared Button primitive. There is no second palette, theme controller, or CSS framework.
- The home display size is `clamp(3rem, 6.4vw, 6.125rem)` with a 1.02 line height. Wide layouts use a 1.35:1 hero ratio and alternating 1.2:1 project layouts. Below 64rem, these compositions stack; technology lists step from one to two to four columns.
- Preview borders, warm SVG ornament, connection lines, and monograms are decorative. Meaningful project text remains available outside the decorative diagrams.

## Future hero scene

`.hero-stage[data-hero-stage="static"]` reserves the scene's dedicated layout area. The original `SystemAssembly` figure supplies a complete static fallback. A later 3D implementation can mount inside this wrapper while preserving its dimensions, fallback, and decorative semantics. This stage adds no canvas, Three.js, GSAP, render loop, or animation dependency.

## Navigation and accessibility

The shared header is sticky with a solid themed background and a thin border. It stays six rem high. Root scroll padding is 7.5rem; section scroll margin adds 1.5rem, so fragment targets clear the header. The mobile panel sits beneath it, scrolls within the remaining dynamic viewport height, and contains ordinary links.

Mobile navigation uses native `details`/`summary`, so disclosure remains usable without JavaScript. Enhancement closes it on link selection, outside click, focus leaving the menu, Escape, or entering the desktop breakpoint. Escape restores focus to the disclosure. A focused mobile control moves to the visible brand when desktop layout hides the menu; focus ownership is tracked because Chrome can blur hidden controls before the media-change event.

All controls retain the design system's visible focus treatment and minimum touch targets. The skip link, shared landmarks, theme bootstrap, reduced-motion behavior, and no-JavaScript system-theme fallback remain in use.

## Routes and review

| Route | Rendering / purpose |
| --- | --- |
| `/` | Prerendered homepage |
| `/blog` | Existing server-rendered article archive, currently empty |
| `/blog/[slug]` | Prerendered published articles; currently no published entries, so no article URLs are generated |
| `/design-system/` | Prerendered component gallery, `noindex`, excluded from sitemap |
| `/404` and unknown paths | Custom recovery page; unknown paths return HTTP 404 |

There are no dedicated project, experience, about, or contact routes in this stage. Shared navigation uses real homepage anchors from every page. External source links retain descriptive accessible names and `noopener noreferrer`.

Reviewed captures are in [homepage-previews](homepage-previews/): [dark hero](homepage-previews/overview-dark.png), [light hero](homepage-previews/overview-light.png), [mobile hero](homepage-previews/overview-mobile-dark.png), [dark projects](homepage-previews/projects-dark.png), [light projects](homepage-previews/projects-light.png), [mobile projects](homepage-previews/projects-mobile-dark.png), [mobile menu](homepage-previews/navigation-mobile-dark.png), [capabilities](homepage-previews/capabilities-dark.png), and [contact](homepage-previews/contact-dark.png).

Browser verification results are recorded in [qa-results.json](homepage-previews/qa-results.json). The rendered homepage's smallest audited normal-text contrast is **4.553:1 in light** and **7.656:1 in dark**. Token-level checks additionally cover the interaction states and focus boundaries. Responsive checks cover 320, 390, 768, 1024, and 1440 pixels in both themes.

Completed validation:

| Check | Result |
| --- | --- |
| `pnpm check:content` | 16 tests passed |
| `pnpm check:design` | 10 tests passed |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm exec astro check` | 84 files; zero errors, diagnostic warnings, or hints |
| `pnpm build` | Passed; generated homepage, gallery, and 404, with the existing server blog route retained |
| Chrome browser audit | 22 checks passed; zero browser exceptions |
| Generated HTML audit | Single landmarks/h1, unique IDs, valid labeled-section references, and all internal links/anchors resolve across generated pages; draft project absent; two self-hosted font files |
| `git diff --check` | Passed |

The build reports the expected empty-blog collection notice because there are currently no original MDX posts. Browser checks verify `/`, `/blog`, and `/design-system/` return 200 and an unknown path returns 404. The homepage requires no React hydration island.

The public content still needs an approved résumé asset and original articles before those can be presented. These do not prevent the current contact and writing sections from being complete and usable.

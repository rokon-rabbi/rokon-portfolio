# 03 — Design blueprint: Systems in Motion

Status: proposed creative direction, 2026-10-10. No new UI, animation or imagery has been implemented. Professional copy awaits source verification.

## Observations versus ideas

Verified repository observations: the supplied Starfolio preview shows a narrow dark column, compact profile avatar, repeated headings/pills, project cards, photo grid and icon dock. Source code adds blur reveals and a flickering canvas. The neutral palette and local fonts are useful; the overall composition still resembles a template.

Reference review was limited to retrievable text:

- [Barlas Apaydin portfolio](https://www.barlasapaydin.com/#!/blog): Projects/Blog/About/Contact navigation and categorized projects are observable. Live motion, colors, spatial transitions and aquarium rendering were not visually assessed.
- [Figma color combinations](https://www.figma.com/resource-library/color-combinations/): discusses color harmony and palette families. It supplies general color-theory context, not an automatically accessible palette for this project.
- [Previous portfolio](https://rokonuzzaaman.web.app/): could not be retrieved; no design observations are claimed.

The editorial grid, proposed colors, signature visual, page layouts and timings below are original proposals. They are not descriptions copied from inaccessible references. Full access notes are in [04-content-inventory.md](04-content-inventory.md).

## Design intent

Make engineering work legible through composition: clear structure, visible constraints, deliberate connections and precise movement. Visitors should understand who Rokon is, which problems he has worked on, and how he approaches engineering before encountering visual flourishes.

Use an architectural grid, prominent editorial headings, generous spacing, compact technical labels, calm surfaces, and original diagrams. Let Home be expressive; let articles be quiet. Project detail pages should demonstrate engineering reasoning through narrative and evidence.

## Proposed visual system

### Color

Start with warm paper and deep ink, supported by a teal signal color and a restrained copper illustration accent. Dark mode uses a warm charcoal foundation. These starting values are candidates, not verified contrast results.

| Role | Light candidate | Dark candidate | Usage |
| --- | --- | --- | --- |
| Background | `#F6F3EC` | `#141B1D` | Main canvas |
| Surface | `#FFFDFA` | `#1D272A` | Occasional inset content |
| Text | `#172B2F` | `#F3F0E8` | Reading and headings |
| Muted text | `#526166` | `#B8C2C0` | Secondary metadata; validate before use |
| Signal | `#0B6B61` | `#82CDBF` | Links, selected state, key diagram paths |
| Copper | `#A1492B` | `#E7A58A` | Sparse diagram annotations/ornament |
| Border | `#CBCFC7` | `#415154` | Structural separation; don't assume control contrast |

Create semantic tokens for text, interactive text, focused outlines, surfaces, borders and syntax; avoid sprinkling raw hex values through components. Measure every text/background combination and every control boundary in both themes. Selected/error states use labels or icons in addition to color. Gradients are localized to illustration shading; reading surfaces remain solid. Theme preference follows saved choice, otherwise OS choice, consistently from first paint.

### Typography and spacing

Retain Outfit Variable and Geist Mono for the initial prototype, evaluating whether Outfit has sufficient editorial character without adding another font family. Use weight, scale and layout before considering a replacement. Any new font must be self-hosted, appropriately licensed, and measured.

Proposed scale: body 16–18px with 1.6–1.75 line height; article measure 65–72 characters; responsive hero roughly 44–88px; page headings 36–64px; metadata 12–14px. Use `clamp()` for fluid heading sizes without shrinking body text on small screens. Monospace is for dates, numbered indices, technology labels and code, not long paragraphs.

Use a 4px-based spacing system with common steps 8, 12, 16, 24, 32, 48, 64, 96. Main layout max width around 1200–1280px; article text remains narrower. Section spacing scales between roughly 56 and 112px. Borders, offsets and typography should carry hierarchy without converting every block into a rounded card.

### Illustration and assets

Create a native SVG “system assembly”: a few bounded modules linked by intentional paths, with dimensional planes or an exploded stack. Use authentic abstract engineering concepts, not made-up employer systems. Label it as an illustrative systems diagram when needed.

The Home 3D enhancement uses the same visual language, so its static fallback is designed first. Prefer code-native SVG/CSS for diagrams and Three.js primitives for the optional scene. Real project images require provenance and permission; abstract diagrams must not masquerade as screenshots. Use a genuine approved portrait only if available. No invented client logos, awards, screenshots or testimonials.

## Page composition

| Page | Proposed composition | Important behavior |
| --- | --- | --- |
| Home | Small identity header; asymmetric hero with text and assembly visual; selected project rows; concise experience band; writing list; contact invitation | Meaningful professional content in first screen; ordinary links to details |
| About | Editorial introduction beside compact profile metadata; approach/principles; skills grounded in work; education | Keep biography concise and evidence-based; no decorative skill percentages |
| Experience | Clear chronological timeline with dates in a side column; responsibilities and contributions in the main column | Key facts visible; optional details disclosure never hides all evidence |
| Projects | Large title and short intent; numbered rows pairing summary/role with genuine media or diagram | Personal and professional work visibly distinguished; optional filters only for a useful inventory |
| Project Details | Title, role and ownership context; problem and constraints; architecture figure; decision narrative; evidence/lessons; related content | No stock dashboard image presented as project proof |
| Blog | Calm editorial index: titles, short summaries, dates/topics, ample row separation | Semantic page links and static pagination |
| Blog Article | Breadcrumb/back link; title, summary and byline; narrow prose; code/figures; optional TOC; related writing | Code copy works; tables scroll within their region; no animated text entrance |
| Contact | Direct purpose statement; verified email and GitHub/LinkedIn if supplied; secondary navigation | No fake response-time or availability promise |
| 404 | Distinct static disconnected-path motif, readable error text and recovery links | Actual 404 status, noindex, no animated obstacle |

Writing examples such as “systems,” “engineering,” or “selected work” are labels, not verified claims about particular expertise. Final hero copy must reflect confirmed experience rather than inventing a seniority or technology specialization.

## Animation strategy

Progressive enhancement is mandatory: render visible content first; activate optional motion after loading and preference checks. Use CSS for simple hover/focus states and GSAP/ScrollTrigger for a few deliberate sequences. Remove the existing broad Motion reveal wrappers when migrating; don't maintain two general-purpose animation engines without a specific need.

| Interaction | Proposed motion | Limits / fallback |
| --- | --- | --- |
| Link / button | 120–180ms color or underline transition | Same information and affordance on keyboard focus |
| Section visual | Once-only 8–16px translation with opacity, 300–500ms | Primary prose stays visible; bypass for reduced motion |
| Home assembly | Short sequence showing modules align | No prolonged intro or loading gate |
| Project illustration | Small path/plane emphasis on hover/focus | No pointer requirement to discover information |
| Scroll sequence | A single optional Home illustration sequence driven by ScrollTrigger | No scroll hijacking, no critical text pinning, no horizontal reading path |
| Theme switch | Immediate state change with restrained optional transition | Preference and labels synchronized; avoid flash |
| Mobile menu | Brief opacity/translation if useful | Named controls, deterministic focus behavior; immediate with reduced motion |

Use `gsap.matchMedia()` for breakpoint and motion conditions and its cleanup model for scoped effects. Keep timelines tied to components/containers and revert listeners/tweens on teardown. Refresh measurements after fonts/assets settle. [GSAP matchMedia documentation](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/).

`prefers-reduced-motion: reduce` removes reveals, parallax, auto-rotation and nonessential smooth scrolling. Preference changes during a session must also stop motion. Avoid permanent `opacity: 0` in server-rendered markup and avoid animating filters/large blur areas. No custom cursor or noisy particles are planned.

### Three.js scope

One scene on Home, representing a small modular system assembly. Use a handful of primitive geometries and restrained materials, no large textures, heavy postprocessing, model downloads or mandatory orbit controls.

Load dynamically only after the static hero and primary content are available and the visual approaches the viewport. Respect reduced motion and supported data-saving signals; use the static fallback for unavailable WebGL, context loss or initialization failure. Cap device pixel ratio around 1.5 and rendering around 30fps when animation is active. Prefer on-demand rendering after the initial sequence; pause when offscreen or the document is hidden.

Canvas is decorative and non-focusable; the adjacent accessible content carries any meaning. Release geometries/materials/textures and the renderer when disposing the scene; remove resize/visibility listeners. [Three.js resource cleanup](https://threejs.org/manual/en/cleanup.html). Keep the scene bundle out of Blog, article and contact routes. No autoplay loop is necessary; if sustained movement is later chosen, provide a named pause control.

## Responsive strategy

Design mobile-first. Suggested layout bands, to be verified against real content: below 640px, 640–1023px, and 1024px upward. Use CSS rather than JS for reading-layout changes.

- Small: single column, 16–24px side padding; hero text first; visual below or reduced in size; text navigation via accessible disclosure/menu; dates stack above descriptions.
- Medium: restrained 6-column composition; two-column project rows where content remains comfortable; avoid arbitrary fixed heights.
- Large: 12-column grid with asymmetry; hero copy around 7 columns and visual 5; text measure remains constrained; TOC can sit beside article body.
- Test at widths 320, 375/390, 768, 1024, 1440 and 1920px, plus landscape and 200% zoom. Add 400% zoom/reflow assessment; code/table regions may scroll internally but the page should not scroll horizontally.
- Coarse pointers get stable controls; hover effects never reveal essential content. Images specify aspect ratios and intrinsic dimensions. Navigation survives long labels, missing images and increased text spacing.

## Accessibility requirements

Target WCAG 2.2 AA, verified through automated and manual checks; passing an automated scan alone is insufficient. [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Requirements: skip link; header/nav/main/footer landmarks; one descriptive page h1; logical headings; named controls and links; visible keyboard focus; meaningful current-page indication; correct expanded states; no keyboard traps; recovery of focus after menu closure; sufficient contrast; alt/captions appropriate to media; textual error/status feedback; responsive reflow; reduced-motion support.

Aim for 44×44px interactive targets where practical, exceeding the AA minimum target requirement. Ensure sticky headers and overlays do not obscure focused elements. Prefer a simple menu disclosure over a modal if its interaction doesn't require a focus trap. If a modal is used, manage focus, Escape, background inertness and return focus correctly.

Copy code uses a specific block reference, not `document.activeElement` heuristics. Report successful copying through a polite status region and provide useful failure feedback. Use `<time datetime>`, list semantics for timelines, and `<figure>/<figcaption>` for meaningful diagrams. Keep long code and tables usable by keyboard; provide video controls, captions/transcripts where relevant.

## SEO and performance requirements

SEO: one verified site origin, route-level title/summary/canonical, article-specific OG/JSON-LD, verified author/byline, sitemap and RSS filtered to published content, intentional 404 noindex, real social preview assets, and a sitemap-linked robots policy. Do not advertise example identities, fictional outcomes or private data through meta tags.

Performance targets are future budgets, not measured baseline scores:

| Measure | Target / evidence method |
| --- | --- |
| Core Web Vitals | LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile once field data exists |
| Lab checks | Median of three comparable mobile Lighthouse runs; aim performance ≥90, accessibility/SEO ≥95, with manual review of failures |
| Reading routes | Initial compressed JS budget ≤40 KiB across requested assets; avoid React/Three on ordinary articles |
| Home | Initial compressed JS ≤80 KiB; separate deferred 3D budget ≤180 KiB; report any exception with measurements |
| Fonts | Two families maximum initially; chosen subsets/styles only; avoid downloading unused subsets and preloading every face |
| Images | Responsive modern formats and dimensions; hero/LCP asset prioritized, below-fold media lazy-loaded; portrait roughly ≤150 KiB at intended display resolution |

The field thresholds follow [Core Web Vitals guidance](https://web.dev/articles/vitals). Lab runs cannot establish production INP or replace field data. Bundle budgets include shared chunks and framework runtime; measure actual page requests, not just a named component chunk. If the optional 3D scene exceeds its budget, reduce its features or retain the static illustration.

## Design acceptance

The result should look distinct through typography, grid and visual language without relying on motion. All routes must be readable without JS, in either theme, and with reduced motion. Projects must communicate verified role and reasoning. Test actual layouts and controls before claiming accessibility or performance success. The sequence and per-phase gates are in [05-implementation-plan.md](05-implementation-plan.md).

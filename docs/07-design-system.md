# 07 — Rokon / Systems in Motion

Implemented visual system, 2026-10-10. This document replaces the candidate palette in the earlier design blueprint. The user's supplied palette is the foundation. Professional facts and publication rules from the content stage remain in effect.

Review the live component gallery at `/design-system/` after `pnpm dev`. It demonstrates every requested component in the active theme and is marked `noindex` and excluded from the sitemap. Gallery article and input specimens are clearly labeled; they are not published articles or a contact service.

## Visual language

Deep blue ink and warm paper; mint as the interaction signal, periwinkle as a secondary signal, and a small warm illustration accent. Use editorial rows, asymmetric composition, numbered section markers, a wide grid, and narrow reading measures. The original vector system assembly connects geometric modules; it is an abstract illustration, not an employer architecture diagram or a project screenshot.

Project entries use an index/title/context column beside the summary, technical details, badges, and source links. Experience follows a quiet, visible timeline. Distinction comes from type, alignment, and whitespace rather than a grid of dashboard cards. Main surfaces are solid. There are no gradients, glows, glass panels, animated particles, or automatic decorative loops.

## Token ownership

`src/design/tokens.ts` is the single color source. `CONFIG.theme` references it; `THEME_CSS` serializes it to the existing shadcn custom-property names in the document head. `src/styles/global.css` maps those variables into Tailwind 4 using `@theme inline`. Both `bg-primary` utilities and the existing Button/Badge/Card primitives use these same variables. Color defaults no longer compete between CSS and configuration.

Use semantic utilities (`text-muted-foreground`, `bg-card`, `border-input`) or shared component classes. Do not put raw hex values in consumer components, apply opacity to reading colors, or create a second theme provider. The removed dock/navigation and next-themes wrapper are replaced by the native shared shell; unused dependencies are retained for a later tooling cleanup.

## Color tokens

| Token | Light | Dark | Convention |
| --- | --- | --- | --- |
| `background` | `#F7F8F5` | `#0B1020` | Page canvas |
| `foreground` | `#17212B` | `#F5F7FC` | Headings and primary reading text |
| `card` | `#FFFFFF` | `#121A2C` | Occasional inset surfaces and fields |
| `card-foreground` | `#17212B` | `#F5F7FC` | Text on card |
| `popover` | `#FFFFFF` | `#172239` | Mobile navigation and popovers |
| `popover-foreground` | `#17212B` | `#F5F7FC` | Text on popover |
| `primary` | `#087B69` | `#56D9BA` | Main action fill, links, section labels |
| `primary-foreground` | `#FFFFFF` | `#0B1020` | Text on primary fills |
| `primary-hover` | `#066858` | `#75E6CC` | Main action hover fill; retain primary-foreground |
| `secondary` | `#5365C9` | `#A4A8FF` | Secondary action fill and signal |
| `secondary-foreground` | `#FFFFFF` | `#0B1020` | Text on secondary fills |
| `secondary-hover` | `#4355B7` | `#BDC0FF` | Secondary action hover fill |
| `muted` | `#EEF1EC` | `#182338` | Badges, footer, calm inset surfaces |
| `muted-foreground` | `#53616C` | `#A9B6CA` | Metadata, secondary copy, placeholders |
| `accent` | `#EEF1EC` | `#1D3040` | Selection/hover surface |
| `accent-foreground` | `#17212B` | `#F5F7FC` | Text on accent surface |
| `surface-hover` | `#EEF1EC` | `#1A283E` | Neutral control hover |
| `border` | `#D2DAD2` | `#2D3B52` | Decorative separators, nonessential outlines |
| `input` | `#6F7D75` | `#7588A4` | Identifiable input and outline-control boundary |
| `ring` | `#087B69` | `#56D9BA` | Keyboard focus, with an offset |
| `destructive` | `#B42338` | `#FF8C9A` | Error text, error border, destructive fill |
| `destructive-foreground` | `#FFFFFF` | `#0B1020` | Text on destructive fills |
| `warm` | `#9A561B` | `#F4B875` | Accessible warm text if needed |
| `warm-decorative` | `#F4B875` | `#F4B875` | Sparse SVG ornament; never meaningful text |
| `disabled-background` | `#E4E8E2` | `#223049` | Inactive controls |
| `disabled-foreground` | `#53616C` | `#A9B6CA` | Legible inactive labels; no opacity reduction |
| `selection-background` | `#087B69` | `#56D9BA` | Text selection fill |
| `selection-foreground` | `#FFFFFF` | `#0B1020` | Selected text |

### Contrast contract

Normal text needs at least **4.5:1**, including placeholders and hover text. Control boundaries and focus indicators are checked at **3:1**. Follow the [W3C text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Divider borders and illustration marks are decorative; they are not substitutes for a control outline or meaningful labels.

Approved reading pairs are `foreground`, `muted-foreground`, `primary`, `secondary`, and `warm` on `background`, `card`, `popover`, `muted`, `accent`, and `surface-hover`. The smallest computed ratio across those pairs is **4.525:1 in light** (`secondary` on `muted`/`accent`/`surface-hover`) and **6.213:1 in dark** (`secondary` on `accent`). Do not mix reading colors with solid primary/secondary/destructive fills; use their dedicated foreground token.

| Text on page canvas | Light ratio | Dark ratio |
| --- | ---: | ---: |
| Main text | 15.29:1 | 17.66:1 |
| Muted text | 5.98:1 | 9.22:1 |
| Primary/link | 4.87:1 | 10.85:1 |
| Secondary | 4.84:1 | 8.68:1 |
| Accessible warm | 5.29:1 | 10.78:1 |

`pnpm check:design` computes relative sRGB luminance from the actual token source and tests all 60 approved reading combinations, ten foreground/fill states per theme, and the input/ring/error-border combinations against surrounding surfaces. It checks unrounded ratios. Inactive labels are tested at 4.5:1 as a readability convention even though inactive controls are exempt from that requirement. Warm decorative marks are intentionally excluded from text pairs.

## Typography

| Role | Family / weight | Size / line height | Usage |
| --- | --- | --- | --- |
| Display | Outfit Variable / 500 | `clamp(3.25rem, 8.5vw, 7.5rem)` / 0.99 | Hero; one expressive heading per page |
| Page/section heading | Outfit Variable / 500 | `clamp(2rem, 4.5vw, 4rem)` / 1.12 | Page title and major sections |
| Editorial title | Outfit Variable / 500 | `clamp(1.5rem, 2.8vw, 2.5rem)` / 1.12 | Project/blog titles |
| Body | Native system sans / 400 | `clamp(1rem, 0.94rem + 0.25vw, 1.125rem)` / 1.7 | Comfortable reading, descriptions |
| Body emphasis | Native system sans / 600 | Component body size | Labels and buttons |
| Metadata/eyebrow | Geist Mono Variable / 400 | 0.75rem / 1.6 | Dates, numbering, technical context |
| Technical badge | Geist Mono Variable / 400 | 0.6875rem / 1.65 | Short technology labels |
| Code | Geist Mono Variable / 400 | 0.85em inline; 0.875rem blocks | Scroll long blocks internally |

Body uses `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`. This gives readable native letterforms without a third font download; its exact appearance depends on the platform. Outfit and Geist Mono are self-hosted Latin variable WOFF2 files with `font-display: swap`. Only those two font files are declared. Keep body text out of the display and mono families. Body starts at 1rem; the root stays at 100% to respect browser size settings.

Display tracking is −0.055em; headings −0.035em. Eyebrows use 0.13em uppercase tracking; ordinary metadata uses 0.04em. Do not uppercase long prose. Semantic headings use h1–h3 in order; the gallery's large type specimen is a paragraph rather than another h1.

## Space, grid, shape, and motion

| Token / convention | Value |
| --- | --- |
| Tailwind spacing step | Existing 0.25rem rhythm; common gaps 0.5, 0.75, 1, 1.5, 2, 3, 4, 6rem |
| `--page-width` | 76rem content, plus outer gutters |
| `--page-gutter` | `clamp(1.25rem, 5vw, 4rem)` |
| `--reading-width` | 68ch |
| `--section-space` | `clamp(4rem, 8vw, 8rem)` |
| `--radius-sm/md/lg/xl` | 0.25 / 0.375 / 0.5 / 0.75rem |
| `--radius` | 0.5rem base control radius |
| Borders | 1px separators/controls; 2px focus outline |
| Focus offset | 4px; focus ring remains outside filled controls |
| Popover depth | `0 12px 24px rgb(0 0 0 / 0.08)`; no decorative card shadows |
| `--duration-fast` | 160ms |
| `--ease-ui` | `cubic-bezier(0.2, 0.65, 0.3, 1)` |

`.site-container` owns width and gutters; it intentionally avoids Tailwind's built-in `.container` name. Below 40rem, layouts stack. At 40rem, skills and specimens can use two columns. At 48rem, compact hero specimens, project rows, and timelines gain their asymmetric columns. At 64rem, desktop navigation and four skill columns appear. The redesigned home hero and large project previews stack until 64rem; their composition conventions are documented in [the homepage stage](08-homepage-redesign.md). Project titles and token labels wrap safely on narrow screens. Do not impose fixed heights on editorial rows or reading sections.

Use restrained color/border transitions for hover and focus. Themes switch atomically with transitions briefly suppressed to prevent a light text color interpolating over a dark background. `prefers-reduced-motion: reduce` disables all nonessential animations/transitions and smooth scrolling. Loading specimens use static skeletons; no shimmer or indefinite pulse is required. Forced-colors mode retains a system Highlight focus outline.

## Component conventions

| Component | Source / shared class | Rules |
| --- | --- | --- |
| Header/mobile navigation | `design/SiteHeader.astro` | Solid sticky header, logo home link, text navigation, current-page indication; native `details` disclosure on mobile; real links survive no JS; fragment offsets clear the header |
| Buttons | `ui/button.tsx`, `.button` | Existing cva API; default/secondary/outline/ghost/link/destructive variants, default/sm/lg/icon sizes; button defaults to `type="button"`, submit explicitly; use `asChild` for real navigation anchors |
| Text links | `.text-link` | Underline at rest, stronger underline on hover, shared visible focus; external anchors include noopener/noreferrer |
| Section headings | `design/SectionHeading.tsx` | Decorative numbered index, contextual eyebrow, h2, optional constrained description; index alone carries no meaning |
| Project cards | `project-card.tsx`, `.project-row` | Editorial row rather than boxed tiles; show role/fork context and source links; hover marker also activates on keyboard focus |
| Technical badges | `ui/badge.tsx`, `.technical-badge` | Static metadata, not buttons; default neutral, optional solid primary/secondary/error foreground pair; no hover-only facts |
| Tabs | `ui/tabs.tsx` | Named tablist, related IDs, selected state, roving tabindex, automatic activation; Left/Right, Home/End, wrapping, disabled-tab skipping; focusable panels |
| Filters | `.filter-control`, gallery implementation | A labeled group of ordinary buttons, `aria-pressed`, visible selected styling, polite result count; filter meaning is textual |
| Blog cards | `design/BlogCard.tsx`, `.blog-card` | Semantic time, linked h2, optional short summary; no invented article content or thumbnail |
| Timeline | `section/work-section.tsx` | Ordered roles, time elements, explicit title/employer, all contributions visible without JS; line/dot decorative |
| Inputs/textarea | `ui/input.tsx`, `.form-input` | Separate persistent label, 1rem input text, 3rem minimum field height, strong boundary, described hint/error; `aria-invalid`, explicit “Error” text, native disabled state |
| Theme switcher | `design/ThemeSwitch.astro`, `scripts/preferences.ts` | Named button, sun/moon, dark state via aria-pressed; one press between the two designed palettes (paper, ink); synchronized labels across all instances; hidden until its handler exists |
| Appearance panel | `design/SiteSettings.astro`, `design/preferences.ts`, `scripts/preferences.ts` | Sliders button in the header opens a non-modal dialog: palette (Paper, Snow, Sepia, Ink, Midnight, Auto), text face (Geist, Serif, Legible, Mono, System), text size (90–130%), line spacing, full screen and reset. Native radios in labelled groups; Escape, an outside press, the close button or focus leaving closes it. A bottom sheet under 40rem |
| Footer | `design/SiteFooter.astro` | Identity, approved GitHub link, writing/gallery links, copyright, and back-to-content anchor |
| Loading | `design/States.tsx` | Polite status and readable label; skeleton bars aria-hidden; use aria-busy on a real loading region if added later |
| Empty | `design/States.tsx` | Explain missing content, meaningful heading, real recovery link; no fabricated publication promise |
| Inset card | `ui/card.tsx` | Existing shadcn compound API; solid surface, subtle border, consistent 1.5rem padding; reserve for distinct inset content |
| 404 | `pages/404.astro` | Descriptive h1, real recovery links, noindex; no decorative obstacle to reading |

All interactive targets aim for at least 44px. Ordinary inline reading links remain inline. Focus outlines are never removed without an equivalent; the programmatically focused main landmark is the exception. For a disabled destination, use a noninteractive explanation rather than leaving an anchor with an active href and merely adding aria-disabled. Placeholder text supplements a label; it never replaces it.

Tabs follow the [W3C APG tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Do not use tabs for primary navigation or hide essential portfolio content behind them. Gallery tabs and filters are the only React islands added here. Home, BlogList, the timeline, header, and footer are server-rendered; decorative canvases and blanket reveal wrappers are gone from the active shell.

## Navigation and theme behavior

The mobile menu is a disclosure, not a modal: no focus trap is needed. Enter/Space opens it; Tab traverses links; Escape closes it and returns focus when focus is inside. Navigation clicks, outside clicks, focus leaving the disclosure, and the desktop breakpoint close it. Focus-leave handling waits for native Tab navigation to finish so it cannot hide links mid-transfer. Native details remains usable when scripts are disabled.

The inline head bootstrap runs before body content and is generated from `src/design/preferences.ts`, the one list of what a visitor may change. It reads four `localStorage` keys: `theme`, `font`, `text-size` and `line-spacing`. A valid saved value wins; anything else is the site as designed, which is the light palette whatever the system prefers. Following the system is the `auto` choice, resolved to `light` or `dark`. The choices reach the page as attributes on the root (`data-theme`, `data-font`, `data-text-size`, `data-spacing`; a default is no attribute), and `.dark` follows whether the palette is a dark one, so code colours and `dark:` utilities need no per-palette rules. `scripts/preferences.ts` applies the same lists, persists each choice when storage is available, keeps working in memory when it is not, follows OS changes only while `auto` is chosen, and synchronizes storage changes across tabs. Every palette in `src/design/tokens.ts` is held to the same contrast checks. Text size is `zoom` on `main` and the footer with the column width divided back out, so the header and the panel hold still while the text changes; it is reset for print. The extra faces are self-hosted and fetched only when chosen or when the panel shows their samples. There is no competing React theme provider or delayed font-dependent color decision.

## Verification and previews

Executed with Node 24.18.1, pnpm 12.6.0, and the installed headless Chrome:

| Check | Result |
| --- | --- |
| `pnpm check:content` | Passed all 15 content assertions (16 tests including parent) |
| `pnpm check:design` | Passed nine contrast/theme behavior cases (10 tests including parent) |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm exec astro check` | Passed: 82 files, zero diagnostic errors/warnings/hints |
| `pnpm build` | Passed; Home, gallery, and 404 prerendered with the retained adapter |
| Chrome UI verification | All 18 targeted checks passed; zero browser JavaScript exceptions |
| Rendered Home normal text contrast | 104 visible text elements tested per theme; minimum 4.553:1 light, 7.656:1 dark |
| Rendered gallery normal text contrast | 141 visible text elements tested per theme; minimum 4.553:1 light, 6.447:1 dark |
| Reflow | Home at 320, 390, 768, 1024, 1440px; gallery at 320, 390, 768, 1440px; both themes, no page-wide horizontal overflow |
| Keyboard | Mobile disclosure, focus return, selected tabs, arrows/End/wrapping/disabled skipping, input focus |
| Theme | OS default, toggle, saved preference after reload, storage denial and cross-tab logic |
| Reduced motion | Browser confirms transitions disabled |
| No JavaScript | Visible profile/projects/contributions, native mobile menu, system-dark CSS fallback, inactive theme switch hidden |
| Metadata | Gallery/404 noindex; gallery and 404 excluded from generated sitemap |
| Artifact and documentation checks | Shared landmarks, one h1 per page, archived/draft content exclusion, local links, and whitespace checks passed |

Token tests are reproducible with `pnpm check:design`. Browser verification used the installed Chrome through its debugging protocol against the local dev server; it did not install Playwright or claim a broader test suite. The preview and owned headless browser were stopped after verification. The empty blog still produces its existing content-loader messages. Avoid running production checks/build and dev preview concurrently: the retained Cloudflare/Vite setup shares dependency caches; a clean preview restart resolved a development JSX-runtime cache mismatch encountered during simultaneous checks.

This is targeted UI and normal-text contrast verification, not a claim of full WCAG conformance, assistive-technology certification, or production performance. No publishing, production access, motion-library installation, case-study creation, or static-hosting migration occurred.

Actual preview artifacts:

- [Dark desktop](design-previews/overview-dark.png)
- [Light desktop](design-previews/overview-light.png)
- [Dark mobile](design-previews/overview-mobile-dark.png)
- [Mobile menu and focus](design-previews/navigation-mobile-dark.png)
- [Dark form and state specimens](design-previews/forms-dark.png)
- [Light form and state specimens](design-previews/forms-light.png)
- [Browser check results](design-previews/qa-results.json)

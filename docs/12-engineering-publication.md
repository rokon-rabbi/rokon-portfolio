# 12 — Engineering publication

Status: updated locally, 2026-10-12. All article files have been removed at the
user’s request. The archive shows an empty state; article/tag routes and search
are ready for future writing. RSS remains disabled. The reading layout uses one
column with a collapsible contents list. These changes have not been deployed.

## Routes and ownership

| Surface | Implementation | Behavior |
| --- | --- | --- |
| `/blog` | `src/pages/blog/index.astro`, `BlogArchive.astro` | Prerendered editorial archive, featured note, tag links, and empty state |
| `/blog/<slug>` | `src/pages/blog/[slug].astro`, `ArticlePage.astro` | Static paths for eligible published articles only |
| `/blog/tags/<tag>` | `src/pages/blog/tags/[tag].astro` | Native static archives for tags present in published articles |
| `/blog/search-index.json` | `src/pages/blog/search-index.json.ts` | Build-time published metadata; no article bodies |
| `/preview/blog/<slug>` | `src/pages/preview/blog/[slug].astro` | Development only; noindex notice, no publication structured data, no production paths |

`src/lib/blog.ts` provides `getPublishedPosts`, backed by the shared
`selectPublishedPosts` policy in `src/lib/publication.ts`. The homepage, archive,
article paths, tag paths, search index, related notes, and chronological
navigation all select through that policy. Blog filenames must be flat lowercase
slugs. Original Starfolio articles remain in `reference/template/blog`, outside
the collection and public assets.

`src/lib/blog-publication.ts` owns display metadata, dates, reading estimates,
tag labels, related selection, and search matching.
`src/styles/publication.css` defines responsive archive and reading layouts
using the existing design tokens. Publication rendering uses Astro and static
React MDX components without a hydrated article island.

## Content contract and publication

`src/schemas/blog.ts` validates strict frontmatter. Required fields are `title`,
`description`, `author`, quoted `YYYY-MM-DD` `date`, one to eight unique lowercase
slug `tags`, and `topic`. Topics are `delivery`, `backend`, `frontend`,
`architecture`, and `testing`. Optional `updatedDate` must be a valid calendar
date on or after `date`. `coverImage` and descriptive `coverAlt` must occur
together; images accept local `/images/blog/` paths or HTTPS URLs. `featured`
defaults to false and `draft` defaults to true. Unknown fields fail validation.

Publication requires explicit `draft: false`, an eligible publication date, and
an eligible update date if supplied. Both dates are evaluated at midnight UTC.
Posts sort newest first, with ID as the deterministic tie-breaker. A future
update date also excludes a post. Static outputs must be rebuilt when a
scheduled date becomes eligible.

Add your own `.mdx` files to `src/content/blog/` when ready. Preview drafts with
`pnpm dev` at `/preview/blog/<slug>`, then set `draft: false` and rebuild to
publish. The reading-layout fixture lives in
`tests/fixtures/blog/reading-sample.mdx`, outside the content collection.

## Reading and discovery

The article layout includes a byline, dates, reading estimate, cover, heading
links, a collapsible table of contents for h2/h3 headings, chronological previous/next links,
and related notes. Related notes prioritize shared tags and then
topic, exclude the current article, and use deterministic date/ID ordering.
Reading time estimates account for prose and fenced-code lines.

MDX preserves Astro's generated heading IDs, including duplicate-heading suffixes.
The sticky table of contents and heading links respect the header offset.
Shiki renders both themes with high-contrast syntax palettes. Code and tables
scroll within keyboard-focusable regions; images fit the reading column.
Copy buttons become visible only after their script mounts, copy their own
block's text, announce success or a manual-copy fallback, and clean up timers
and listeners on disposal.

Published articles include canonical metadata, article Open Graph dates/tags,
image alt metadata, and escaped `BlogPosting` JSON-LD. Local draft previews
display a prominent unpublished notice, omit article publication metadata and
JSON-LD, and never generate production preview URLs. Canonical origins come
from `CONFIG.site.url`; the final production origin remains unconfirmed.

Search progressively enhances the complete static archive. It matches all query
terms against title, description, author, tag labels, and topic labels, then
intersects topic and native tag selection. Query/topic state is bookmarkable;
reset restores results and the empty-result control returns focus to search.
Failed index loading leaves the static cards and tag links usable. Scripts use
abortable listeners and clean up on Astro swaps/HMR. Without JavaScript, readers
can browse archive/tag pages, article text, and heading anchors.

## Verification

The resumed final checks passed:

| Check | Result |
| --- | --- |
| Content, design, work, motion, hero, and publication suites | 69 tests passed |
| Generated blog and portfolio route suites | 16 tests passed |
| Astro diagnostics | 120 files; zero errors, warnings, or hints |
| TypeScript | Passed |
| Production build | Passed; existing optional Three.js large-chunk warning remains |
| Draft/fixture prose scan across generated output | No matches |
| Whitespace validation | `git diff --check` passed |

The generated portfolio link check now includes the static blog archive and
verifies page fragments and bundled assets. Production assertions check the new
empty archive/search output, the absence of RSS, removed article/tag and
preview paths, sitemap exclusions, and removal of temporary QA content.

The preceding browser pass is retained in
[blog-previews/qa-results.json](blog-previews/qa-results.json), with eight captures.
Its 12 checks cover publication gating using temporary published fixtures,
featured cards, search/reset/bookmarks, tags, SEO, related and chronological
links, unique heading anchors, keyboard clipboard success/failure, responsive
code/tables/images, all three local draft previews, reduced motion, 320px
no-JavaScript reading, and zero browser exceptions. Both themes were checked at
320, 390, 768, 1024, and 1440 pixels. Minimum measured visible text contrast was
7.656:1 in dark mode and 4.553:1 in light mode on the tested archive/article
surfaces. Published content visible in fixture captures is temporary test
material; the user's three drafts were never made public. The browser pass was
not rerun during the final documentation and route-verifier repair.

To repeat checks, use the README commands. For browser QA, start a dedicated
headless Chrome debugging session on port 9333 as in
[the hero guide](11-three-hero.md#verification), then run
`node tests/blog-browser-qa.mjs`. The publication runner owns its temporary
development server on port 4321 and removes its fixture articles in `finally`;
leave that port free and avoid concurrent builds while those fixtures exist.

## Remaining stages

The current adapter remains Cloudflare and the build is still server-mode, with
these publication routes prerendered. Static VPS conversion, deterministic
installation/build permissions, archive pagination, other dedicated portfolio
routes, full production QA, and deployment preparation remain later work.
Browser emulation does not establish physical-device performance or a complete
accessibility audit. Sample approval and the production origin remain pending.

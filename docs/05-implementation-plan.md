# 05 — Implementation plan and acceptance gates

Status: proposal, 2026-10-10. Only Phase 0 documentation and baseline checks have been performed. Later phases require the user's next instruction; production access, changes and deployment require explicit approval. No timetable or professional facts are invented.

## Delivery sequence

The dependencies are: evidence and content policy → static foundation → design system → portfolio pages → case studies/blog → optional motion/3D → quality review → deployment preparation → approved release. Some visual prototyping can use neutral development labels while facts are pending, but public professional copy cannot pass its gate without evidence.

Each requested phase follows inspect → summarize proposed changes → implement the requested scope → run appropriate checks → fix introduced failures → report files/results/remaining issues → stop. Preserve Starfolio's MIT license and upstream attribution through all phases. Don't commit or deploy automatically.

## Phase 0 — Audit and baseline (this task)

Deliverables: the five audit/architecture/design/content/plan documents; current route and component maps; dependency inventory; reference access ledger; actual check/build results.

Risks: source retrieval can be cached or incomplete; CV absent; build tools restricted by sandbox; source inspection cannot establish browser accessibility/performance.

Acceptance criteria:

- All five requested documents exist and cross-reference their responsibilities.
- Current and proposed behavior are explicitly distinguished.
- TypeScript, Astro check and build have actual outcomes, including restricted-environment failures and approved successful retries.
- Missing CV and inaccessible previous portfolio are documented; no claim of successful extraction/review.
- No application/dependency redesign or production change occurred.

Verification executed: `pnpm exec astro check` passed after approved retry; `pnpm exec tsc --noEmit` passed; `pnpm build` passed after approved retry. No existing test suite, lint script or Playwright configuration is available. CV extraction remains unavailable, not satisfied by substitutes.

## Phase 1 — Professional content and publication rules

Scope: read private CV when available, extract only public-safe professional facts, confirm project contribution/ownership, inventory approved assets, agree public contact/origin, and create typed content records and draft controls.

Dependencies: primary professional source or equivalent user-reviewed evidence. A partial GitHub page does not resolve employment history or project attribution.

Risks: accidental private-field publication; treating a pinned repository as sole authorship; ambiguous dates; employer confidentiality; publishing sample articles as original writing.

Acceptance criteria:

- Plain validated data records contain profile, roles, education and relevant skills without JSX/UI imports.
- Each project has an evidence source, contribution role and explicit personal/open-source/professional/academic classification.
- Professional case studies clearly identify employer context; no invented metrics or outcomes.
- Contact information is approved for public use; raw CV is not publicly linked.
- Draft/unreviewed material is excluded by shared publication queries.
- All Alex Mercer/template claims have a recorded disposition; no sample becomes Rokon's claim through renaming alone.

Checks: Astro/TypeScript checks; focused schema/publication validation for invalid dates, private fields and unreviewed records; inspection of tracked data and generated output. Do not add tests that merely restate object literals; exercise meaningful validation failures.

## Phase 2 — Static foundation and tooling

Scope: native static route skeleton, static archive pagination, shared URL policy, Cloudflare removal, local image pipeline, dependency/script cleanup, deterministic toolchain and baseline CI.

Dependencies: publication schema and route map. Career copy may remain draft while neutral layout work proceeds.

Risks: losing `/blog/` when removing adapter; assuming middleware headers work on static files; Vite/TS peer compatibility; unresolved pnpm build permissions; changing URLs without redirects.

Acceptance criteria:

- All planned routes have static HTML outputs; page 1 `/blog/` and pages 2 onward use one page size and native links.
- No Cloudflare Worker, KV, Images binding or adapter is required to build/serve the public site.
- Production build works with pinned Node/pnpm and frozen lockfile; build permissions are explicit rather than placeholder strings.
- Add meaningful `check`, build, and agreed quality scripts; document the Vite override/TS compatibility decision.
- Published content and navigation remain readable without JS.
- Define Nginx header parity in the deployment runbook; don't silently discard middleware protections.
- Preserve license and useful upstream credit while updating project setup instructions.

Checks: frozen install in an authorized environment, `pnpm exec astro check`, `pnpm exec tsc --noEmit`, `pnpm build`, serve static artifact locally, enumerate outputs and unknown-route behavior. Add focused pagination tests for empty lists, invalid page input and ordering ties as applicable.

## Phase 3 — Design system and accessible shell

Scope: semantic tokens, typography/grid, header/navigation/footer, theme control, skip link, focus styling and custom 404 design. No broad motion or Three.js yet.

Dependencies: static foundation; proposed palette and typography reviewed as an actual responsive prototype.

Risks: weak muted-text contrast, layout overflow, icon-only navigation, flash/wrong theme preference, global prose overrides undermining components.

Acceptance criteria:

- Both themes have measured text/control contrast; token naming describes purpose.
- Text navigation, current-page state and keyboard focus work at supported viewports.
- Mobile navigation supports keyboard and touch, Escape/closure and appropriate focus return.
- Theme uses one consistent saved/system policy and a named stateful control.
- Shared header/nav/main/footer and skip link exist; 404 has noindex and useful recovery links.
- Fonts are self-hosted and limited to necessary families/subsets; no avoidable font layout shift.
- Core layout works at 320px and 400% reflow assessment without page-wide horizontal overflow.

Checks: Astro/build checks; browser viewport review in both themes; keyboard/menu/theme smoke checks; measured contrast and no-JS navigation. Screenshots should be actual rendered pages, not the existing template preview.

## Phase 4 — Portfolio routes and editorial presentation

Scope: Home, About, Experience, Projects, Contact with verified data; editorial project rows; genuine profile/media assets; reusable Astro composition.

Dependencies: approved public content from Phase 1 and design shell. Missing professional facts block final publication, not construction of neutral draft layouts.

Risks: unsupported hero headline; employer products presented as personal creations; repetitive card/template appearance; oversized images; hidden content behind accordion or animation.

Acceptance criteria:

- Dedicated requested pages have intentional hierarchy and accurate cross-links.
- Each page renders one h1 and readable professional content before JS runs.
- Experience displays supported dates and contribution context; essential facts remain visible.
- Projects display kind and role and link to real case studies or approved evidence.
- Contact has functioning verified anchors, with no fabricated availability/response-time claim.
- Removed travel/hackathon sample sections do not leak through navigation or metadata.
- Images have dimensions, responsive sources, meaningful alt/captions and appropriate loading priority.

Checks: Astro/build, content/output audit, route/link smoke checks, keyboard/no-JS and representative mobile/desktop review. Measure initial asset requests against budgets before adding motion.

## Phase 5 — Project case studies and engineering blog

Scope: independent project/blog collections, case-study detail layout, editorial article layout, static pagination, accessible code copy and media, RSS and complete content metadata.

Dependencies: reviewed case-study material and at least approved draft writing. Do not invent article authorship to fill an archive.

Risks: title/body mismatch, future/draft leaks, duplicate metadata, inactive SSR-only copy buttons, stale relative dates, unsupported JSON-LD, broken external media.

Acceptance criteria:

- Project frontmatter is the single source for list and detail metadata; blog remains a separate collection.
- Case studies describe problem, constraints, contribution, decisions and evidenced results or lessons.
- Article title/slug/summary/body agree; author and dates are truthful; bodies start at h2.
- Copy buttons work per code block with keyboard access and accessible success/failure feedback; plaintext remains usable without JS.
- Drafts and future scheduled posts are absent from production routes, Home excerpts, sitemap and feed.
- Canonical URLs and JSON-LD use one origin and correct published/modified dates; 404 excluded.
- Code and tables scroll internally; useful figures have captions; no fixed crop destroys informative images.
- Existing sample posts are excluded unless explicitly reviewed for reuse and accurate attribution.

Checks: Astro/build; meaningful schema/filter/order tests; static pagination navigation; multiple-code-block copy test including clipboard failure; feed/XML parsing and canonical/draft-output checks; article keyboard and reading-width review.

## Phase 6 — Deliberate GSAP motion and lightweight Three.js

Scope: controlled Home visual, limited GSAP/ScrollTrigger enhancement, native microinteractions and signature scene with its static fallback. Add dependencies only for demonstrated requirements.

Dependencies: stable content/layout and measured static performance. Illustrations must already work without motion.

Risks: unnecessary hydration, render loops/thermal cost, inaccessible automatic motion, layout/scroll disruption, WebGL failures, resource leaks, loading regressions.

Acceptance criteria:

- Reading/interaction never waits for animation or scene initialization.
- Reduced motion disables reveals/parallax/auto-rotation; preference changes stop active effects.
- Scene loads dynamically only on Home, pauses offscreen/hidden, caps DPR/frame rate and disposes resources.
- WebGL unavailable/context loss, script failure and slow connection leave the static illustration intact.
- No noisy particles, scroll hijacking, fake project diagrams or mandatory pointer gestures.
- Motion timelines/listeners are scoped and cleaned up; CSS handles simple focus/hover states.
- Page-request budgets hold: initial Home JS ≤80 KiB compressed; deferred scene ≤180 KiB; reading routes ≤40 KiB. Any exception needs explicit measured justification.

Checks: Astro/build; normal/reduced-motion browser runs, toggled preference, offscreen/visibility behavior, scene initialization failure, keyboard and coarse pointer; measure requested bundle totals and main-thread work against the previous phase.

## Phase 7 — Production quality and regression verification

Scope: install/configure Playwright, meaningful accessibility automation, route/media/link checks, performance measurement, metadata review and privacy/content gates.

Dependencies: implemented routes and interactions. Browser downloads/network require the appropriate execution permission; don't report unavailable tools as passing.

Risks: automated scores mistaken for WCAG conformance; nondeterministic screenshot tests; lab metrics mistaken for field data; tests that only mirror implementation.

Acceptance criteria:

- Playwright checks primary journeys: Home → project → case study; Blog pagination → article; Contact links; menu/theme; unknown URL.
- Keyboard and no-JS browsing, reduced motion, both themes, responsive layouts and code-copy behavior are verified.
- Automated accessibility results have no unresolved serious/critical findings; manual focus, reading order, zoom/reflow and screen reader sampling completed.
- Canonicals/OG/JSON-LD, RSS, sitemap, 404 noindex and actual 404 status are correct.
- Content and artifact review finds no private data, template identity, unverified claims or confidential assets.
- Comparable mobile Lighthouse runs meet agreed targets or document specific measured exceptions; Core Web Vitals lab proxies are distinguished from future field monitoring.
- A frozen install, check, build and test workflow runs in CI; dependencies/licenses receive a recorded audit with unresolved findings visible.

Checks: execute configured check/build/test/a11y scripts; median of three comparable lab performance runs on key templates; manual assistive-technology/keyboard/zoom reviews; artifact and external-link audits. Broaden testing when failures or new changes warrant it.

## Phase 8 — VPS deployment preparation (local only)

Scope: concrete artifact, reviewed Nginx example/runbook, security/cache policy, release/rollback procedure, staging/domain checklist and smoke test commands. No production login or modification in this phase without explicit authorization.

Dependencies: Phase 7 quality results and confirmed hosting requirements. Domain, Linux/Nginx version, existing services, DNS/TLS arrangements and credentials have not been inspected in this audit.

Risks: overwriting existing server config, serving private source files, missing HTTP headers, caching HTML forever, SPA fallback turning 404s into 200s, premature HSTS policy.

Acceptance criteria:

- Deploy artifact contains only generated static site and approved public assets; no repository, private reference or credential files.
- Runbook explains release directories, atomic symlink switch, retained release rollback and post-release checks.
- Nginx policy includes real 404 handling, routing/trailing slashes, TLS, compression, immutable hashed assets and revalidated HTML.
- Headers cover HTML/errors/assets as intended; CSP is tested against actual inline/dynamic scripts/styles; header inheritance accounted for.
- Staging indexing strategy is explicit; robots is not presented as access control.
- Commands/config are concrete enough for user review, while all secrets and unknown server values remain private or clearly marked unresolved.
- User receives the artifact, checks and deployment impact before any production approval request.

Checks: local artifact preview and, if tooling is available, isolated Nginx config validation/smoke checks; privacy scan; dry-run release/rollback procedure. Remote `nginx -t`, config changes, reloads and uploads wait for explicit authorization.

## Phase 9 — Approved production release and handover

Scope: only after explicit approval, inspect necessary server state, deploy the approved artifact safely, validate HTTP behavior and document operations.

Dependencies: concrete Phase 8 review plus explicit production authorization. `--yolo` does not waive the stated requirement to approve VPS deployment/alteration.

Risks: existing service disruption, TLS/DNS mismatch, stale cache, failed symlink/config switch, unexpected public private data.

Acceptance criteria:

- Build/artifact corresponds to reviewed source and checks.
- Versioned release deployed, Nginx validation passes before reload, rollback remains available.
- HTTPS, canonical domain, assets, contact links, feed/sitemap and arbitrary missing URLs pass smoke checks.
- Security/cache headers verified on success and error responses.
- No secrets/private source exposed; permission scope respected.
- Release notes report actual result, any unresolved issue and tested rollback steps; user receives a maintenance guide.

Checks: authorized server configuration validation; real HTTP smoke checks and targeted browser journeys; inspect deployment logs without exposing credentials. If a release fails, use the approved rollback process and report the actual state.

## Current decision and outstanding inputs

This task stops after Phase 0. The recommended next stage is Phase 1 professional content verification, alongside any specifically requested foundation work. Missing inputs are the private CV at its intended path or equivalent professional evidence; verified project roles; public contact choices; approved portrait/project media; final origin; and eventually server details within authorized deployment work.

These are evidence requirements and future scope decisions, not requests to approve unprepared production changes. The five documents are reviewable now; no later phase has been started.

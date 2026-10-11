# 06 — Professional content foundation

This document records the original content-foundation stage. The subsequent [project portfolio stage](09-project-portfolio.md) adds source-backed partial case studies and an explicit, identity-only CourseFlow brief while preserving the published-project policy.

Implemented 2026-10-10. This records the requested content stage and supersedes the Phase 0 inventory where it describes template content still being served. Documents 01–05 remain the audit and proposals recorded before implementation.

## Evidence and limits

`reference/private/cv.docx` is still absent. No CV extraction or review is claimed. The user's subsequent professional-content instruction is the primary evidence for identity, positioning, skills, employment, contribution areas, and the three featured project names. It explicitly authorizes those professional facts for public content. Public repository files supply narrower technical details for two projects.

The registry in `src/data/sources.ts` uses stable IDs and records source scope. Claims in profile highlights, experience contributions, and project highlights refer to those IDs. Schema validation rejects unknown IDs. Evidence IDs support review; they do not establish authorship of every repository file, deployed behavior, security, or measured outcomes.

| Source ID | Evidence reviewed | Supported scope |
| --- | --- | --- |
| `user-content-brief` | User's “Implement the complete professional content foundation” instruction in the preceding portfolio task | Name, headline, core areas, exact employers/titles/dates, contribution areas, LMS name, personal-project names; no CV or education details |
| `hands-on-readme` | [HandsOn README](https://github.com/rokon-rabbi/hands-on-volunteering-platform/blob/706acfa98f3e9bd6153146a306b81f06c5f688d6/README.md) | Volunteering-platform identity and described discovery, registration, and help-request workflows |
| `hands-on-manifests` | [Backend manifest](https://github.com/rokon-rabbi/hands-on-volunteering-platform/blob/706acfa98f3e9bd6153146a306b81f06c5f688d6/backend/pom.xml), [frontend manifest](https://github.com/rokon-rabbi/hands-on-volunteering-platform/blob/706acfa98f3e9bd6153146a306b81f06c5f688d6/frontend/package.json) | Java, Spring Boot, PostgreSQL, Spring Security/JWT dependencies, React, and Tailwind CSS |
| `hands-on-controllers` | [Event controller](https://github.com/rokon-rabbi/hands-on-volunteering-platform/blob/706acfa98f3e9bd6153146a306b81f06c5f688d6/backend/src/main/java/com/volunteeringPlatform/volunteeringPlatformBackend/controller/EventController.java), [help-request controller](https://github.com/rokon-rabbi/hands-on-volunteering-platform/blob/706acfa98f3e9bd6153146a306b81f06c5f688d6/backend/src/main/java/com/volunteeringPlatform/volunteeringPlatformBackend/controller/HelpRequestController.java) | Source implementations of event creation/filtering/joining and help-request/status endpoints |
| `chemistry-repository` | [GitHub fork metadata](https://api.github.com/repos/rokon-rabbi/chemistry-calculator), [upstream project](https://github.com/IIT-NSTU/chemistry-calculator) | Public fork and upstream credit; individual contribution remains unverified |
| `chemistry-code` | [Swing Home](https://github.com/rokon-rabbi/chemistry-calculator/blob/a8ebfc9c694907611e5f8fd1ad388cc65ae78bb9/ChemistryCalculator/frontend/Home.java), [equation balancer](https://github.com/rokon-rabbi/chemistry-calculator/blob/a8ebfc9c694907611e5f8fd1ad388cc65ae78bb9/ChemistryCalculator/backend/EquationBalancer.java), [molar-mass panel](https://github.com/rokon-rabbi/chemistry-calculator/blob/a8ebfc9c694907611e5f8fd1ad388cc65ae78bb9/ChemistryCalculator/frontend/MolarMassPanel.java) | Java/Swing UI, equation-balancing logic, and molar-mass tool |

All repository sources above were retrieved on 2026-10-10. The web retrieval tool returned cache/access errors; direct HTTPS retrieval of the pinned files and GitHub metadata succeeded. Repository applications were not run. The previous portfolio remains a supplied identity/origin reference, not newly verified evidence for additional professional facts.

## Public claim map

| Public claim or group | Content record | Source | Publication boundary |
| --- | --- | --- | --- |
| Md. Rokonuzzaman; Rokon; Full-Stack Software Engineer | `profile.ts` identity and headline | `user-content-brief` | Initials derived from name; no location or seniority invented |
| Work across frontend applications, REST APIs, and CI/CD | `profile.ts` description and summary | `user-content-brief` | Synthesis of supplied focus and experience |
| Angular, React, Next.js, TypeScript | `skills.ts` frontend group; profile highlight | `user-content-brief` | Core areas; no years, ratings, or unsupported employer-specific assignments |
| Java, Spring Boot, REST APIs | `skills.ts` backend group; profile highlight | `user-content-brief` | Core areas |
| PostgreSQL, Redis, Elasticsearch, RabbitMQ | `skills.ts` data/messaging group; profile highlight | `user-content-brief` | Core areas |
| Docker, Jenkins, CI/CD | `skills.ts` delivery group; profile highlight | `user-content-brief` | Core areas |
| Junior Software Engineer (Full Stack), Karooth IT (BD) Limited, October 2025–Present | `experience.ts`, `karooth-it` | `user-content-brief` | Exact title, company, start month, and ongoing role supplied by user |
| Enterprise MIS; beneficiary registration, payments, grievance management | Karooth summary and contribution 1; `enterprise-mis-contributions` | `user-content-brief` | Employer contributions; no ownership, confidential details, counts, or outcomes asserted |
| Search, asynchronous processing, CI/CD | Karooth contributions 2–3; professional project highlights | `user-content-brief` | No specific tool assigned to employer without further evidence |
| Software Engineer Intern, Ztrios Technologies Limited, May–September 2025 | `experience.ts`, `ztrios-technologies` | `user-content-brief` | Exact title/company/months supplied by user |
| Shaheen Education Family LMS; student/parent/admin workflows | Ztrios summary and contribution 1; `shaheen-education-family-lms` | `user-content-brief` | Employer work described as contribution |
| Next.js, TypeScript, backend integration | Ztrios contribution 2 and technologies; LMS highlights | `user-content-brief` | Explicitly associated with role in user instruction |
| Community-Driven Social Volunteering Platform is personal work | `projects.ts`, volunteering project | `user-content-brief`, `hands-on-readme` | User-confirmed classification; no sole-authorship claim |
| Event discovery/registration and community help requests | Volunteering summary and highlights | `hands-on-readme`, `hands-on-controllers` | Described workflows and inspected endpoints; no live-service claim |
| React, Java, Spring Boot, PostgreSQL, Spring Security, JWT, Tailwind CSS | Volunteering stack | `hands-on-manifests` | Verified dependencies; no security assurance implied |
| Volunteering source link | Volunteering links | `hands-on-readme`, `hands-on-manifests` | Verified public repository; no invented demo |
| Chemistry Calculator is a Java/Swing desktop project with equation and molar-mass tools | `projects.ts`, `chemistry-calculator` | `chemistry-code` | Source review; scientific correctness and runtime behavior untested |
| Calculator repository is a fork of IIT-NSTU/chemistry-calculator | Calculator summary, attribution, upstream link | `chemistry-repository` | Visible credit; no sole-authorship or verified individual-contribution claim |
| Calculator source link | Calculator links | `chemistry-repository`, `chemistry-code` | User's fork, separately linked from upstream |
| Public GitHub profile/contact | `profile.ts` contacts | User-supplied GitHub information source | Only supplied public contact; no guessed email/phone/social profile |
| Supplied previous-portfolio URL as fallback canonical origin | `config.ts` | User's information-source list | Final origin unresolved; can override with `PUBLIC_SITE_URL` |

CourseFlow's name is supplied by the user, but its repository, stack, feature description, role, and links are unverified. Its record stays `draft` / `needs-confirmation` with no invented summary. It is excluded from published project selections, rendered Home content, and browser props/bundles.

## Models and consumers

Plain profile, experience, skills, projects, and sources modules contain data and type-only schema imports. `src/data/resume.tsx` is a compatibility facade without JSX or UI references. Presentation resolves icons itself. Runtime schema validation runs in Astro frontmatter; React consumers receive selected public records through props and use type-only content imports.

Personal projects and employer contributions are separate arrays. Professional records require employer, experience ID, and contribution attribution. Build validation checks both directions of each role/project association, employer agreement, classifications, and unique IDs. Forks require upstream URLs. Strict schemas catch undeclared private-field additions; free-text copy still requires human review.

Project records include case-study status and structured sections for future material. All case studies are `planned` with no fabricated narrative. Detail routes belong to a later stage; no empty case-study links are shown. Education is omitted because no supporting information is available.

The homepage is prerendered with verified profile, visible summaries, skill groups, and two published personal projects. Existing work accordions and decorative interactions remain; broader no-JS interaction and design/accessibility changes belong to later work. Navigation receives only its own public data rather than importing draft records into the browser module graph.

Blog schemas require nonempty title, summary, author, valid dates, and modification dates no earlier than publication. New articles default to drafts. One query excludes draft and future posts from archive and article paths, with stable ordering for equal dates. Future posts appear after a rebuild on or after their UTC publication date. No original articles have been supplied, so the archive is intentionally empty.

## Template disposition and privacy

| Template material | Disposition |
| --- | --- |
| Alex Mercer identity, biography, Austin location, contacts/canonical URL | Replaced with supported Rokon content and supplied origin |
| Fictional employers, education, awards, testimonials, metrics | Removed from public model; not relabeled as Rokon's achievements |
| Demo links/screenshots, portrait, travel photos, OG image | Removed from `public/`; archived under `reference/template/public/` |
| Hackathon/photo sections | Removed from homepage; unused section components removed |
| Seven example MDX articles | Archived under `reference/template/blog/`, outside loader; not attributed to Rokon |
| Template README instructions/broken preview link | Replaced with project/content instructions and upstream credit |
| Starfolio copyright/license | Preserved in root `LICENSE`; documented in README/archive |

Private CV storage is ignored by Git and outside public assets. No family details, birth date, religion, blood group, home address, credentials, raw CV, or confidential employer material was added. No screenshot, testimonial, result metric, availability promise, or demo URL was invented.

## Outstanding details

- Private CV or equivalent reviewed education and other missing professional details; CV extraction remains incomplete.
- CourseFlow repository, description, technologies, role, and permitted links.
- Individual contribution to Chemistry Calculator before a personal contribution case study.
- Personal-project roles, dates, constraints, decisions, and outcomes for case studies; repository features alone do not establish these.
- Approved portrait/project media, additional public contact choices, and final production origin if desired.
- Employer-specific technology mappings and publishable outcomes need further evidence.
- Reviewed original articles are needed before publishing blog content.

## Verification

Executed on Node 24.18.1 and pnpm 12.6.0:

| Check | Result |
| --- | --- |
| `pnpm check:content` | Passed all 15 validation/publication checks (16 reported tests including their parent) |
| `pnpm exec tsc --noEmit` | Passed, exit 0 |
| `pnpm exec astro check` | Passed: 72 files, 0 diagnostic errors/warnings/hints |
| `pnpm build` | Passed with existing Cloudflare server adapter; Home and 404 prerendered |
| Generated Home HTML audit | One h1; supplied identity/role/dates, employer summaries, two personal projects, and visible fork credit present |
| Generated browser assets audit | No CourseFlow draft, sample identity/articles/media, private references, or raw CV |
| Archive integrity | All 21 moved template media/article files match originals byte-for-byte |
| Local README/documentation links | Passed |
| Private CV ignore rule | Passed via `git check-ignore reference/private/cv.docx` |
| `git diff --check` | Passed |

The test command runs Node's test API directly. Under this sandbox, `node --test` incorrectly reported only a passing file without individual assertions; an approved run outside the sandbox confirmed the assertions execute. The direct command reports all checks in the sandbox too.

`pnpm install --frozen-lockfile` restored the 529 locked packages but returned `ERR_PNPM_IGNORED_BUILDS` for esbuild, sharp, and workerd due to existing unresolved build permissions. It also warned that pnpm 12 ignores the package-level peer-dependency setting. Neither installation nor toolchain reproducibility is claimed to pass. Those policies belong to the static foundation stage.

The empty MDX collection produces loader/build messages; these reflect the deliberately empty original blog. No sample article paths are generated. Browser interaction, accessibility, and performance testing were not performed in this content stage. The Cloudflare adapter, server blog pagination, unresolved dependency build permissions, and original shell remain later-stage concerns. No commit, deployment, or production access occurred.

# 04 — Content inventory and provenance

Audit date: 2026-10-10. This is a public-safe inventory, not a raw CV extraction. Missing or inaccessible sources are explicitly recorded. No private professional source was successfully read during this audit.

## Source access ledger

| Source | Access result | What is supported | Limitations |
| --- | --- | --- | --- |
| `reference/private/cv.docx` | Missing at exact requested path; workspace `.docx` search found no alternative | Nothing can be extracted from the CV | Employment, education, skills, dates, contact and project roles remain unverified from the primary source |
| [Previous portfolio](https://rokonuzzaaman.web.app/) | Web retrieval failed on repeated direct attempts; search did not yield useful matching evidence | Only the URL supplied by the user | No content, design, screenshots or professional facts reviewed; retrieval failure does not prove the site is offline |
| [GitHub profile](https://github.com/rokon-rabbi) | Partial profile text accessible | Display name Md.Rokonuzzaman and handle rokon-rabbi; a pinned organization repository appears | Retrieved profile had loading errors and was marked crawled about 1.2 years ago; don't treat counts or current status as fresh verified facts |
| [GitHub repositories tab](https://github.com/rokon-rabbi?tab=repositories) | Direct retrieval failed | No complete repository inventory | Cannot claim all public projects were reviewed |
| [IIT-NSTU/nstumart](https://github.com/IIT-NSTU/nstumart) | Public repository listing accessible; retrieved page marked crawled last month | Organization repository exists; file listing includes PHP and SQL; profile pins it | Pinning does not prove authorship, personal ownership, role, employer relationship or outcome; code/history/contribution not audited |
| [Barlas Apaydin reference](https://www.barlasapaydin.com/#!/blog) | Text accessible; retrieval resolved to root portfolio content | Navigation includes Projects/Blog/About/Contact; categorized project entries and tags visible | Hash-route-specific blog rendering, visuals, animation and mobile behavior not visually reviewed |
| [Figma color reference](https://www.figma.com/resource-library/color-combinations/) | Article text accessible | Color theory/harmony discussion and palette categories | No palette here is adopted or assumed accessible without measurement |
| Local repository | Source, preview asset and build artifacts reviewed | Template architecture/content and technical observations | Template content is not a professional factual source for Rokon |

External source observation dates describe this audit. Retrieval tools can return cached content; the stated crawl age above is retained rather than presenting cached facts as current verification. Search results for unrelated developers were discarded.

## Professional information safe to use now

| Field | Value / state | Provenance | Publication status |
| --- | --- | --- | --- |
| Public name | Md. Rokonuzzaman | User instruction; compatible GitHub display name | Usable, preserving the user's preferred spelling |
| Public GitHub | `https://github.com/rokon-rabbi` | User-provided URL; partial profile retrieval | Usable link |
| Site intent | Software engineering portfolio and engineering blog | User's project objective | Product direction, not proof of seniority or specific expertise |
| Previous portfolio URL | `https://rokonuzzaaman.web.app/` | User instruction | Reference URL only; no extracted claims |
| Candidate repository | IIT-NSTU/nstumart | Pinned profile entry and public repository listing | Research candidate; do not publish as personally owned work yet |

No employer, job title, experience duration, degree, award, project outcome, metric, testimonial, public email, LinkedIn profile, portrait ownership, availability, or current location is verified sufficiently for final portfolio copy by this audit. The workspace timezone is not evidence of public location.

## CV extraction status and later safe procedure

Requested extraction is unavailable because the file is absent. No substitute biography or career chronology is invented. Other audit work can proceed; final career copy needs the source or equivalent user-reviewed professional evidence.

When supplied privately:

1. Parse DOCX paragraph/table text locally without uploading the CV to an external service; keep any temporary raw extraction in a private ignored location.
2. Select employer names, roles, supported employment dates, public-safe contributions, education, relevant skills, and professional/public project references.
3. Preserve ambiguous dates and role wording as unresolved questions rather than guessing. Cross-check public project claims against repositories or public evidence.
4. Review confidentiality of employer contributions before adding them to public records. Employer products remain employer products; write “contributed to” with a precise role.
5. Keep personal family details, birth date, religion, blood group, home address, credentials and confidential employer details out of documents, source code, metadata, tests, screenshots and public assets.
6. Treat CV email/phone as contact candidates requiring public-use confirmation unless the user already explicitly identified them as public. A raw CV download is not appropriate; create a sanitized professional resume only when requested.

Professional provenance can record a source ID and verification date without copying private CV text into Git. The existing `/reference/private/` ignore rule is useful, but ignore rules do not protect files that were already tracked or assets copied by a build; verify both tracking and final output.

## Existing template portfolio inventory

| Content group | Current source | State and action |
| --- | --- | --- |
| Name, biography, location, contact | `src/data/resume.tsx` | Alex Mercer/Austin/template links; replace after verification |
| Employers and achievements | Same | Six template employer records, including metrics; none are Rokon's verified experience |
| Education | Same | Four template records; don't preserve as actual qualifications |
| Skills | Same | Ten icon-bearing template entries; establish skills from real evidence, not template defaults |
| Projects | Same | Four template projects: Stackwise, Logport, Formbase, Patchwork; screenshots/videos and usage claims not verified as Rokon's |
| Hackathons/awards | Same | Eleven event records, various award claims; exclude unless separately verified |
| Travel photos | Same and `public/photos/` | Nine generically described template photos; not evidence of Rokon's travel |
| Site origin/social metadata | `src/data/config.ts`, resume, layout | alexmercer.dev and template handle; replace with one confirmed production origin |
| Portrait | `public/picofme.png` | Template identity asset, about 836 KiB; don't present as Rokon |
| Default social image | `public/og_image.png` | Template asset; replace with original truthful branding |
| Favicon | `public/favicon.svg`; missing ICO | SVG present, ICO reference invalid; review identity and supported formats |
| Template preview | `public/starfolio-preview.png` | Useful audit visual; preserve attribution/documentation as needed, omit from production asset bundle if unused |
| Example project media | `example-website.png/.webp`, remote demo videos | Template/demo content; never present as actual project evidence |

## Existing article inventory

All seven articles use template author “Alex Mercer,” have publication/modification metadata, and reference external Unsplash cover URLs. None is verified as Rokon's authored writing. Preserve sample capability for development if useful, but exclude samples from final public publication until reviewed.

| Entry | Frontmatter topic | Actual body observation | Assessment |
| --- | --- | --- | --- |
| `getting-started-with-astro` | Astro introduction | Astro setup, React integration, collections | Broad topic agreement; sample code/API correctness still needs review against Astro 6 |
| `building-restful-apis` | Node/Express REST APIs | TypeScript practices | Clear mismatch |
| `state-management-patterns` | React state management | React testing guide | Clear mismatch |
| `intro-to-web-accessibility` | Web accessibility | Remote-work productivity | Clear mismatch |
| `javascript-async-await` | Async/await | Git workflow | Clear mismatch |
| `css-grid-complete-guide` | CSS Grid | Design systems and tokens | Clear mismatch |
| `web-performance-101` | Core Web Vitals | Next.js-focused numbered tips, starts at section 2 | Needs a coherent outline and framework context; not a complete generic performance guide |

Several bodies introduce h1 headings beneath the article layout's h1. The built REST API article has two h1 elements. Title, summary, slug and body agreement are publication acceptance criteria, not merely visual concerns.

## Inventory needed per new route

| Route / area | Required verified material | Optional material | Missing dependency |
| --- | --- | --- | --- |
| Home | Name, approved professional introduction, verified selected work | Genuine portrait, current availability, recent authored articles | Career summary and project selection |
| About | Public biography, supported professional focus | Principles/examples, coarse location, sanitized resume | CV and personal review |
| Experience | Employer, title, supported dates, public-safe contribution | Public employer link, approved case-study reference | CV and confidentiality review |
| Projects | Verified title/problem, role, kind and evidence link | Genuine screenshots, repo/demo, architecture diagram | Ownership/contribution confirmation |
| Project details | Constraints, decisions, personal contribution, lessons or supported results | Approved metrics, tradeoffs and diagrams | Case-study evidence and narration |
| Blog | Authored/reviewed article, honest byline, actual dates and summary | Topics, diagrams, relevant related work | No original article supplied yet |
| Contact | Explicitly public professional contact channel | LinkedIn, email, availability | Public email/LinkedIn unverified |
| 404 | Recovery labels and original motif | None | No professional factual dependency |
| Site-wide SEO | Confirmed origin, truthful identity, original social image | Verified social handles | Final domain and assets |

## Proposed editorial topics, not publication claims

Potential topics include engineering tradeoffs in a verified project, a concrete performance investigation, an accessibility repair, or a static deployment walkthrough. These are planning ideas only. They must not imply Rokon completed a project, held a responsibility, achieved a metric, or authored an article without supporting material.

## Content gates

- Every public professional claim has a source and review status.
- Employer contributions explicitly identify role and ownership context.
- Unsupported metrics, titles, awards, testimonials and logos are omitted.
- Metadata, JSON-LD and social images follow the same privacy/factual rules as visible copy.
- Template/sample content is excluded from production routes, lists, feeds and sitemap.
- Missing facts produce omission or a development draft, never an invented substitute.
- Media has provenance, permission, appropriate alt text and accurate captions.
- Private originals and raw extracts never enter Git or the deployment artifact.

The audit inventory is complete within accessible evidence. The CV extraction and full previous-portfolio review remain explicit limitations for the next content phase.

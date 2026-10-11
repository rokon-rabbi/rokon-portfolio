# 13 — About, Contact, and public resume

Implemented locally, 2026-10-10. `/about`, `/contact`, `/resume`, and the PDF/text
resume downloads are prerendered. Header, footer, and homepage contact links
connect the new routes. No deployment or commit was made.

## Pages

The About page uses an editorial introduction, a typographic identity panel,
development principles, a dated career timeline, three technical focus areas,
NSTU education, selected skill groups, development interests, and professional
links. The identity graphic is decorative and is not a fabricated portrait.
`src/data/about.ts` holds the editorial copy and education record; roles and
skills reuse the existing professional records.

The Contact page includes a project/job inquiry invitation, professional
background, GitHub, selected work, and resume actions. It contains no form.
`src/data/contact.ts` owns the public email and exact LinkedIn URL. When supplied,
email CTAs use `mailto:` with encoded project/role subject lines; the address is
also visible for manual use. There is no submission endpoint or success state
to misrepresent. Schema validation rejects malformed email addresses, unsafe
protocols, unrelated social domains, and LinkedIn URLs without a profile path.

The current public email and LinkedIn URL are **not supplied** and remain null.
Those links are omitted; the verified GitHub profile remains available. The
professional email and LinkedIn portion of the requested page is pending the
user's exact destinations. GitHub is labeled as a profile, not an email or a
direct-message channel. No availability, response-time, or hiring-status claim
was invented.

## Evidence and missing CV

`reference/private/cv.docx` is absent. Employment titles, dates, contribution
areas, and skills come from the previous user-confirmed professional brief,
not a new CV review. The user's current instruction confirms education at NSTU.
Its formal name was checked on the [official NSTU website](https://nstu.edu.bd/).
Degree, subject, study dates, graduation status, and academic results remain
unspecified and are omitted. These boundaries are recorded in `src/data/sources.ts`.

The philosophy and interests are concise editorial framing around the confirmed
engineering areas. They make no claim of measured outcomes, certification,
leadership, or specific practices deployed at either employer. They remain
editable in `src/data/about.ts`.

## Resume exports and privacy

`src/lib/public-resume.ts` constructs a separate public record through explicit
field selection and a strict schema. It selects only name, professional
headline/summary, supplied public contact destinations, professional roles and
contributions, technical skills, and the supplied education details. It never
serializes a raw CV, full source records, or unknown fields. Birth date, family
details, religion, blood group, residential address, and confidential notes have
no fields in the export model.

| Route | Artifact |
| --- | --- |
| `/resume` | Semantic HTML overview with print styling and native downloads |
| `/resume/rokon-resume.pdf` | Actual searchable A4 PDF, generated during prerendering |
| `/resume/rokon-resume.txt` | Actual UTF-8 plain-text resume, generated during prerendering |

Both files exist in `dist/client/resume/` after the verified build. The links point
to those generated files. Download endpoints return the appropriate MIME type
and attachment filename in development; static hosting must preserve MIME types
and the native same-origin `download` behavior. Each export is regenerated from
the public record on build, preventing a stale separately edited resume.

The PDF exporter adds only the public name and document title to its metadata;
the current file is one A4 page with selectable text, no forms, and no JavaScript.
It is not a tagged PDF and has not been certified for PDF/UA. The semantic HTML
resume and plain-text download provide accessible alternatives. Print styles
remove site navigation/download controls, use a light reading palette, preserve
link destinations, and avoid splitting experience entries where practical.
The PDF's built-in fonts and text normalization target this English-language
resume; supporting other writing systems would require a Unicode font pipeline.

## Accessibility and verification

The new pages use one h1, labeled sections/navigation, meaningful link text,
semantic lists, visible keyboard focus, the existing skip link and native mobile
disclosure, and the shared theme/reduced-motion policy. Decorative graphics are
hidden from assistive technology. Content and downloads remain usable without
JavaScript. No new dependencies were added.

| Verification | Result |
| --- | --- |
| Existing content/design/work/motion/hero/blog tests plus resume tests | 74 passed |
| Blog, portfolio, and new profile/resume generated-route tests | 22 passed |
| Astro diagnostics | 133 files; zero errors, warnings, or hints |
| TypeScript | Passed |
| Production build | Passed; existing optional Three.js large-chunk warning remains |
| Profile browser checks | 8 passed; zero browser exceptions |
| PDF inspection/extraction | One A4 page; complete professional text extracted successfully |
| Whitespace checks | Passed |

Privacy tests inject extra personal/confidential properties at profile, contact,
experience, contribution, skill, and education boundaries and assert they never
reach JSON, plain text, or PDF. PDF checks validate cross-reference offsets,
stream lengths, delimiter escaping, and pagination without lost text. Generated
route checks validate landmarks, fragment/label targets, actual download files,
sitemap inclusion, and internal links across old and new pages.

Browser results and captures are in
[profile-previews/qa-results.json](profile-previews/qa-results.json). About,
Contact, and resume were reviewed at 320, 390, 768, 1024, and 1440 pixels in both
themes. Minimum tested visible text contrast was 4.553:1/light and 7.656:1/dark.
Checks also cover keyboard skip/menu/Escape/focus return, native Contact
navigation, download status/types/headers, print styling, reduced motion, and
320px reading with scripts disabled. Browser checks explicitly record that email
destinations are absent; they do not claim an end-to-end email delivery test.

Use `pnpm check:resume` before building, and `pnpm check:profile:routes` after
`pnpm build`. For browser checks, start the dev server on port 4321 and dedicated
headless Chrome on port 9333 as in the hero guide, then run
`pnpm check:profile:browser`. This runner uses the existing server, unlike the
blog fixture runner. See the README for the shared checks. Browser emulation
does not replace a physical-device or assistive-technology audit.

The requested email, LinkedIn URL, and NSTU degree/subject/dates remain the only
missing content for this scope. Full CV comparison remains unavailable until the
private source is provided. Static VPS conversion and deployment remain separate
stages.

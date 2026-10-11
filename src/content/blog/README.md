# Engineering articles

Three original sample articles are provided as unpublished drafts for text review.
They describe hypothetical engineering approaches, with source links and no
claims of personal delivery outcomes. Review them locally at
`/preview/blog/<filename-without-extension>` using `pnpm dev`.

The collection requires `title`, `description`, `author`, a quoted `YYYY-MM-DD`
`date`, nonempty lowercase slug `tags`, and a `topic` (delivery, backend,
frontend, architecture, or testing). Optional `updatedDate` cannot precede
`date`. Optional `coverImage` and `coverAlt` must be supplied together.
`featured` defaults to false; `draft` defaults to true. Unknown keys fail.

Keep the three samples at `draft: true` until the user explicitly approves
their text. Publishing requires a deliberate `draft: false` and an eligible
publication/update date. Future dates remain excluded until a rebuild after
the UTC date boundary. Public archives, article/tag paths, search, RSS,
related notes, and homepage selection use the same publication gate.

Production generates no preview paths. Covers are original conceptual SVG
illustrations; code snippets are educational sketches, not verified production
implementations. See `docs/12-engineering-publication.md` for the full model
and review/publishing workflow.

The original Starfolio sample articles are archived in `reference/template/blog`
outside the content collection. Do not attribute them to Rokon.

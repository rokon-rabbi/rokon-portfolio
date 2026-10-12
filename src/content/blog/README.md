# Writing

The collection is empty. Add your own `.mdx` files here when you are ready.
The writing archive, article layout, tag pages, search, and code-copy controls
remain available. RSS is disabled.

You can also write in the unlisted browser editor. It saves drafts locally and
downloads validated MDX files. See [the writing-desk guide](../../../docs/writing-desk.md)
for its workflow. Add downloaded articles to this directory to publish them.

Each filename becomes the article slug, for example `a-small-debugging-note.mdx`.
Use a flat, lowercase filename with hyphens.

```yaml
---
title: "Your article title"
description: "A short description of what the reader will find."
date: "2026-10-12"
author: "Md. Rokonuzzaman"
tags: ["testing"]
topic: "testing"
draft: true
---
```

Topics are `delivery`, `backend`, `frontend`, `architecture`, and `testing`.
Tags must be lowercase slugs. `draft` defaults to true; `featured` defaults to
false. Optional `coverImage` and `coverAlt` must be supplied together. Optional
`updatedDate` cannot precede `date`. Unknown metadata fields fail validation.

Preview a draft locally at `/preview/blog/<slug>` with `pnpm dev`. Set
`draft: false` when you want to publish, then rebuild. Future publication or
update dates remain excluded until an eligible rebuild. Production creates no
preview paths.

Reading-layout QA uses `tests/fixtures/blog/reading-sample.mdx`, outside this
collection. Temporary QA content must be cleaned up before a normal build.

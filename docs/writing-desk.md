# Writing desk

The unlisted editor route is defined in `src/data/writing-studio.ts`. Bookmark
that destination on your development server or deployed site. It has no login,
is excluded from the sitemap, has `noindex` metadata and HTTP headers, and is
not linked from public pages. Anyone with its URL can open the editor.

Drafts stay in the current browser on the current device. Opening the route
does not reveal another browser’s drafts or change the public website.

## Writing

Enter a title, short description, and Markdown body. The reading preview
updates as you type. On phones, use **Write** and **Preview** to switch views.
Use the formatting buttons for headings, bold text, italics, links, lists, and
code. The title supplies the main heading, so use `##` for sections.

**Article details** contains the filename, date, topic, tags, author, featured
flag, and export status. The filename is generated from the title until you
edit it manually. Tags use lowercase letters, numbers, and hyphens and are
separated by commas. Dates follow the existing UTC publication policy.

Changes save automatically. **Save now** and Ctrl/Cmd + S save immediately.
The save indicator distinguishes browser storage from unsaved in-memory work.
If storage is unavailable, MDX download and JSON backups still work. If saved
data cannot be read, it is preserved and can be downloaded for recovery.

## Keeping copies

Use **Backups and publishing → Back up drafts** to download the draft list as
JSON. **Restore backup** validates that file and asks before replacing the
current list. Deletion also asks first. Keep a backup before clearing browser
storage or switching devices.

## Publishing

1. Leave **Export as published** unchecked to download a draft, or check it
   for a post you want to publish.
2. Choose **Download MDX**. The editor checks the metadata and compiles the body
   to verify its syntax before downloading the file. The Markdown preview is
   sanitized and does not run embedded code or MDX components.
3. Add the downloaded file to `src/content/blog/`.
4. Run `pnpm build` and use the existing deployment process.

Downloading does not publish directly. This site continues to serve static
files and has no anonymous publishing endpoint. Future-dated posts still need
a rebuild after their publication date becomes eligible.

## Checks

Run `pnpm build`, `pnpm check:writing`, and `pnpm check:writing:browser`.
Browser QA serves the built output locally and uses Chrome; set `CHROME_PATH`
if its executable is in a different location.

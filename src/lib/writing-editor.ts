import { z } from "astro/zod";
import { BlogSchema } from "../schemas/blog";

export const WRITING_STORAGE_KEY = "rokon-writing-drafts-v1";
export const MAX_BODY_LENGTH = 250_000;

const DraftSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(160),
  description: z.string().max(320),
  slug: z.string().max(160),
  slugEdited: z.boolean(),
  author: z.string().max(200),
  date: z.string().max(10),
  tags: z.string().max(300),
  topic: BlogSchema.shape.topic,
  body: z.string().max(MAX_BODY_LENGTH),
  featured: z.boolean(),
  published: z.boolean(),
  updatedAt: z.iso.datetime(),
}).strict();

const WorkspaceSchema = z.object({
  version: z.literal(1),
  activeId: z.string(),
  drafts: z.array(DraftSchema).min(1).max(100),
}).strict().refine(
  (state) => state.drafts.some((draft) => draft.id === state.activeId)
    && new Set(state.drafts.map((draft) => draft.id)).size === state.drafts.length,
  "Draft IDs must be unique and the active draft must exist",
);

export type WritingDraft = z.infer<typeof DraftSchema>;
export type WritingWorkspace = z.infer<typeof WorkspaceSchema>;

export function createDraft(author: string, now = new Date()): WritingDraft {
  return {
    id: crypto.randomUUID(), title: "", description: "", slug: "",
    slugEdited: false, author, date: now.toISOString().slice(0, 10),
    tags: "", topic: "frontend", body: "", featured: false,
    published: false, updatedAt: now.toISOString(),
  };
}

export function slugFromTitle(title: string) {
  return title.normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 160).replace(/-$/, "");
}

export function parseWorkspace(raw: string): WritingWorkspace {
  if (raw.length > 5_000_000) throw new Error("This backup is too large.");
  return WorkspaceSchema.parse(JSON.parse(raw));
}

export function draftMetadata(draft: WritingDraft) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) {
    throw new Error("Use lowercase letters, numbers, and hyphens for the filename.");
  }
  if (["index", "tags", "search-index"].includes(draft.slug)) {
    throw new Error("Choose a different filename; this name is used by the writing pages.");
  }
  if (!draft.body.trim()) throw new Error("Write some article text before downloading.");
  if (draft.body.length > MAX_BODY_LENGTH) throw new Error("The article is too long.");
  const tags = draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
  const result = BlogSchema.safeParse({
    title: draft.title, description: draft.description, author: draft.author,
    date: draft.date, tags, topic: draft.topic, featured: draft.featured,
    draft: !draft.published,
  });
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = String(issue.path[0] ?? "article");
    const messages: Record<string, string> = {
      title: "Add a title (up to 160 characters).",
      description: "Add a short description (up to 320 characters).",
      author: "Add the author’s name.",
      date: "Choose a valid publication date.",
      tags: "Add 1–8 unique, comma-separated tags using lowercase letters, numbers, and hyphens.",
    };
    throw new Error(messages[field] ?? issue.message);
  }
  return result.data;
}

export function exportMdx(draft: WritingDraft): string {
  const metadata = draftMetadata(draft);
  return [
    "---",
    ...Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`),
    "---", "", draft.body.trim(), "",
  ].join("\n");
}

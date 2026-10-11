import { z } from "astro/zod";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00Z`);
    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    );
  }, "Use a valid YYYY-MM-DD calendar date");
export const BlogTagSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Tags must be lowercase URL slugs");
const cover = z.string().refine((value) => {
  if (
    /^\/images\/blog\/[a-zA-Z0-9/_-]+\.(svg|png|jpe?g|webp|avif)$/.test(value)
  )
    return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Use a local /images/blog/ asset or an HTTPS image URL");

export const BlogSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(320),
    date: calendarDate,
    updatedDate: calendarDate.optional(),
    tags: z
      .array(BlogTagSchema)
      .min(1)
      .max(8)
      .refine(
        (tags) => new Set(tags).size === tags.length,
        "Tags must be unique",
      ),
    topic: z.enum([
      "delivery",
      "backend",
      "frontend",
      "architecture",
      "testing",
    ]),
    coverImage: cover.optional(),
    coverAlt: z.string().trim().min(1).max(300).optional(),
    author: z.string().trim().min(1),
    featured: z.boolean().default(false),
    draft: z.boolean().default(true),
  })
  .strict()
  .refine(
    (post) => !post.updatedDate || post.updatedDate >= post.date,
    "Update date precedes publication",
  )
  .refine(
    (post) => !!post.coverImage === !!post.coverAlt,
    "Provide both coverImage and meaningful coverAlt, or omit both",
  );

export type BlogData = z.infer<typeof BlogSchema>;

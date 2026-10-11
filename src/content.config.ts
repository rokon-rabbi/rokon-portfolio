import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { BlogSchema } from "./schemas/blog";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: BlogSchema,
});

export const collections = { blog };

import { getCollection } from "astro:content";
import { selectPublishedPosts } from "./publication";

// One publication policy for lists, static paths and future discovery surfaces.
export async function getPublishedPosts(now = new Date()) {
  const posts = await getCollection("blog");
  for (const post of posts) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.id))
      throw new Error(
        `Blog filename must be a flat lowercase slug: ${post.id}`,
      );
  }
  return selectPublishedPosts(posts, now);
}

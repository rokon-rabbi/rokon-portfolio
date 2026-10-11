import { getPublishedPosts } from "../lib/blog";
import { articleSummary, blogRSS } from "../lib/blog-publication";
import { CONFIG } from "../data/config";
import { PROFILE } from "../data/profile";
export const prerender = true;
export async function GET() {
  return new Response(
    blogRSS(
      (await getPublishedPosts()).map(articleSummary),
      CONFIG.site.url,
      PROFILE.name,
    ),
    { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } },
  );
}

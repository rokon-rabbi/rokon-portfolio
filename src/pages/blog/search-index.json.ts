import { getPublishedPosts } from "../../lib/blog";
import { articleSummary } from "../../lib/blog-publication";
export const prerender = true;
export async function GET() {
  const articles = (await getPublishedPosts()).map(articleSummary);
  return new Response(JSON.stringify(articles), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

import { CONFIG } from "../data/config";
export const prerender = true;
export function GET() {
  return new Response(`User-agent: *\nAllow: /\nDisallow: /preview/\n\nSitemap: ${CONFIG.site.url}/sitemap.xml\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

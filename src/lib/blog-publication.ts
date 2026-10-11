import type { BlogData } from "../schemas/blog";

export const BLOG_TOPICS = {
  delivery: "Delivery & operations",
  backend: "Backend systems",
  frontend: "Frontend engineering",
  architecture: "Architecture",
  testing: "Testing & reliability",
} as const;
const TAG_LABELS: Record<string, string> = {
  "ci-cd": "CI/CD",
  jenkins: "Jenkins",
  "spring-boot": "Spring Boot",
  angular: "Angular",
  caching: "Caching",
  asynchronous: "Asynchronous work",
  architecture: "Architecture",
  testing: "Testing",
  delivery: "Delivery",
  java: "Java",
};
export const tagLabel = (tag: string) =>
  TAG_LABELS[tag] ??
  tag
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
export const articleHref = (id: string) => `/blog/${encodeURIComponent(id)}`;
export const tagHref = (tag: string) => `/blog/tags/${encodeURIComponent(tag)}`;
export const blogDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export function readingMinutes(body = "") {
  let codeLines = 0;
  const prose = body
    .replace(/```[^\n]*\n([\s\S]*?)```/g, (_all, code: string) => {
      codeLines += code.trim().split("\n").length;
      return " ";
    })
    .replace(/^\s*(?:import|export)\s.+$/gm, " ")
    .replace(/<!--[^]*?-->|\{\/\*[^]*?\*\/\}|<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  const words =
    prose.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 220 + codeLines / 8));
}
export interface BlogRecord {
  id: string;
  data: BlogData;
  body?: string;
}
export interface ArticleSummary extends BlogData {
  id: string;
  href: string;
  readingMinutes: number;
}
export function articleSummary(post: BlogRecord): ArticleSummary {
  return {
    ...post.data,
    id: post.id,
    href: articleHref(post.id),
    readingMinutes: readingMinutes(post.body),
  };
}
export function collectTags(posts: readonly BlogRecord[]) {
  const counts = new Map<string, number>();
  posts.forEach((post) =>
    post.data.tags.forEach((tag) =>
      counts.set(tag, (counts.get(tag) ?? 0) + 1),
    ),
  );
  return [...counts]
    .map(([tag, count]) => ({ tag, label: tagLabel(tag), count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
export function relatedArticles(
  post: BlogRecord,
  published: readonly BlogRecord[],
  limit = 3,
) {
  return published
    .filter((candidate) => candidate.id !== post.id)
    .map((candidate) => ({
      candidate,
      score:
        candidate.data.tags.filter((tag) => post.data.tags.includes(tag))
          .length *
          2 +
        Number(candidate.data.topic === post.data.topic),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.data.date.localeCompare(a.candidate.data.date) ||
        a.candidate.id.localeCompare(b.candidate.id),
    )
    .slice(0, limit)
    .map(({ candidate }) => articleSummary(candidate));
}
export function filterArticles(
  posts: readonly ArticleSummary[],
  { query = "", topic = "", tag = "" } = {},
) {
  const terms = query
    .toLocaleLowerCase("en")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return posts.filter(
    (post) =>
      (!topic || post.topic === topic) &&
      (!tag || post.tags.includes(tag)) &&
      terms.every((term) =>
        `${post.title} ${post.description} ${post.author} ${post.tags.map(tagLabel).join(" ")} ${BLOG_TOPICS[post.topic]}`
          .toLocaleLowerCase("en")
          .includes(term),
      ),
  );
}
const escapeXML = (text: string) =>
  text.replace(
    /[<>&"']/g,
    (char) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[char]!,
  );
export function blogRSS(
  posts: readonly ArticleSummary[],
  origin: string,
  author: string,
) {
  const feed = new URL("/rss.xml", origin).href;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Rokon — Engineering notes</title><link>${escapeXML(new URL("/blog", origin).href)}</link><description>${escapeXML(`Engineering notes by ${author}.`)}</description><language>en</language><atom:link href="${escapeXML(feed)}" rel="self" type="application/rss+xml"/>${posts
    .map((post) => {
      const url = escapeXML(new URL(post.href, origin).href);
      return `<item><title>${escapeXML(post.title)}</title><description>${escapeXML(post.description)}</description><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate><dc:creator>${escapeXML(post.author)}</dc:creator>${post.tags.map((tag) => `<category>${escapeXML(tagLabel(tag))}</category>`).join("")}</item>`;
    })
    .join("")}</channel></rss>`;
}

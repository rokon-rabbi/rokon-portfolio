interface Props {
  id: string;
  title: string;
  summary?: string;
  publishedAt: string;
  headingLevel?: "h2" | "h3";
}
export function BlogCard({
  id,
  title,
  summary,
  publishedAt,
  headingLevel: Heading = "h2",
}: Props) {
  const label = new Date(`${publishedAt}T00:00:00Z`).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <article className="blog-card" data-motion="reveal">
      <time className="metadata" dateTime={publishedAt}>
        {label}
      </time>
      <div>
        <Heading>
          <a className="blog-card-title" href={`/blog/${id}`}>
            {title}{" "}
            <span className="text-primary" aria-hidden="true">
              ↗
            </span>
          </a>
        </Heading>
        {summary && <p className="mt-3">{summary}</p>}
      </div>
    </article>
  );
}

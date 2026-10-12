interface EmptyProps {
  title: string;
  description: string;
  href?: string;
  label?: string;
}
export function EmptyState({ title, description, href, label }: EmptyProps) {
  return (
    <div className="empty-state">
      <span className="state-symbol" aria-hidden="true">
        [ / ]
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {href && label && (
        <a className="text-link w-fit" href={href}>
          {label} <span className="arrow" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
export function LoadingState({
  label = "Loading content",
}: {
  label?: string;
}) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="metadata">{label}…</span>
      <div className="skeleton" aria-hidden="true" />
      <div className="skeleton max-w-[75%]" aria-hidden="true" />
      <div className="skeleton max-w-[45%]" aria-hidden="true" />
    </div>
  );
}

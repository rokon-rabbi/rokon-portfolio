interface Props {
  id?: string;
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
}
export function SectionHeading({
  id,
  index,
  eyebrow,
  title,
  description,
}: Props) {
  return (
    <div className="section-heading" data-motion="reveal">
      <span className="section-index" aria-hidden="true">
        {index} /
      </span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
    </div>
  );
}

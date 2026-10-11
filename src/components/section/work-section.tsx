import type { Experience } from "@/schemas/portfolio";
import { formatEmploymentMonth } from "@/lib/portfolio-dates";
export default function WorkSection({
  work: roles,
  presentLabel,
}: {
  work: readonly Experience[];
  presentLabel: string;
}) {
  return (
    <ol className="timeline-list">
      {roles.map((work) => (
        <li key={work.id} className="timeline-entry">
          <p className="timeline-date" data-motion="reveal">
            <time dateTime={work.start}>
              {formatEmploymentMonth(work.start)}
            </time>
            <span aria-hidden="true">—</span>
            {work.end ? (
              <time dateTime={work.end}>{formatEmploymentMonth(work.end)}</time>
            ) : (
              presentLabel
            )}
          </p>
          <div className="timeline-content">
            <span
              className="timeline-progress"
              data-motion-track
              aria-hidden="true"
            />
            <h3 data-motion="reveal">{work.company}</h3>
            <p className="timeline-role">{work.title}</p>
            <p className="timeline-summary">{work.summary}</p>
            <ul className="timeline-contributions">
              {work.contributions.map((contribution) => (
                <li key={contribution.text}>{contribution.text}</li>
              ))}
            </ul>
            {work.technologies.length > 0 && (
              <ul className="badge-list mt-5">
                {work.technologies.map((technology) => (
                  <li key={technology} className="technical-badge">
                    {technology}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

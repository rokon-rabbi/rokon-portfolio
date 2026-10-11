import type { Project } from "@/schemas/portfolio";
export function ProjectCard({
  project,
  index = 1,
}: {
  project: Project;
  index?: number;
}) {
  return (
    <article className="project-row">
      <span className="metadata" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h3 className="project-title">{project.title}</h3>
        <p className="metadata project-context">{project.attribution.label}</p>
      </div>
      <div className="project-body">
        {project.summary && (
          <p className="project-summary">{project.summary}</p>
        )}
        <ul className="project-details">
          {project.technicalHighlights.map((highlight) => (
            <li key={highlight.text}>{highlight.text}</li>
          ))}
        </ul>
        <ul className="badge-list">
          {project.technologies.map((technology) => (
            <li key={technology} className="technical-badge">
              {technology}
            </li>
          ))}
        </ul>
        <div className="project-links">
          {project.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
              aria-label={`${link.label}: ${project.title}`}
            >
              {link.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

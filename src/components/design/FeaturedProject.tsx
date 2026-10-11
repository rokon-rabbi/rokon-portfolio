import type { Project } from "@/schemas/portfolio";
import { ProjectPreview } from "./ProjectPreview";

export function FeaturedProject({
  project,
  index,
  headingLevel: Heading = "h3",
  caseStudyHref,
}: {
  project: Project;
  index: number;
  headingLevel?: "h2" | "h3";
  caseStudyHref?: string;
}) {
  return (
    <article
      className="featured-project"
      aria-labelledby={`project-${project.id}`}
    >
      <ProjectPreview id={project.id} />
      <div className="featured-project-copy" data-motion="reveal">
        <p className="metadata project-kicker">
          <span className="text-primary">{String(index).padStart(2, "0")}</span>{" "}
          /{" "}
          {project.attribution.kind === "fork"
            ? "Open-source repository"
            : "Personal engineering project"}
        </p>
        <Heading id={`project-${project.id}`} className="project-title">
          {caseStudyHref ? (
            <a className="project-title-link" href={caseStudyHref}>
              {project.title}
            </a>
          ) : (
            project.title
          )}
        </Heading>
        <p className="project-summary">{project.summary}</p>
        <div className="project-technical-context">
          <p className="metadata">Technical context</p>
          <ul className="project-details">
            {project.technicalHighlights.map((highlight) => (
              <li key={highlight.text}>{highlight.text}</li>
            ))}
          </ul>
        </div>
        <ul className="badge-list" aria-label="Project technologies">
          {project.technologies.map((technology) => (
            <li key={technology} className="technical-badge">
              {technology}
            </li>
          ))}
        </ul>
        <p className="metadata project-attribution">
          {project.attribution.label}
        </p>
        <div className="project-links">
          {caseStudyHref && (
            <a
              href={caseStudyHref}
              className="button button-outline"
              aria-label={`Read case study: ${project.title}`}
            >
              Read case study <span aria-hidden="true">↗</span>
            </a>
          )}
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

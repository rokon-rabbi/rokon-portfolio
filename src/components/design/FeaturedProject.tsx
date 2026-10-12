import type { Project } from "@/schemas/portfolio";
import { ProjectPreview } from "./ProjectPreview";

export function FeaturedProject({
  project,
  headingLevel: Heading = "h3",
  caseStudyHref,
}: {
  project: Project;
  /** Kept for callers that number their lists; the card itself is unnumbered. */
  index?: number;
  headingLevel?: "h2" | "h3";
  caseStudyHref?: string;
}) {
  const fork = project.attribution.kind === "fork";
  return (
    <article
      className="featured-project"
      aria-labelledby={`project-${project.id}`}
    >
      <ProjectPreview id={project.id} />
      <div className="featured-project-copy" data-motion="reveal">
        <div className="project-heading">
          <Heading id={`project-${project.id}`} className="project-title">
            {caseStudyHref ? (
              <a className="project-title-link" href={caseStudyHref}>
                {project.title}
              </a>
            ) : (
              project.title
            )}
          </Heading>
          <span className="project-kicker">
            {fork ? "Team project, forked" : "Personal project"}
          </span>
        </div>
        <p className="project-summary">{project.summary}</p>
        <ul className="project-stack" aria-label="Project technologies">
          {project.technologies.map((technology) => (
            <li key={technology}>{technology}</li>
          ))}
        </ul>
        {fork && (
          <p className="metadata project-attribution">
            {project.attribution.label}
          </p>
        )}
        <div className="project-links">
          {caseStudyHref && (
            <a
              href={caseStudyHref}
              className="text-link"
              aria-label={`Read case study: ${project.title}`}
            >
              Case study <span className="arrow arrow-right" aria-hidden="true" />
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
              {link.label} <span className="arrow" aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

import type { Project, Experience } from "../../schemas/portfolio";
import { FeaturedProject } from "../design/FeaturedProject";
import { isProjectBrief, workHref } from "../../lib/work";

export default function WorkPortfolio({
  projects,
  experience,
}: {
  projects: readonly Project[];
  experience: readonly Experience[];
}) {
  const reviewed = projects.filter((project) => !isProjectBrief(project));
  const briefs = projects.filter(isProjectBrief);
  return (
    <>
      <section
        className="work-page-header"
        aria-labelledby="work-page-title"
        data-motion="intro"
      >
        <p className="eyebrow">Work</p>
        <h1 id="work-page-title">Things I’ve built.</h1>
        <div className="work-header-bottom">
          <p className="lede">
            Personal projects, each with its code and a case study written
            from the public source.
          </p>
          <a href="/#experience" className="text-link">
            Professional experience{" "}
            <span className="arrow arrow-right" aria-hidden="true" />
          </a>
        </div>
      </section>
      <section
        className="work-portfolio-list"
        aria-label="Projects with a case study"
      >
        {reviewed.map((project, index) => (
          <FeaturedProject
            project={project}
            key={project.id}
            index={index + 1}
            headingLevel="h2"
            caseStudyHref={workHref(project)}
          />
        ))}
      </section>
      {briefs.length > 0 && (
        <section
          className="work-briefs"
          aria-labelledby="briefs-heading"
          data-motion="reveal"
        >
          <div className="work-section-top">
            <h2 id="briefs-heading">Still to write up</h2>
          </div>
          {briefs.map((project) => (
            <article key={project.id} className="work-brief">
              <div>
                <span className="technical-badge">Project brief pending</span>
                <h3>{project.title}</h3>
                <p>
                  Listed as a personal project. Repository, technologies,
                  features, and exact contribution scope are awaiting
                  confirmation.
                </p>
              </div>
              <a
                href={workHref(project)}
                className="text-link"
                aria-label={`View project brief: ${project.title}`}
              >
                View project brief{" "}
                <span className="arrow arrow-right" aria-hidden="true" />
              </a>
            </article>
          ))}
        </section>
      )}
      <section
        className="work-employer-context"
        data-motion="reveal"
        aria-labelledby="employer-work-heading"
      >
        <div>
          <h2 id="employer-work-heading">Work with a team</h2>
          <p>
            What I build at work belongs to my employers, so it is described
            under experience and not shown here.
          </p>
          <a href="/#experience" className="text-link">
            Read my experience{" "}
            <span className="arrow arrow-right" aria-hidden="true" />
          </a>
        </div>
        <ul>
          {experience.map((role) => (
            <li key={role.id}>
              <p className="metadata">{role.title}</p>
              <h3>{role.company}</h3>
              <p>{role.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

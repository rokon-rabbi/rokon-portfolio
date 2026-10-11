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
        <p className="eyebrow">Work / Personal & open source</p>
        <h1 id="work-page-title">
          Selected systems.
          <br />
          <span>Considered solutions.</span>
        </h1>
        <div className="work-header-bottom">
          <p>
            Personal projects and open-source repositories, with technical
            context from public source code and clear contribution boundaries.
          </p>
          <a href="/#work" className="text-link">
            Professional experience <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
      <section
        className="work-portfolio-list"
        aria-label="Repository-backed projects"
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
          <p className="eyebrow">In the project notebook</p>
          <h2 id="briefs-heading">The next story needs its details.</h2>
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
                View project brief <span aria-hidden="true">↗</span>
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
          <p className="eyebrow">Professional contributions</p>
          <h2 id="employer-work-heading">Engineering with a team.</h2>
          <p>
            Employer-related work is presented separately as professional
            experience.
          </p>
          <a href="/#work" className="text-link">
            Read my experience <span aria-hidden="true">↗</span>
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

import { FeaturedProject } from "@/components/design/FeaturedProject";
import { SectionHeading } from "@/components/design/SectionHeading";
import type { Project } from "@/schemas/portfolio";
interface Props {
  projects: readonly Project[];
  content: { label: string; heading: string; text: string };
}
export default function ProjectsSection({ projects, content }: Props) {
  return (
    <section
      id="projects"
      className="section-block"
      aria-labelledby="projects-heading"
    >
      <div className="section-heading-with-link">
        <SectionHeading
          id="projects-heading"
          index="01"
          eyebrow={content.label}
          title="Selected engineering projects"
          description={content.text}
        />
        <a href="/work" className="text-link section-more">
          View all work <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="featured-projects">
        {projects
          .filter((project) => project.featured)
          .map((project, index) => (
            <FeaturedProject
              key={project.id}
              project={project}
              index={index + 1}
              caseStudyHref={`/work/${project.id}`}
            />
          ))}
      </div>
    </section>
  );
}

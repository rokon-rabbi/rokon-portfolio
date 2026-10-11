import { PERSONAL_PROJECTS, getPublishedProjects } from "../data/projects";
import type { Project } from "../schemas/portfolio";

export const CASE_SECTION_LABELS = {
  problem: "Problem & motivation",
  role: "My exact role & contribution",
  architecture: "Architecture & technologies",
  decisions: "Engineering decisions",
  features: "Features & workflows",
  challenges: "Challenges & solutions",
  lessons: "Lessons learned",
} as const;

/** Briefs are an explicit opt-in. Ordinary drafts never acquire a route. */
export function getWorkProjects(
  projects: readonly Project[] = PERSONAL_PROJECTS,
) {
  return projects.filter(
    (project) =>
      project.kind === "personal" &&
      ((project.publication === "published" &&
        project.verification !== "needs-confirmation") ||
        (project.publication === "draft" &&
          project.verification === "needs-confirmation" &&
          project.caseStudy.publicPreview &&
          project.caseStudy.status === "planned")),
  );
}

export function getWorkPaths() {
  return getWorkProjects().map((project) => ({
    params: { slug: project.id },
    props: { project },
  }));
}

export function getRelatedProjects(
  project: Project,
  projects: readonly Project[] = PERSONAL_PROJECTS,
) {
  return getPublishedProjects(projects)
    .filter(
      (candidate) =>
        candidate.kind === "personal" && candidate.id !== project.id,
    )
    .slice(0, 2);
}

export const workHref = (project: Pick<Project, "id">) => `/work/${project.id}`;
export const isProjectBrief = (project: Project) =>
  project.publication === "draft";

export function getProjectSourceIds(project: Project) {
  return [
    ...new Set([
      ...project.sourceIds,
      ...project.caseStudy.sections.flatMap((section) =>
        section.claims.flatMap((claim) => claim.sourceIds),
      ),
      ...(project.caseStudy.diagram?.nodes.flatMap((node) => node.sourceIds) ??
        []),
      ...(project.caseStudy.diagram?.edges.flatMap((edge) => edge.sourceIds) ??
        []),
      ...project.caseStudy.media.flatMap((media) => media.sourceIds),
      ...project.caseStudy.codeSamples.flatMap((sample) => sample.sourceIds),
      ...project.caseStudy.metrics.flatMap((metric) => metric.sourceIds),
    ]),
  ];
}

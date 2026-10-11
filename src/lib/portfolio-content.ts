import { ProfileSchema, SkillGroupSchema, ExperienceSchema, ProjectSchema } from "../schemas/portfolio";
import { PROFILE } from "../data/profile";
import { SKILL_GROUPS } from "../data/skills";
import { EXPERIENCE } from "../data/experience";
import { PERSONAL_PROJECTS, PROFESSIONAL_PROJECTS } from "../data/projects";

// Called from Astro frontmatter. Runtime schema validation stays out of islands.
export function validatePortfolioContent(): void {
  ProfileSchema.parse(PROFILE);
  SKILL_GROUPS.forEach((group) => SkillGroupSchema.parse(group));
  EXPERIENCE.forEach((role) => ExperienceSchema.parse(role));
  const projects = [...PERSONAL_PROJECTS, ...PROFESSIONAL_PROJECTS];
  projects.forEach((project) => ProjectSchema.parse(project));
  if (PERSONAL_PROJECTS.some((project) => project.kind !== "personal") || PROFESSIONAL_PROJECTS.some((project) => project.kind !== "professional")) {
    throw new Error("Employer contributions and personal projects must stay separate");
  }
  const unique = (ids: readonly string[], label: string) => {
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label} IDs`);
  };
  unique(projects.map((project) => project.id), "project");
  unique(EXPERIENCE.map((role) => role.id), "experience");
  for (const project of PROFESSIONAL_PROJECTS) {
    const role = EXPERIENCE.find((entry) => entry.id === project.experienceId);
    if (!role || role.company !== project.employer || !role.projectIds.some((id) => id === project.id)) throw new Error(`Invalid employer attribution for ${project.id}`);
  }
  for (const role of EXPERIENCE) {
    for (const id of role.projectIds) {
      if (!PROFESSIONAL_PROJECTS.some((project) => project.id === id && project.experienceId === role.id)) throw new Error(`Unknown professional project ${id} for ${role.id}`);
    }
  }
}

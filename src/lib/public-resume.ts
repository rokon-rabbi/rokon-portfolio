import { z } from "astro/zod";
import type { Project } from "../schemas/portfolio";
import { PROFILE } from "../data/profile";
import { EXPERIENCE } from "../data/experience";
import { SKILL_GROUPS } from "../data/skills";
import { EDUCATION } from "../data/about";
import { CONTACT_DETAILS } from "../data/contact";
import { PERSONAL_PROJECTS, getPublishedProjects } from "../data/projects";
import { formatEmploymentMonth } from "./portfolio-dates";

const text = z.string().trim().min(1);
const publicUrl = z.url({ protocol: /^https$/ });
export const PublicResumeSchema = z
  .object({
    name: text,
    headline: text,
    stack: z.array(text),
    summary: text,
    email: z.email().nullable(),
    portfolio: publicUrl.nullable(),
    links: z.array(z.object({ label: text, url: publicUrl }).strict()),
    skills: z.array(z.object({ label: text, skills: z.array(text) }).strict()),
    experience: z.array(
      z
        .object({
          company: text,
          title: text,
          period: text,
          contributions: z.array(text),
        })
        .strict(),
    ),
    projects: z.array(
      z
        .object({
          title: text,
          note: text,
          summary: text,
          technologies: z.array(text),
          url: publicUrl.nullable(),
        })
        .strict(),
    ),
    education: z
      .object({
        institution: text,
        degree: text.nullable(),
        period: text.nullable(),
      })
      .strict(),
  })
  .strict();
export type PublicResume = z.infer<typeof PublicResumeSchema>;

/** A résumé names two projects; the featured, published ones come first. */
const SELECTED_PROJECTS = 2;

/** Explicit projection: never serialize a CV, full profile, or unknown properties. */
export function createPublicResume(
  profile = PROFILE,
  experience = EXPERIENCE,
  skills = SKILL_GROUPS,
  education = EDUCATION,
  contact = CONTACT_DETAILS,
  projects: readonly Project[] = getPublishedProjects(PERSONAL_PROJECTS),
  /** The portfolio's own address, for the copies that leave the site. */
  portfolio: string | null = null,
): PublicResume {
  return PublicResumeSchema.parse({
    name: profile.name,
    headline: profile.headline,
    stack: [...profile.primaryStack],
    summary: profile.summary,
    email: contact.email,
    portfolio,
    links: [
      ...profile.contacts.map(({ label, url }) => ({ label, url })),
      ...(contact.linkedin
        ? [{ label: "LinkedIn", url: contact.linkedin }]
        : []),
    ],
    skills: skills.map((group) => ({
      label: group.label,
      skills: [...group.skills],
    })),
    experience: experience.map((role) => ({
      company: role.company,
      title: role.title,
      period: `${formatEmploymentMonth(role.start)} — ${role.end ? formatEmploymentMonth(role.end) : "Present"}`,
      contributions: role.contributions.map((claim) => claim.text),
    })),
    projects: projects
      .filter((project) => project.featured && project.summary)
      .slice(0, SELECTED_PROJECTS)
      .map((project) => ({
        title: project.title,
        note:
          project.attribution.kind === "fork"
            ? `Team project. ${project.attribution.label}`
            : project.attribution.label,
        summary: project.summary,
        technologies: [...project.technologies],
        url:
          project.links.find((link) => link.kind === "source")?.url ?? null,
      })),
    education: {
      institution: education.institution,
      degree: education.degree,
      period: education.period,
    },
  });
}

/** The line under the name: the title, then the stack it is practised in. */
export function resumeTitle(resume: PublicResume) {
  return [resume.headline, resume.stack.join(" • ")].filter(Boolean).join(" | ");
}

/** Email, portfolio and profiles, in the order a reader looks for them. */
export function resumeContacts(resume: PublicResume) {
  return [
    ...(resume.email ? [resume.email] : []),
    ...(resume.portfolio ? [`Portfolio: ${resume.portfolio}`] : []),
    ...resume.links.map((link) => `${link.label}: ${link.url}`),
  ];
}

export function resumeText(resume: PublicResume) {
  return [
    resume.name,
    resumeTitle(resume),
    "",
    ...resumeContacts(resume).map((line, index) =>
      index === 0 && resume.email ? `Email: ${line}` : line,
    ),
    "",
    "SUMMARY",
    resume.summary,
    "",
    "TECHNICAL SKILLS",
    ...resume.skills.map(
      (group) => `${group.label}: ${group.skills.join(", ")}`,
    ),
    "",
    "EXPERIENCE",
    ...resume.experience.flatMap((role) => [
      `${role.title} | ${role.company}`,
      role.period,
      ...role.contributions.map((claim) => `- ${claim}`),
      "",
    ]),
    ...(resume.projects.length
      ? [
          "SELECTED PROJECTS",
          ...resume.projects.flatMap((project) => [
            `${project.title} (${project.note})`,
            project.summary,
            `Technologies: ${project.technologies.join(", ")}`,
            ...(project.url ? [project.url] : []),
            "",
          ]),
        ]
      : []),
    "EDUCATION",
    ...(resume.education.degree ? [resume.education.degree] : []),
    resume.education.institution,
    ...(resume.education.period ? [resume.education.period] : []),
    "",
  ].join("\n");
}

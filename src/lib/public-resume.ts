import { z } from "astro/zod";
import { PROFILE } from "../data/profile";
import { EXPERIENCE } from "../data/experience";
import { SKILL_GROUPS } from "../data/skills";
import { EDUCATION } from "../data/about";
import { CONTACT_DETAILS } from "../data/contact";
import { formatEmploymentMonth } from "./portfolio-dates";

const text = z.string().trim().min(1);
export const PublicResumeSchema = z
  .object({
    name: text,
    headline: text,
    summary: text,
    email: z.email().nullable(),
    links: z.array(
      z.object({ label: text, url: z.url({ protocol: /^https$/ }) }).strict(),
    ),
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
    skills: z.array(z.object({ label: text, skills: z.array(text) }).strict()),
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

/** Explicit projection: never serialize a CV, full profile, or unknown properties. */
export function createPublicResume(
  profile = PROFILE,
  experience = EXPERIENCE,
  skills = SKILL_GROUPS,
  education = EDUCATION,
  contact = CONTACT_DETAILS,
): PublicResume {
  return PublicResumeSchema.parse({
    name: profile.name,
    headline: profile.headline,
    summary: profile.description,
    email: contact.email,
    links: [
      ...profile.contacts.map(({ label, url }) => ({ label, url })),
      ...(contact.linkedin
        ? [{ label: "LinkedIn", url: contact.linkedin }]
        : []),
    ],
    experience: experience.map((role) => ({
      company: role.company,
      title: role.title,
      period: `${formatEmploymentMonth(role.start)} — ${role.end ? formatEmploymentMonth(role.end) : "Present"}`,
      contributions: role.contributions.map((claim) => claim.text),
    })),
    skills: skills.map((group) => ({
      label: group.label,
      skills: [...group.skills],
    })),
    education: {
      institution: education.institution,
      degree: education.degree,
      period: education.period,
    },
  });
}

export function resumeText(resume: PublicResume) {
  return [
    resume.name,
    resume.headline,
    "",
    ...(resume.email ? [`Email: ${resume.email}`] : []),
    ...resume.links.map((link) => `${link.label}: ${link.url}`),
    "",
    "PROFILE",
    resume.summary,
    "",
    "EXPERIENCE",
    ...resume.experience.flatMap((role) => [
      `${role.title} | ${role.company}`,
      role.period,
      ...role.contributions.map((claim) => `- ${claim}`),
      "",
    ]),
    "TECHNICAL SKILLS",
    ...resume.skills.map(
      (group) => `${group.label}: ${group.skills.join(", ")}`,
    ),
    "",
    "EDUCATION",
    resume.education.institution,
    ...(resume.education.degree ? [resume.education.degree] : []),
    ...(resume.education.period ? [resume.education.period] : []),
    "",
  ].join("\n");
}

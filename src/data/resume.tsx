// Compatibility facade: plain content records, with icons resolved by the UI.
import { CONFIG } from "./config";
import { PROFILE } from "./profile";
import { SKILL_GROUPS } from "./skills";
import { EXPERIENCE } from "./experience";
import { PERSONAL_PROJECTS, PROFESSIONAL_PROJECTS, getPublishedProjects } from "./projects";

export const DATA = {
  ...PROFILE,
  url: CONFIG.site.url,
  skills: SKILL_GROUPS,
  work: EXPERIENCE,
  projects: getPublishedProjects(PERSONAL_PROJECTS),
  professionalProjects: getPublishedProjects(PROFESSIONAL_PROJECTS),
  navbar: [
    { href: "/", icon: "home", label: "Home" },
    { href: "/blog", icon: "blog", label: "Blog" },
  ],
  sections: {
    about: { heading: "About" },
    work: { heading: "Professional experience", presentLabel: "Present" },
    skills: { heading: "Core areas" },
    projects: {
      label: "Personal projects",
      heading: "Selected personal work",
      text: "Projects outside my employer work. Source links and technical details are included where available.",
    },
    contact: {
      label: "Contact", heading: "Let's connect",
      text: "Have a project, engineering role, or technical idea in mind? Let’s start with a conversation.",
    },
  },
} as const;

export type PortfolioData = typeof DATA;

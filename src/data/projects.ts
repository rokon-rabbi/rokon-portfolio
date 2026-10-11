import type { Project } from "../schemas/portfolio";
import { EXPERIENCE } from "./experience";
import {
  VOLUNTEERING_CASE_STUDY,
  CHEMISTRY_CASE_STUDY,
  createPlannedCaseStudy,
} from "./case-studies";

export const PERSONAL_PROJECTS: readonly Project[] = [
  {
    id: "community-driven-social-volunteering-platform",
    title: "Community-Driven Social Volunteering Platform",
    kind: "personal",
    publication: "published",
    verification: "repository-reviewed",
    featured: true,
    summary:
      "A volunteering platform with event discovery and registration, community help requests, and a React frontend backed by Spring Boot and PostgreSQL.",
    attribution: { kind: "user-confirmed-personal", label: "Personal project" },
    technologies: [
      "React",
      "Java",
      "Spring Boot",
      "PostgreSQL",
      "Spring Security",
      "JWT",
      "Tailwind CSS",
    ],
    technicalHighlights: [
      {
        text: "Event APIs support creating, filtering, and joining volunteer events.",
        sourceIds: ["hands-on-controllers"],
      },
      {
        text: "Help-request APIs support community requests and status updates.",
        sourceIds: ["hands-on-controllers"],
      },
      {
        text: "React client and Java/Spring Boot backend with PostgreSQL, Spring Security, and JWT dependencies.",
        sourceIds: ["hands-on-manifests"],
      },
    ],
    links: [
      {
        label: "Source code",
        kind: "source",
        url: "https://github.com/rokon-rabbi/hands-on-volunteering-platform",
      },
    ],
    caseStudy: VOLUNTEERING_CASE_STUDY,
    sourceIds: [
      "user-content-brief",
      "hands-on-readme",
      "hands-on-manifests",
      "hands-on-controllers",
    ],
  },
  {
    id: "courseflow",
    title: "CourseFlow",
    kind: "personal",
    publication: "draft",
    verification: "needs-confirmation",
    featured: true,
    attribution: { kind: "user-confirmed-personal", label: "Personal project" },
    technologies: [],
    technicalHighlights: [],
    links: [],
    caseStudy: createPlannedCaseStudy(true),
    sourceIds: ["user-content-brief"],
  },
  {
    id: "chemistry-calculator",
    title: "Chemistry Calculator",
    kind: "personal",
    publication: "published",
    verification: "repository-reviewed",
    featured: true,
    summary:
      "A Java desktop chemistry calculator with equation-balancing and molar-mass tools. The repository is a fork of IIT-NSTU/chemistry-calculator.",
    attribution: {
      kind: "fork",
      label: "Fork of IIT-NSTU/chemistry-calculator",
      upstreamUrl: "https://github.com/IIT-NSTU/chemistry-calculator",
    },
    technologies: ["Java", "Swing"],
    technicalHighlights: [
      {
        text: "Swing desktop interface with dedicated chemistry calculation panels.",
        sourceIds: ["chemistry-code"],
      },
      {
        text: "Separate equation-balancing logic and a molar-mass calculation panel.",
        sourceIds: ["chemistry-code"],
      },
    ],
    links: [
      {
        label: "Source code",
        kind: "source",
        url: "https://github.com/rokon-rabbi/chemistry-calculator",
      },
      {
        label: "Upstream repository",
        kind: "upstream",
        url: "https://github.com/IIT-NSTU/chemistry-calculator",
      },
    ],
    caseStudy: CHEMISTRY_CASE_STUDY,
    sourceIds: ["user-content-brief", "chemistry-repository", "chemistry-code"],
  },
];

// Employer products remain professional contributions, never personal products.
export const PROFESSIONAL_PROJECTS: readonly Project[] = [
  {
    id: "enterprise-mis-contributions",
    title: "Enterprise MIS contributions",
    kind: "professional",
    publication: "published",
    verification: "user-confirmed",
    featured: false,
    summary: EXPERIENCE[0].summary,
    employer: EXPERIENCE[0].company,
    experienceId: EXPERIENCE[0].id,
    attribution: {
      kind: "employer-contribution",
      label: "Professional contribution at Karooth IT (BD) Limited",
    },
    technologies: EXPERIENCE[0].technologies,
    technicalHighlights: EXPERIENCE[0].contributions,
    links: [],
    caseStudy: createPlannedCaseStudy(),
    sourceIds: ["user-content-brief"],
  },
  {
    id: "shaheen-education-family-lms",
    title: "Shaheen Education Family LMS",
    kind: "professional",
    publication: "published",
    verification: "user-confirmed",
    featured: false,
    summary: EXPERIENCE[1].summary,
    employer: EXPERIENCE[1].company,
    experienceId: EXPERIENCE[1].id,
    attribution: {
      kind: "employer-contribution",
      label: "Professional contribution at Ztrios Technologies Limited",
    },
    technologies: EXPERIENCE[1].technologies,
    technicalHighlights: EXPERIENCE[1].contributions,
    links: [],
    caseStudy: createPlannedCaseStudy(),
    sourceIds: ["user-content-brief"],
  },
];

export function getPublishedProjects(
  projects: readonly Project[],
): readonly Project[] {
  return projects.filter(
    (project) =>
      project.publication === "published" &&
      project.verification !== "needs-confirmation",
  );
}

import type { Experience } from "../schemas/portfolio";

export const EXPERIENCE = [
  {
    id: "karooth-it", company: "Karooth IT (BD) Limited", title: "Junior Software Engineer (Full Stack)", start: "2025-10", end: null,
    summary: "Full-stack development on an enterprise MIS, together with the CI/CD and the production Linux servers behind its delivery.",
    contributions: [
      { text: "Develop features across the beneficiary registration, payment, and grievance-management workflows of an enterprise MIS.", sourceIds: ["user-content-brief"] },
      { text: "Implement search and asynchronous processing within the MIS.", sourceIds: ["user-content-brief"] },
      { text: "Integrated Jenkins into the project, so builds and deployments run through a CI/CD pipeline.", sourceIds: ["user-content-brief", "user-infrastructure-brief"] },
      { text: "Deploy and maintain services on production-grade Linux VPS servers: Linux configuration, Docker containers, and Nginx and HAProxy in front of the applications.", sourceIds: ["user-infrastructure-brief"] },
      { text: "Configure and maintain the services around the application: Redis, SeaweedFS bucket storage, and open-source Metabase for reporting.", sourceIds: ["user-infrastructure-brief"] },
    ],
    technologies: ["Jenkins", "Docker", "Linux", "Nginx", "HAProxy", "Redis", "SeaweedFS", "Metabase"],
    projectIds: ["enterprise-mis-contributions"], sourceIds: ["user-content-brief", "user-infrastructure-brief"],
  },
  {
    id: "ztrios-technologies", company: "Ztrios Technologies Limited", title: "Software Engineer Intern", start: "2025-05", end: "2025-09",
    summary: "Frontend development on the Shaheen Education Family LMS with Next.js and TypeScript.",
    contributions: [
      { text: "Built frontend features for the Shaheen Education Family LMS with Next.js and TypeScript.", sourceIds: ["user-content-brief"] },
      { text: "Implemented workflows for the student, parent, and administrator sides of the platform.", sourceIds: ["user-content-brief"] },
      { text: "Integrated the frontend with the platform's backend services.", sourceIds: ["user-content-brief"] },
    ],
    technologies: ["Next.js", "TypeScript"], projectIds: ["shaheen-education-family-lms"], sourceIds: ["user-content-brief"],
  },
] as const satisfies readonly Experience[];

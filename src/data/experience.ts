import type { Experience } from "../schemas/portfolio";

export const EXPERIENCE = [
  {
    id: "karooth-it", company: "Karooth IT (BD) Limited", title: "Junior Software Engineer (Full Stack)", start: "2025-10", end: null,
    summary: "Contribute to enterprise MIS workflows and the systems that support their delivery.",
    contributions: [
      { text: "Contribute to beneficiary registration, payment, and grievance-management workflows.", sourceIds: ["user-content-brief"] },
      { text: "Work on search and asynchronous processing within the MIS.", sourceIds: ["user-content-brief"] },
      { text: "Contribute to CI/CD workflows for application delivery.", sourceIds: ["user-content-brief"] },
    ],
    technologies: [], projectIds: ["enterprise-mis-contributions"], sourceIds: ["user-content-brief"],
  },
  {
    id: "ztrios-technologies", company: "Ztrios Technologies Limited", title: "Software Engineer Intern", start: "2025-05", end: "2025-09",
    summary: "Contributed to the Shaheen Education Family LMS using Next.js and TypeScript.",
    contributions: [
      { text: "Worked on student, parent, and administrator workflows in the Shaheen Education Family LMS.", sourceIds: ["user-content-brief"] },
      { text: "Developed frontend functionality with Next.js and TypeScript and integrated it with backend services.", sourceIds: ["user-content-brief"] },
    ],
    technologies: ["Next.js", "TypeScript"], projectIds: ["shaheen-education-family-lms"], sourceIds: ["user-content-brief"],
  },
] as const satisfies readonly Experience[];

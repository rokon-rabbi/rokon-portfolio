import type { SourceId } from "./sources";

/** Editorial copy based on the confirmed professional brief; no delivery metrics. */
export const ABOUT = {
  introduction:
    "I’m Rokon, a full-stack software engineer working across interfaces, APIs, and software delivery. I’m interested in how those pieces fit together to make everyday workflows easier to use and maintain.",
  context:
    "At Karooth IT (BD) Limited, I contribute to enterprise MIS workflows, including beneficiary registration, payments, and grievance management. Earlier, at Ztrios Technologies Limited, I worked on the Shaheen Education Family LMS with Next.js and TypeScript.",
  principles: [
    {
      title: "Start with the workflow.",
      text: "Understand what someone needs to accomplish before choosing the interface or implementation.",
    },
    {
      title: "Keep boundaries clear.",
      text: "Aim for readable code, explicit API contracts, and components with a focused responsibility.",
    },
    {
      title: "Think beyond the happy path.",
      text: "Consider failure states, useful feedback, and repeatable delivery alongside the feature itself.",
    },
  ],
  focus: [
    {
      number: "01",
      title: "Interfaces with a purpose",
      text: "Angular, React, Next.js, and TypeScript for applications with clear workflows and maintainable frontend boundaries.",
    },
    {
      number: "02",
      title: "Connected backend systems",
      text: "Java, Spring Boot, and REST APIs, with an interest in search, caching, and asynchronous processing.",
    },
    {
      number: "03",
      title: "Repeatable software delivery",
      text: "Docker, Jenkins, and CI/CD, with attention to making application delivery easier to understand and repeat.",
    },
  ],
  interests: [
    "Maintainable application architecture",
    "Accessible interfaces",
    "Search and asynchronous workflows",
    "Reliable build and delivery pipelines",
  ],
} as const;

// Institution supplied in the About/Contact brief. Do not infer degree or dates.
export const EDUCATION: {
  institution: string;
  degree: string | null;
  period: string | null;
  sourceIds: readonly SourceId[];
} = {
  institution: "Noakhali Science and Technology University (NSTU)",
  degree: null,
  period: null,
  sourceIds: ["user-about-contact-brief", "nstu-institution-name"],
};

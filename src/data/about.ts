import type { SourceId } from "./sources";

/** Editorial copy based on the confirmed professional brief; no delivery metrics. */
/** Where Rokon works from, as on his previous portfolio. City only. */
export const LOCATION = {
  city: "Dhaka",
  country: "Bangladesh",
  timeZone: "Asia/Dhaka",
} as const;

export const ABOUT = {
  introduction:
    "I’m Rokon, a full-stack software engineer working across interfaces, APIs, and the servers they run on. I’m interested in how those pieces fit together to make everyday workflows easier to use and maintain.",
  context:
    "At Karooth IT (BD) Limited, I work on an enterprise MIS, including beneficiary registration, payments, and grievance management, and on the production Linux servers and Jenkins pipelines behind its delivery. Earlier, at Ztrios Technologies Limited, I worked on the Shaheen Education Family LMS with Next.js and TypeScript.",
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
      title: "Backend systems that hold up",
      text: "Java, Spring Boot, and REST APIs, with an interest in search, caching, and asynchronous processing.",
    },
    {
      number: "02",
      title: "Delivery and production servers",
      text: "Jenkins and Docker for repeatable releases, and the Linux configuration, Nginx, and HAProxy that an application runs behind.",
    },
    {
      number: "03",
      title: "Interfaces with a purpose",
      text: "Angular, React, Next.js, and TypeScript for applications with clear workflows and maintainable frontend boundaries.",
    },
  ],
  interests: [
    "Maintainable application architecture",
    "Accessible interfaces",
    "Search and asynchronous workflows",
    "Reliable build and delivery pipelines",
    "Running services well on Linux",
  ],
} as const;

// Institution supplied in the About/Contact brief; degree and years as
// published on Rokon's previous portfolio. Results are deliberately left out.
export const EDUCATION: {
  institution: string;
  degree: string | null;
  period: string | null;
  sourceIds: readonly SourceId[];
} = {
  institution: "Noakhali Science and Technology University (NSTU)",
  degree: "BSc in Software Engineering",
  period: "2019 – 2024",
  sourceIds: [
    "user-about-contact-brief",
    "nstu-institution-name",
    "previous-portfolio",
  ],
};

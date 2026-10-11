import type { Profile } from "../schemas/portfolio";

export const PROFILE = {
  name: "Md. Rokonuzzaman", displayName: "Rokon", initials: "MR", headline: "Full-Stack Software Engineer",
  description: "Full-stack software engineer working across frontend applications, REST APIs, and CI/CD.",
  summary: "I'm Rokon, a full-stack software engineer. At Karooth IT (BD) Limited, I contribute to enterprise MIS workflows, from beneficiary registration and payments to grievance management. Previously, I worked on the Shaheen Education Family LMS during my internship at Ztrios Technologies Limited. I also work on personal projects alongside my professional work.",
  technicalHighlights: [
    { text: "Frontend development with Angular, React, Next.js, and TypeScript.", sourceIds: ["user-content-brief"] },
    { text: "Backend development with Java, Spring Boot, and REST APIs.", sourceIds: ["user-content-brief"] },
    { text: "Data and messaging with PostgreSQL, Redis, Elasticsearch, and RabbitMQ.", sourceIds: ["user-content-brief"] },
    { text: "Delivery workflows with Docker, Jenkins, and CI/CD.", sourceIds: ["user-content-brief"] },
  ],
  contacts: [{ id: "github", label: "GitHub", url: "https://github.com/rokon-rabbi" }], sourceIds: ["user-content-brief"],
} as const satisfies Profile;

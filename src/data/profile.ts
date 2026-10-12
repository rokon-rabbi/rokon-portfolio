import type { Profile } from "../schemas/portfolio";

export const PROFILE = {
  name: "Md. Rokonuzzaman", displayName: "Rokon", initials: "MR", headline: "Full-Stack Software Engineer", primaryStack: ["Java", "Spring Boot", "Angular"],
  description: "Full-stack software engineer working across Java and Spring Boot APIs, Angular and React frontends, CI/CD, and production Linux servers.",
  // The professional summary: it opens the résumé in all three of its forms.
  summary: "Full-stack software engineer with 1.5 years of experience building Java and Spring Boot REST APIs and Angular, React, and Next.js applications. Currently working on an enterprise MIS and on production Linux servers with Jenkins, Docker, Nginx, and HAProxy. Focused on maintainable software that is simple to run.",
  technicalHighlights: [
    { text: "Frontend development with Angular, React, Next.js, and TypeScript.", sourceIds: ["user-content-brief"] },
    { text: "Backend development with Java, Spring Boot, and REST APIs.", sourceIds: ["user-content-brief"] },
    { text: "Data and messaging with PostgreSQL, Redis, Elasticsearch, and RabbitMQ.", sourceIds: ["user-content-brief"] },
    { text: "Delivery workflows with Docker, Jenkins, and CI/CD.", sourceIds: ["user-content-brief"] },
    { text: "Production Linux servers with Nginx, HAProxy, SeaweedFS, and Metabase.", sourceIds: ["user-infrastructure-brief"] },
  ],
  contacts: [{ id: "github", label: "GitHub", url: "https://github.com/rokon-rabbi" }], sourceIds: ["user-content-brief", "user-infrastructure-brief"],
} as const satisfies Profile;

import type { SkillGroup } from "../schemas/portfolio";

export const SKILL_GROUPS = [
  { id: "frontend", label: "Frontend", skills: ["Angular", "React", "Next.js", "TypeScript"], sourceIds: ["user-content-brief"] },
  { id: "backend", label: "Backend", skills: ["Java", "Spring Boot", "REST APIs"], sourceIds: ["user-content-brief"] },
  { id: "data-and-messaging", label: "Data and messaging", skills: ["PostgreSQL", "Redis", "Elasticsearch", "RabbitMQ"], sourceIds: ["user-content-brief"] },
  { id: "delivery", label: "Delivery", skills: ["Docker", "Jenkins", "CI/CD"], sourceIds: ["user-content-brief"] },
] as const satisfies readonly SkillGroup[];

import type { SkillGroup } from "../schemas/portfolio";

// In the order a reader should meet them: backend first.
export const SKILL_GROUPS = [
  { id: "backend", label: "Backend", skills: ["Java", "Spring Boot", "REST APIs"], sourceIds: ["user-content-brief"] },
  { id: "frontend", label: "Frontend", skills: ["Angular", "React", "Next.js", "TypeScript"], sourceIds: ["user-content-brief"] },
  { id: "data-and-messaging", label: "Data and messaging", skills: ["PostgreSQL", "Redis", "Elasticsearch", "RabbitMQ"], sourceIds: ["user-content-brief"] },
  { id: "delivery", label: "CI/CD and containers", skills: ["Jenkins", "Docker", "CI/CD"], sourceIds: ["user-content-brief", "user-infrastructure-brief"] },
  { id: "infrastructure", label: "Servers and infrastructure", skills: ["Linux", "Nginx", "HAProxy", "SeaweedFS", "Metabase"], sourceIds: ["user-infrastructure-brief"] },
] as const satisfies readonly SkillGroup[];

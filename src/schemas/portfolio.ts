import { z } from "astro/zod";
import { SOURCE_IDS } from "../data/sources";

const text = z.string().trim().min(1);
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const sourceIds = z.array(z.enum(SOURCE_IDS)).min(1).readonly();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const publicUrl = z.url({ protocol: /^https$/ });

export const ClaimSchema = z.object({ text, sourceIds }).strict().readonly();
export const CASE_STUDY_SECTION_IDS = [
  "problem",
  "role",
  "architecture",
  "decisions",
  "features",
  "challenges",
  "lessons",
] as const;
const sectionBase = { id: z.enum(CASE_STUDY_SECTION_IDS) };
const CaseSectionSchema = z
  .discriminatedUnion("status", [
    z
      .object({
        ...sectionBase,
        status: z.literal("verified"),
        claims: z.array(ClaimSchema).min(1).readonly(),
      })
      .strict(),
    z
      .object({
        ...sectionBase,
        status: z.literal("partial"),
        claims: z.array(ClaimSchema).min(1).readonly(),
        missingDetails: text,
      })
      .strict(),
    z
      .object({
        ...sectionBase,
        status: z.literal("missing"),
        claims: z.array(ClaimSchema).max(0).readonly(),
        missingDetails: text,
      })
      .strict(),
  ])
  .readonly();

export const ProjectMediaSchema = z
  .object({
    id,
    kind: z.enum(["screenshot", "diagram"]),
    src: z
      .string()
      .regex(
        /^\/projects\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|avif|svg)$/,
      ),
    alt: text,
    caption: text,
    credit: text,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    clearance: z.literal("public"),
    sourceIds,
  })
  .strict()
  .readonly();

const ArchitectureDiagramSchema = z
  .object({
    title: text,
    caption: text,
    nodes: z
      .array(
        z
          .object({ id, label: text, detail: text, sourceIds })
          .strict()
          .readonly(),
      )
      .min(1)
      .max(8)
      .readonly(),
    edges: z
      .array(
        z
          .object({ from: id, to: id, label: text, sourceIds })
          .strict()
          .readonly(),
      )
      .max(12)
      .readonly(),
  })
  .strict()
  .superRefine((diagram, context) => {
    const ids = diagram.nodes.map((node) => node.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        message: "Diagram node IDs must be unique",
      });
    if (
      diagram.edges.some(
        (edge) =>
          !ids.includes(edge.from) ||
          !ids.includes(edge.to) ||
          edge.from === edge.to,
      )
    )
      context.addIssue({
        code: "custom",
        message: "Diagram edges must connect distinct existing nodes",
      });
  })
  .readonly();

export const CaseStudySchema = z
  .object({
    status: z.enum(["planned", "partial", "ready"]),
    publicPreview: z.boolean(),
    sections: z
      .array(CaseSectionSchema)
      .length(CASE_STUDY_SECTION_IDS.length)
      .readonly(),
    diagram: ArchitectureDiagramSchema.optional(),
    media: z.array(ProjectMediaSchema).readonly(),
    codeSamples: z
      .array(
        z
          .object({
            id,
            title: text,
            language: z.enum(["http", "java", "typescript", "sql", "text"]),
            code: text,
            caption: text,
            sourceIds,
          })
          .strict()
          .readonly(),
      )
      .readonly(),
    metrics: z
      .array(
        z
          .object({ label: text, value: text, context: text, sourceIds })
          .strict()
          .readonly(),
      )
      .readonly(),
  })
  .strict()
  .superRefine((study, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      new Set(study.sections.map((section) => section.id)).size !==
      CASE_STUDY_SECTION_IDS.length
    )
      issue("All case-study sections must appear exactly once");
    if (
      study.status === "ready" &&
      study.sections.some((section) => section.status !== "verified")
    )
      issue("Ready case studies need verified content in every section");
    if (
      study.status === "planned" &&
      (study.sections.some((section) => section.status !== "missing") ||
        study.diagram ||
        study.media.length ||
        study.codeSamples.length ||
        study.metrics.length)
    )
      issue("Planned case studies must not publish unverified details");
    if (study.publicPreview && study.status !== "planned")
      issue("Public briefs are only for explicitly planned case studies");
    for (const [label, ids] of [
      ["media", study.media.map((item) => item.id)],
      ["code sample", study.codeSamples.map((item) => item.id)],
    ] as const) {
      if (new Set(ids).size !== ids.length) issue(`Duplicate ${label} IDs`);
    }
  })
  .readonly();
export const SkillGroupSchema = z
  .object({
    id,
    label: text,
    skills: z.array(text).min(1).readonly(),
    sourceIds,
  })
  .strict()
  .readonly();
export const ProfileSchema = z
  .object({
    name: text,
    displayName: text,
    initials: text,
    headline: text,
    /** The few technologies named beside the title on the résumé. */
    primaryStack: z.array(text).min(1).readonly(),
    description: text,
    summary: text,
    technicalHighlights: z.array(ClaimSchema).readonly(),
    contacts: z
      .array(z.object({ id, label: text, url: publicUrl }).strict().readonly())
      .readonly(),
    sourceIds,
  })
  .strict()
  .readonly();
export const ExperienceSchema = z
  .object({
    id,
    company: text,
    title: text,
    start: month,
    end: month.nullable(),
    summary: text,
    contributions: z.array(ClaimSchema).min(1).readonly(),
    technologies: z.array(text).readonly(),
    projectIds: z.array(id).readonly(),
    sourceIds,
  })
  .strict()
  .refine(
    (role) => role.end === null || role.end >= role.start,
    "Employment end precedes start",
  )
  .readonly();

export const ProjectSchema = z
  .object({
    id,
    title: text,
    kind: z.enum(["personal", "professional"]),
    publication: z.enum(["published", "draft"]),
    verification: z.enum([
      "user-confirmed",
      "repository-reviewed",
      "needs-confirmation",
    ]),
    featured: z.boolean(),
    summary: text.optional(),
    employer: text.optional(),
    experienceId: id.optional(),
    attribution: z
      .object({
        kind: z.enum([
          "user-confirmed-personal",
          "fork",
          "employer-contribution",
        ]),
        label: text,
        upstreamUrl: publicUrl.optional(),
      })
      .strict()
      .readonly(),
    technologies: z.array(text).readonly(),
    technicalHighlights: z.array(ClaimSchema).readonly(),
    links: z
      .array(
        z
          .object({
            label: text,
            kind: z.enum(["source", "demo", "upstream"]),
            url: publicUrl,
          })
          .strict()
          .readonly(),
      )
      .readonly(),
    caseStudy: CaseStudySchema,
    sourceIds,
  })
  .strict()
  .superRefine((project, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: "custom", message });
    if (
      project.publication === "published" &&
      (!project.summary || project.verification === "needs-confirmation")
    )
      issue(
        "Published projects need a supported summary and completed verification",
      );
    if (
      project.kind === "professional" &&
      (!project.employer ||
        !project.experienceId ||
        project.attribution.kind !== "employer-contribution")
    )
      issue(
        "Professional projects must identify employer, role and contribution attribution",
      );
    if (
      project.kind === "personal" &&
      (project.employer ||
        project.experienceId ||
        project.attribution.kind === "employer-contribution")
    )
      issue("Personal projects must not inherit employer ownership");
    if (project.attribution.kind === "fork" && !project.attribution.upstreamUrl)
      issue("Forks must credit their upstream repository");
    if (
      project.caseStudy.publicPreview &&
      (project.kind !== "personal" ||
        project.publication !== "draft" ||
        project.verification !== "needs-confirmation")
    )
      issue("A public brief must remain an unverified personal draft");
    if (
      project.caseStudy.publicPreview &&
      (project.summary ||
        project.technologies.length ||
        project.technicalHighlights.length ||
        project.links.length)
    )
      issue(
        "Unverified public briefs may only expose confirmed project identity",
      );
    if (
      project.kind === "professional" &&
      (project.caseStudy.status !== "planned" ||
        project.caseStudy.publicPreview)
    )
      issue(
        "Employer projects are limited to approved public experience summaries",
      );
  })
  .readonly();

export type Claim = z.infer<typeof ClaimSchema>;
export type SkillGroup = z.infer<typeof SkillGroupSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CaseStudy = z.infer<typeof CaseStudySchema>;
export type ProjectMedia = z.infer<typeof ProjectMediaSchema>;

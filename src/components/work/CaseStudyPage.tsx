import type { Project } from "../../schemas/portfolio";
import { SOURCES } from "../../data/sources";
import {
  CASE_SECTION_LABELS,
  getProjectSourceIds,
  isProjectBrief,
  workHref,
} from "../../lib/work";
import { ProjectPreview } from "../design/ProjectPreview";
import { ArchitectureVisual } from "./ArchitectureVisual";
import { ProjectMedia } from "./ProjectMedia";

export default function CaseStudyPage({
  project,
  related,
}: {
  project: Project;
  related: readonly Project[];
}) {
  const study = project.caseStudy;
  const brief = isProjectBrief(project);
  const sources = getProjectSourceIds(project);
  const cover = study.media.find((media) => media.kind === "screenshot");
  const roleVerified =
    study.sections.find((section) => section.id === "role")?.status ===
    "verified";
  return (
    <article
      className="case-study"
      data-project-id={project.id}
      data-study-status={study.status}
    >
      <nav aria-label="Breadcrumb" className="work-breadcrumb">
        <a className="text-link" href="/work">
          Work
        </a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{project.title}</span>
      </nav>
      <div className="case-study-header" id="overview" data-motion="intro">
        <div className="case-kicker">
          <p className="eyebrow">
            {project.attribution.kind === "fork"
              ? "Open-source fork"
              : "Personal project"}
          </p>
          <span className="technical-badge">
            {brief
              ? "Project brief pending"
              : project.verification === "repository-reviewed"
                ? "Repository-backed study"
                : "Project case study"}
          </span>
        </div>
        <h1>{project.title}</h1>
        <p className="case-overview">
          {project.summary ??
            `${project.title} is listed as a personal project. Its repository, scope, and implementation details are awaiting confirmation.`}
        </p>
        <dl className="case-facts">
          <div>
            <dt>Attribution</dt>
            <dd>{project.attribution.label}</dd>
          </div>
          <div>
            <dt>Contribution scope</dt>
            <dd>
              {roleVerified
                ? "Documented in the role section"
                : project.attribution.kind === "fork"
                  ? "Individual changes unverified"
                  : "Exact responsibilities pending"}
            </dd>
          </div>
          <div>
            <dt>Evidence</dt>
            <dd>
              {brief
                ? "Project name confirmed"
                : project.verification === "repository-reviewed"
                  ? "Public repository review"
                  : "Confirmed project details"}
            </dd>
          </div>
        </dl>
        {brief ? (
          <p className="case-brief-note">
            This is a project brief, not a completed case study. No features,
            stack, or outcomes are claimed until they are verified.
          </p>
        ) : (
          <div className="case-header-links">
            <a className="button button-primary" href="#architecture">
              Explore the architecture <span aria-hidden="true">↓</span>
            </a>
            {project.links
              .filter((link) => link.kind !== "upstream")
              .map((link) => (
                <a
                  className="button button-outline"
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
          </div>
        )}
      </div>
      {!brief && (
        <div className="case-study-cover">
          {cover ? (
            <ProjectMedia media={cover} />
          ) : (
            <ProjectPreview id={project.id} />
          )}
        </div>
      )}
      <div className="case-study-layout">
        <nav className="case-contents" aria-label="Case study contents">
          <p className="metadata">In this study</p>
          <ol>
            {study.sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <span aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {CASE_SECTION_LABELS[section.id]}
                </a>
              </li>
            ))}
            <li>
              <a href="#evidence">
                <span aria-hidden="true">08</span>Links & evidence
              </a>
            </li>
          </ol>
          <a className="text-link case-back" href="/work">
            All projects <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <div className="case-study-body">
          {study.sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="case-section"
              aria-labelledby={`${section.id}-heading`}
              data-section-status={section.status}
            >
              <div className="case-section-kicker">
                <span className="metadata">
                  {String(index + 1).padStart(2, "0")} /
                </span>
                <span className="metadata">
                  {section.status === "verified"
                    ? "Source-backed context"
                    : section.status === "partial"
                      ? "Partially documented"
                      : "Details pending"}
                </span>
              </div>
              <h2 id={`${section.id}-heading`} data-motion="reveal">
                {CASE_SECTION_LABELS[section.id]}
              </h2>
              {section.claims.map((claim) => (
                <p className="case-claim" key={claim.text}>
                  {claim.text}
                </p>
              ))}
              {section.status !== "verified" && (
                <div className="case-gap" role="note">
                  <span className="metadata">Needs confirmation</span>
                  <p>{section.missingDetails}</p>
                </div>
              )}
              {section.id === "architecture" && (
                <>
                  {project.technologies.length > 0 && (
                    <div className="case-technologies">
                      <h3>Technology stack</h3>
                      <ul
                        className="badge-list"
                        aria-label="Project technologies"
                      >
                        {project.technologies.map((technology) => (
                          <li className="technical-badge" key={technology}>
                            {technology}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {study.diagram && (
                    <ArchitectureVisual diagram={study.diagram} />
                  )}
                  {study.codeSamples.map((sample) => (
                    <figure className="case-code" key={sample.id}>
                      <div>
                        <h3>{sample.title}</h3>
                        <span className="metadata">{sample.language}</span>
                      </div>
                      <pre tabIndex={0} aria-label={sample.title}>
                        <code>{sample.code}</code>
                      </pre>
                      <figcaption>{sample.caption}</figcaption>
                    </figure>
                  ))}
                </>
              )}
              {section.id === "features" &&
                study.media
                  .filter((media) => media.id !== cover?.id)
                  .map((media) => (
                    <ProjectMedia key={media.id} media={media} />
                  ))}
            </section>
          ))}
          <section
            id="evidence"
            className="case-section case-evidence"
            aria-labelledby="evidence-heading"
          >
            <p className="metadata">08 /</p>
            <h2 id="evidence-heading" data-motion="reveal">
              Links & project evidence
            </h2>
            <div className="project-links">
              {project.links.map((link) => (
                <a
                  className="text-link"
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${link.label}: ${project.title}`}
                >
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
            <ul className="case-evidence-gaps">
              {!project.links.some((link) => link.kind === "source") && (
                <li>
                  <strong>Repository</strong>
                  <span>No repository link has been verified.</span>
                </li>
              )}
              {!project.links.some((link) => link.kind === "demo") && (
                <li>
                  <strong>Demo</strong>
                  <span>No live demo link has been verified.</span>
                </li>
              )}
              {!study.media.some((media) => media.kind === "screenshot") && (
                <li>
                  <strong>Screenshots</strong>
                  <span>
                    No approved product screenshots are available.
                    {!brief &&
                      " The visuals on this page are labeled feature illustrations and source-based diagrams."}
                  </span>
                </li>
              )}
              {study.metrics.length === 0 && (
                <li>
                  <strong>Outcomes</strong>
                  <span>
                    No measured impact, performance, or usage metrics have been
                    verified.
                  </span>
                </li>
              )}
            </ul>
            {study.metrics.length > 0 && (
              <dl className="case-metrics">
                {study.metrics.map((metric) => (
                  <div key={metric.label}>
                    <dt>{metric.label}</dt>
                    <dd>
                      <strong>{metric.value}</strong>
                      <p>{metric.context}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <div id="references" className="case-references">
              <h3>Source references</h3>
              <p className="case-reference-intro">
                Public source observations and confirmed project identity
                support this page. Missing firsthand details remain marked
                above.
              </p>
              {sources.map((id) => (
                <details key={id}>
                  <summary>{SOURCES[id].label}</summary>
                  <p>{SOURCES[id].scope}</p>
                  {SOURCES[id].urls.length > 0 ? (
                    <ul>
                      {SOURCES[id].urls.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            className="text-link"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {decodeURIComponent(
                              new URL(url).pathname.split("/").pop() ||
                                new URL(url).hostname,
                            )}
                            <span aria-hidden="true">↗</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="metadata">
                      User-confirmed project identity / No public source
                      document
                    </p>
                  )}
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
      <nav className="related-projects" aria-label="Related projects">
        <div className="related-heading" data-motion="reveal">
          <p className="eyebrow">Continue exploring</p>
          <h2>More engineering work.</h2>
          <a className="text-link" href="/work">
            Back to all work <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="related-project-list">
          {related.map((candidate) => (
            <a key={candidate.id} href={workHref(candidate)}>
              <span className="metadata">
                {candidate.attribution.kind === "fork"
                  ? "Open-source fork"
                  : "Personal project"}
              </span>
              <h3>
                {candidate.title}
                <span aria-hidden="true">↗</span>
              </h3>
              <p>{candidate.summary}</p>
            </a>
          ))}
        </div>
      </nav>
    </article>
  );
}

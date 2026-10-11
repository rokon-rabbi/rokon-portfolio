import type { PortfolioData } from "@/data/resume";
import ContactSection from "@/components/section/contact-section";
import ProjectsSection from "@/components/section/projects-section";
import WorkSection from "@/components/section/work-section";
import { SectionHeading } from "@/components/design/SectionHeading";
import { SystemsHero } from "@/components/design/SystemsHero";
import { BlogCard } from "@/components/design/BlogCard";
import { Button } from "@/components/ui/button";

type ArticlePreview = {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
};
// Scope descriptions are drawn from the verified profile and employment records.
const capabilities = [
  {
    title: "Workflow-focused interfaces",
    description:
      "Frontend applications for real workflows, including beneficiary registration and student, parent, and administrator experiences.",
    label: "Interface engineering",
  },
  {
    title: "Applications connected by APIs",
    description:
      "REST API development and frontend integration, with Java and Spring Boot among my backend tools.",
    label: "Backend engineering",
  },
  {
    title: "Data, search & asynchronous work",
    description:
      "Experience contributing to search and asynchronous processing, alongside a toolkit that includes PostgreSQL, Redis, Elasticsearch, and RabbitMQ.",
    label: "Connected systems",
  },
  {
    title: "From development to delivery",
    description:
      "Contributions to CI/CD workflows, with Docker and Jenkins in my delivery toolkit.",
    label: "Delivery workflows",
  },
];

export default function HomePage({
  data: DATA,
  articles,
}: {
  data: PortfolioData;
  articles: ArticlePreview[];
}) {
  return (
    <>
      <section
        id="hero"
        className="hero home-hero"
        aria-labelledby="hero-title"
      >
        <div className="hero-copy">
          <p className="eyebrow hero-identity" data-motion="intro">
            {DATA.name}
            <span aria-hidden="true"> / </span>
            {DATA.headline}
          </p>
          <h1 id="hero-title" className="display-title hero-title">
            <span className="hero-line" data-motion="hero">
              Reliable systems.
            </span>{" "}
            <span className="hero-line" data-motion="hero">
              Thoughtful experiences.
            </span>
          </h1>
          <p className="hero-description" data-motion="intro">
            I’m Rokon. I build across frontend applications, REST APIs, and
            CI/CD — connecting the interface people use with the systems behind
            it.
          </p>
          <ul
            className="hero-capabilities"
            data-motion="intro"
            aria-label="Selected technical capabilities"
          >
            <li>Frontend engineering</li>
            <li>Java & Spring Boot</li>
            <li>CI/CD workflows</li>
          </ul>
          <div className="hero-actions" data-motion="intro">
            <Button asChild size="lg">
              <a href="#projects">
                Explore My Work <span aria-hidden="true">↗</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/blog">Read My Blog</a>
            </Button>
          </div>
          <a
            href="#contact"
            className="text-link hero-contact"
            data-motion="intro"
          >
            Let’s connect <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="hero-stage" data-hero-stage="systems">
          <SystemsHero />
        </div>
        <div className="hero-bottom">
          <p className="metadata">Rokon — Systems in Motion</p>
          <a href="#projects" className="metadata text-link">
            Selected work below <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <ProjectsSection
        projects={DATA.projects}
        content={DATA.sections.projects}
      />
      <section
        id="work"
        className="section-block experience-section"
        aria-labelledby="work-heading"
      >
        <SectionHeading
          id="work-heading"
          index="02"
          eyebrow="Professional experience"
          title="Engineering in practice."
          description="Contributions to enterprise MIS and education systems, within the teams behind them."
        />
        <WorkSection
          work={DATA.work}
          presentLabel={DATA.sections.work.presentLabel}
        />
      </section>
      <section
        id="capabilities"
        className="section-block capabilities-section"
        aria-labelledby="capabilities-heading"
      >
        <SectionHeading
          id="capabilities-heading"
          index="03"
          eyebrow="Engineering capabilities"
          title="Across the system."
          description="From the interaction on screen to the work happening behind it."
        />
        <div className="capability-list">
          {capabilities.map((capability, index) => (
            <article
              className="capability-row"
              key={capability.label}
              data-motion="reveal"
            >
              <span className="metadata capability-number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="metadata capability-label">{capability.label}</p>
                <h3>{capability.title}</h3>
              </div>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section
        id="skills"
        className="section-block technology-section"
        aria-labelledby="skills-heading"
      >
        <SectionHeading
          id="skills-heading"
          index="04"
          eyebrow="Technology expertise"
          title="The working toolkit."
        />
        <div className="technology-grid">
          {DATA.skills.map((group) => (
            <div
              key={group.id}
              className="technology-group"
              data-motion="reveal"
            >
              <h3>{group.label}</h3>
              <ul>
                {group.skills.map((skill) => (
                  <li key={skill}>
                    {skill}
                    <span aria-hidden="true">↗</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <section
        id="writing"
        className="section-block writing-section"
        aria-labelledby="writing-heading"
      >
        <div className="section-heading-with-link">
          <SectionHeading
            id="writing-heading"
            index="05"
            eyebrow="Selected articles"
            title="Notes from the work."
          />
          <a href="/blog" className="text-link section-more">
            Visit the blog <span aria-hidden="true">↗</span>
          </a>
        </div>
        {articles.length > 0 ? (
          <div className="selected-articles">
            {articles.map((article) => (
              <BlogCard key={article.id} {...article} headingLevel="h3" />
            ))}
          </div>
        ) : (
          <div className="writing-empty" data-motion="reveal">
            <span className="writing-glyph" aria-hidden="true">
              [ ]
            </span>
            <div>
              <p className="metadata">The notebook is open</p>
              <h3>No published articles yet.</h3>
              <p>
                Original engineering notes will appear here when they’re
                published. In the meantime, explore the code behind my projects.
              </p>
              <a href="#projects" className="text-link">
                Explore the projects <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        )}
      </section>
      <section
        id="about"
        className="section-block home-about"
        aria-labelledby="about-heading"
      >
        <SectionHeading
          id="about-heading"
          index="06"
          eyebrow="A little about me"
          title="The person behind the systems."
        />
        <div className="about-grid" data-motion="reveal">
          <p className="about-summary">{DATA.summary}</p>
          <div className="about-aside">
            <span className="about-monogram" aria-hidden="true">
              R<span>↗</span>
            </span>
            <p className="metadata">
              {DATA.name}
              <br />
              {DATA.headline}
            </p>
            <a
              href={DATA.contacts[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              My GitHub profile <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
      <section
        id="contact"
        className="section-block"
        aria-labelledby="contact-heading"
      >
        <ContactSection
          contacts={DATA.contacts}
          content={DATA.sections.contact}
        />
      </section>
    </>
  );
}

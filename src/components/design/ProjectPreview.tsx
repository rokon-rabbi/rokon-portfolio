/** Feature illustrations, not product screenshots or runtime architecture claims. */
export function ProjectPreview({ id }: { id: string }) {
  if (id === "community-driven-social-volunteering-platform") {
    return (
      <figure
        className="project-preview volunteer-preview"
        data-motion="reveal"
      >
        <div className="preview-label metadata">
          <span>01 / Community workflows</span>
          <span aria-hidden="true">↗</span>
        </div>
        <div className="workflow-diagram" aria-hidden="true">
          <div className="workflow-origin">
            <span className="diagram-symbol">◎</span>
            <span>Community</span>
          </div>
          <div className="workflow-branches">
            <div className="workflow-node">
              <span className="metadata">Events</span>
              <strong>Discover. Join.</strong>
              <span className="workflow-track">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="workflow-node">
              <span className="metadata">Help requests</span>
              <strong>Request. Update.</strong>
              <span className="workflow-track secondary-track">
                <i />
                <i />
                <i />
              </span>
            </div>
          </div>
          <div className="workflow-foundation metadata">
            <span>React client</span>
            <span>Spring Boot APIs</span>
            <span>PostgreSQL</span>
          </div>
        </div>
        <figcaption className="metadata">
          Feature illustration / Event & help-request flows
        </figcaption>
      </figure>
    );
  }
  if (id !== "chemistry-calculator") {
    return (
      <figure className="project-preview" data-motion="reveal">
        <p className="metadata">Engineering project</p>
        <span className="writing-glyph" aria-hidden="true">
          [ / ]
        </span>
        <figcaption className="metadata">
          Conceptual illustration / Repository overview
        </figcaption>
      </figure>
    );
  }
  return (
    <figure className="project-preview chemistry-preview" data-motion="reveal">
      <div className="preview-label metadata">
        <span>02 / Chemistry tools</span>
        <span aria-hidden="true">＋</span>
      </div>
      <div className="chemistry-diagram" aria-hidden="true">
        <span className="metadata equation-label">Equation balancing</span>
        <div className="equation">
          <span>
            <small>2</small>H<sub>2</sub>
          </span>
          <b>+</b>
          <span>
            O<sub>2</sub>
          </span>
          <b>→</b>
          <span>
            <small>2</small>H<sub>2</sub>O
          </span>
        </div>
        <div className="molecule">
          <i />
          <i />
          <i />
          <span />
        </div>
        <div className="chemistry-tools metadata">
          <span>Equation balancing</span>
          <span>Molar mass</span>
        </div>
      </div>
      <figcaption className="metadata">
        Feature illustration / Java & Swing desktop tools
      </figcaption>
    </figure>
  );
}

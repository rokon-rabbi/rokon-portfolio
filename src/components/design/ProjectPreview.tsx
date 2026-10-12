/**
 * What stands in for a screenshot when a project has none: the routes its
 * API exposes, or the equation its desktop tool balances. Both are drawn
 * from the reviewed source, and neither is a capture of the running product.
 */

// EventController.java and HelpRequestController.java, as reviewed.
const ROUTES = [
  {
    label: "Events",
    routes: [
      ["POST", "/api/events", ""],
      ["GET", "/api/events", "?category&location"],
      ["POST", "/api/events/{eventId}/join", ""],
    ],
  },
  {
    label: "Help requests",
    routes: [
      ["POST", "/api/help-requests", ""],
      ["GET", "/api/help-requests/{id}", ""],
      ["PATCH", "/api/help-requests/{id}/status", ""],
    ],
  },
] as const;

function Bar({ address }: { address: string }) {
  return (
    <div className="frame-bar">
      <span className="frame-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="frame-address">{address}</span>
    </div>
  );
}

export function ProjectPreview({ id }: { id: string }) {
  if (id === "community-driven-social-volunteering-platform") {
    return (
      <figure
        className="frame project-visual"
        data-motion="reveal"
        aria-label="The event and help-request routes of the volunteering platform’s API"
      >
        <Bar address="hands-on / REST API" />
        <div className="frame-view sheet">
          {ROUTES.map((group) => (
            <div className="sheet-group" key={group.label}>
              <p className="sheet-label">{group.label}</p>
              {group.routes.map(([method, path, query]) => (
                <p className="route" key={`${method} ${path}`}>
                  <span className="route-method">{method}</span>
                  <span className="route-path">
                    {path}
                    {query && <em>{query}</em>}
                  </span>
                </p>
              ))}
            </div>
          ))}
          <p className="sheet-layers">
            <span>React</span>
            <i aria-hidden="true" />
            <span>Spring Boot</span>
            <i aria-hidden="true" />
            <span>PostgreSQL</span>
          </p>
        </div>
      </figure>
    );
  }
  if (id === "chemistry-calculator") {
    return (
      <figure
        className="frame project-visual"
        data-motion="reveal"
        aria-label="An illustration of the equation balancer: hydrogen and oxygen balanced into water"
      >
        <Bar address="Chemistry Calculator / Equation balance" />
        <div className="frame-view equation-panel">
          <div className="equation-fields" aria-hidden="true">
            <p className="equation-field">
              Reactants <b>H2 + O2</b>
            </p>
            <p className="equation-field">
              Products <b>H2O</b>
            </p>
          </div>
          <p className="equation" aria-hidden="true">
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
          </p>
          <p className="equation-caption">
            Illustration of the balancer, not a capture of the app.
          </p>
        </div>
      </figure>
    );
  }
  return (
    <figure className="frame project-visual" data-motion="reveal">
      <Bar address="project" />
      <div className="frame-view equation-panel">
        <p className="equation" aria-hidden="true">
          <small>{"{"}</small>
          <b>…</b>
          <small>{"}"}</small>
        </p>
      </div>
    </figure>
  );
}

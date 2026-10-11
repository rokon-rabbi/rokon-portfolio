import type { CaseStudy } from "../../schemas/portfolio";

export function ArchitectureVisual({
  diagram,
}: {
  diagram: NonNullable<CaseStudy["diagram"]>;
}) {
  const name = (id: string) =>
    diagram.nodes.find((node) => node.id === id)?.label;
  return (
    <figure className="architecture-visual">
      <div className="architecture-title">
        <span className="metadata">System map / Source context</span>
        <h3>{diagram.title}</h3>
      </div>
      <ol className="architecture-nodes">
        {diagram.nodes.map((node, index) => (
          <li key={node.id}>
            <span
              className="metadata architecture-node-index"
              aria-hidden="true"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <h4>{node.label}</h4>
            <p>{node.detail}</p>
          </li>
        ))}
      </ol>
      <ul className="architecture-edges" aria-label="Diagram connections">
        {diagram.edges.map((edge) => (
          <li key={`${edge.from}-${edge.to}`}>
            <span>
              {name(edge.from)} <span aria-hidden="true">→</span>
              <span className="sr-only"> connects to </span> {name(edge.to)}
            </span>
            <span className="metadata">{edge.label}</span>
          </li>
        ))}
      </ul>
      <figcaption>{diagram.caption}</figcaption>
    </figure>
  );
}

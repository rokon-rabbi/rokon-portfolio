import { SystemArtwork, SystemAssembly } from "./SystemAssembly";

/** SSR-only shell. Disable or replace this component without touching hero copy. */
export function SystemsHero({ enabled = true }: { enabled?: boolean }) {
  if (!enabled) return <SystemAssembly />;
  return (
    <figure
      className="system-figure systems-hero"
      data-system-hero
      data-hero-enabled="true"
      data-hero-status="static"
    >
      <div className="systems-heading">
        <p className="metadata">FIG. 01 — SYSTEMS IN MOTION</p>
        <button
          className="systems-pause"
          type="button"
          data-hero-pause
          hidden
          aria-label="Pause scene motion"
        >
          <span className="systems-pause-icon" aria-hidden="true" data-state="running" />
          <span data-hero-pause-label>Pause</span>
        </button>
      </div>
      <div className="systems-viewport" data-hero-viewport aria-hidden="true">
        <div className="systems-fallback" data-hero-fallback>
          <SystemArtwork parallax={false} />
        </div>
      </div>
      <figcaption className="metadata">
        <span>Interfaces / APIs / delivery</span>
        <span>Connected by design</span>
      </figcaption>
    </figure>
  );
}

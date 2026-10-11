export function SystemAssembly() {
  return (
    <figure className="system-figure">
      <p className="metadata mb-4">FIG. 01 — SYSTEM ASSEMBLY</p>
      <SystemArtwork />
      <figcaption className="metadata">
        <span>Interfaces / APIs / delivery</span>
        <span>Connected by design</span>
      </figcaption>
    </figure>
  );
}

export function SystemArtwork({ parallax = true }: { parallax?: boolean }) {
  return (
    <svg
      viewBox="0 0 400 360"
      fill="none"
      aria-hidden="true"
      data-motion-parallax={parallax ? "" : undefined}
    >
      <g stroke="var(--border)" strokeWidth="1">
        <path d="M30 80h340M30 180h340M30 280h340M80 30v300M200 30v300M320 30v300" />
      </g>
      <path
        d="M62 258h58v-63h83v-77h74v-57h62"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      <path
        d="M63 117h57v78m83 0h74v64h61"
        stroke="var(--secondary)"
        strokeWidth="2"
      />
      <g stroke="var(--input)" strokeWidth="1.5">
        <path d="m112 194 91-52 91 52-91 52-91-52Z" fill="var(--muted)" />
        <path
          d="m112 194 91 52 91-52v30l-91 52-91-52v-30Z"
          fill="var(--card)"
        />
        <path d="M203 246v30" />
      </g>
      <g stroke="var(--primary)" strokeWidth="1.5">
        <path d="m112 147 91-52 91 52-91 52-91-52Z" fill="var(--card)" />
        <path
          d="m112 147 91 52 91-52v20l-91 52-91-52v-20Z"
          fill="var(--muted)"
        />
        <path d="M203 199v20m-32-58 32 18 32-18-32-18-32 18Z" />
      </g>
      <path d="m166 104 37-21 37 21-37 21-37-21Z" fill="var(--primary)" />
      <g fill="var(--background)" strokeWidth="2">
        <circle cx="62" cy="258" r="5" stroke="var(--primary)" />
        <circle cx="339" cy="61" r="5" stroke="var(--primary)" />
        <circle cx="63" cy="117" r="5" stroke="var(--secondary)" />
        <circle cx="338" cy="259" r="5" stroke="var(--secondary)" />
      </g>
      <path
        d="M295 90h20m-10-10v20M87 290h14m-7-7v14"
        stroke="var(--warm-decorative)"
        strokeWidth="2"
      />
      <path
        d="M30 30h15M30 30v15m340-15h-15m15 0v15M30 330h15m-15 0v-15m340 15h-15m15 0v-15"
        stroke="var(--input)"
      />
    </svg>
  );
}

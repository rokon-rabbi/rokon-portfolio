import type { ProjectMedia as Media } from "../../schemas/portfolio";

export function ProjectMedia({ media }: { media: Media }) {
  return (
    <figure
      className="case-media"
      data-media-kind={media.kind}
      data-motion="reveal"
    >
      <img
        src={media.src}
        width={media.width}
        height={media.height}
        alt={media.alt}
        loading="lazy"
        decoding="async"
      />
      <figcaption>
        <span>{media.caption}</span>
        <span className="metadata">{media.credit}</span>
      </figcaption>
    </figure>
  );
}

/* eslint-disable @next/next/no-img-element */

interface MediaContainerProps {
  src: string;
  alt: string;
  type?: "image" | "video";
  className?: string;
  width?: number;
  height?: number;
}

export function MediaContainer({
  src,
  alt = "",
  type = "image",
  className = "",
  width = 1600,
  height = 900,
}: MediaContainerProps) {
  return (
    <figure className={`article-media ${className}`}>
      {type === "image" ? (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <video
          src={src}
          aria-label={alt}
          width={width}
          height={height}
          preload="none"
          controls
        />
      )}
    </figure>
  );
}

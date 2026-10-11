import { CONFIG } from "../data/config";
import { PROFILE } from "../data/profile";
import { CONTACT_DETAILS } from "../data/contact";

export function canonicalUrl(path: string) {
  const url = new URL(path, CONFIG.site.url);
  if (url.origin !== CONFIG.site.url)
    throw new Error("Canonical must belong to the configured site");
  url.search = "";
  url.hash = "";
  url.pathname =
    url.pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";
  return url.href;
}

export function pageSchema(path: string, title: string) {
  const url = canonicalUrl(path);
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  const names: Record<string, string> = {
    about: "About",
    contact: "Contact",
    work: "Selected work",
    blog: "Engineering notes",
    resume: "Public resume",
    tags: "Topics",
  };
  const crumbs = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Overview",
      item: canonicalUrl("/"),
    },
  ];
  segments.forEach((segment, index) =>
    crumbs.push({
      "@type": "ListItem",
      position: index + 2,
      name: index === segments.length - 1 ? title : names[segment] || segment,
      item: canonicalUrl(`/${segments.slice(0, index + 1).join("/")}`),
    }),
  );
  // /blog/tags has no standalone page: link the topic's parent to the archive.
  const validCrumbs = crumbs
    .filter((crumb) => !crumb.item.endsWith("/blog/tags"))
    .map((crumb, index) => ({ ...crumb, position: index + 1 }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${canonicalUrl("/")}#person`,
        name: PROFILE.name,
        jobTitle: PROFILE.headline,
        url: canonicalUrl("/"),
        sameAs: [
          ...PROFILE.contacts.map((contact) => contact.url),
          ...(CONTACT_DETAILS.linkedin ? [CONTACT_DETAILS.linkedin] : []),
        ],
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: validCrumbs,
      },
    ],
  };
}

export const serializeSchema = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");

// Social crawlers commonly require raster previews. SVG article illustrations
// remain in the article; sharing uses the existing, verified PNG fallback.
export const socialPreviewImage = (image?: string) =>
  image && !/\.svg(?:$|[?#])/i.test(image) ? image : "/images/social-card.png";

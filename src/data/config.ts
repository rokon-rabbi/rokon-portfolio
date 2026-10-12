import { THEMES } from "../design/tokens";

// The previous portfolio origin is the only user-supplied site URL.
// Override PUBLIC_SITE_URL when the final deployment origin is confirmed.
const siteUrl = new URL(
  import.meta.env.PUBLIC_SITE_URL || "https://rokonuzzaaman.web.app/",
);
if (
  siteUrl.protocol !== "https:" ||
  siteUrl.username ||
  siteUrl.password ||
  siteUrl.pathname !== "/" ||
  siteUrl.search ||
  siteUrl.hash
)
  throw new Error(
    "PUBLIC_SITE_URL must be an HTTPS origin without credentials, a path, query, or fragment",
  );

export const CONFIG = {
  // ---------------------------------------------------------------------------
  // Site Settings
  // ---------------------------------------------------------------------------
  site: {
    url: siteUrl.origin,
    locale: "en_US",
  },

  // ---------------------------------------------------------------------------
  // SEO Settings
  // ---------------------------------------------------------------------------
  seo: {
    titleTemplate: "%s | %n", // %s = page title, %n = DATA.displayName
    twitterCard: "summary" as const,
    robots: "index, follow",
  },

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------
  typography: {
    // Base font size as a percentage. 100 = browser default (16px).
    // 110 = 10% larger or 90 = 10% smaller, across all text, headings, and links simultaneously.
    baseFontSize: 100,
  },

  // ---------------------------------------------------------------------------
  // Blog Settings
  // ---------------------------------------------------------------------------
  blog: {
    postsPerPage: 10,
  },

  // Theme colors live in one shared source; Layout emits CSS variables.
  theme: THEMES,
} as const;

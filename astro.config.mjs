// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import { canonicalUrl } from "./src/lib/seo.ts";
import { productionArtifacts } from "./src/lib/production-artifacts.ts";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { remarkCodeMeta } from "./src/lib/remark-code-meta.ts";
import { CONFIG } from "./src/data/config.ts";
import { getWorkProjects, isProjectBrief, workHref } from "./src/lib/work.ts";
import { projectAssetsIntegration } from "./src/lib/project-assets.ts";

/** @type {import('rehype-pretty-code').Options} */
const prettyCodeOptions = {
  theme: {
    light: "github-light-high-contrast",
    dark: "github-dark-high-contrast",
  },
  keepBackground: false,
};

// https://astro.build/config
export default defineConfig({
  site: CONFIG.site.url,
  output: "static",
  outDir: "./dist/client",
  // Keep nested index files while Nginx enforces the existing slashless URLs.
  build: { format: "directory" },
  trailingSlash: "never",
  compressHTML: true,
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-src 'none'",
        "form-action 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", { resource: "'none'", kind: "attribute" }],
      },
      styleDirective: {
        resources: [
          "'self'",
          { resource: "'unsafe-inline'", kind: "attribute" },
        ],
      },
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    projectAssetsIntegration(),
    react(),
    mdx(),
    sitemap({
      serialize: (item) => ({ ...item, url: canonicalUrl(item.url) }),
      filter: (page) => {
        const path = new URL(page).pathname.replace(/\/$/, "");
        return (
          !/\/(design-system|404|preview)(\/|\.html|$)/.test(`${path}/`) &&
          !getWorkProjects()
            .filter(isProjectBrief)
            .some((project) => workHref(project) === path)
        );
      },
    }),
    productionArtifacts(),
  ],

  markdown: {
    syntaxHighlight: false,
    processor: unified({
      remarkPlugins: [remarkGfm, remarkCodeMeta],
      rehypePlugins: [[rehypePrettyCode, prettyCodeOptions]],
    }),
  },
});

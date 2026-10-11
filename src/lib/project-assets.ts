import { existsSync, realpathSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import type { Project } from "../schemas/portfolio";
import { getWorkProjects } from "./work";

/** Build-only validation. Never expose an unavailable or escaping media path. */
export function validateProjectAssets(project: Project, publicRoot: string) {
  for (const media of project.caseStudy.media) {
    const target = resolve(publicRoot, `.${media.src}`);
    if (!existsSync(target) || !statSync(target).isFile())
      throw new Error(`Missing project media: ${project.id}/${media.id}`);
    if (!realpathSync(target).startsWith(`${realpathSync(publicRoot)}${sep}`))
      throw new Error(`Project media escapes public assets: ${media.id}`);
  }
}

// Validate supplied media in Node before rendering either development or static pages.
export function projectAssetsIntegration(): AstroIntegration {
  return {
    name: "rokon-project-assets",
    hooks: {
      "astro:config:setup": ({ config }) => {
        getWorkProjects().forEach((project) =>
          validateProjectAssets(project, fileURLToPath(config.publicDir)),
        );
      },
    },
  };
}

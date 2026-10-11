import {
  readdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { resolve, relative, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { createHash } from "node:crypto";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000",
};

export function productionArtifacts(): AstroIntegration {
  let legacyServer: string | undefined;
  let origin: string | undefined;
  return {
    name: "rokon-production-artifacts",
    hooks: {
      "astro:config:setup": ({ command, config }) => {
        if (command !== "build") return;
        origin = config.site;
        // Astro empties outDir (dist/client), so the upstream dist/server survives.
        // Only remove this known generated legacy directory on a normal release build.
        if (
          resolve(fileURLToPath(config.outDir)) ===
          resolve(fileURLToPath(config.root), "dist/client")
        )
          legacyServer = resolve(fileURLToPath(config.root), "dist/server");
        const fixtures = [
          ...readdirSync(new URL("content/blog/", config.srcDir)),
          ...readdirSync(new URL("pages/", config.srcDir)),
        ].filter((name) => name.startsWith("qa-"));
        const isolatedQA =
          process.env.QA_ARTICLE_BUILD === "true" &&
          basename(dirname(fileURLToPath(config.outDir))).startsWith(
            "qa-article-csp-",
          );
        if (fixtures.length && !isolatedQA)
          throw new Error(
            "Refusing a release build while temporary QA articles exist. Complete fixture cleanup first.",
          );
      },
      "astro:build:start": () => {
        if (legacyServer)
          rmSync(legacyServer, { recursive: true, force: true });
      },
      "astro:build:done": ({ dir }) => {
        const root = fileURLToPath(dir);
        const pages: Record<string, Record<string, string>> = {};
        const headerLines = [
          "/*",
          ...Object.entries(SECURITY_HEADERS).map(
            ([name, value]) => `  ${name}: ${value}`,
          ),
        ];
        const nginx = [
          "# Generated: include in nginx's http context. Regenerate on every build.",
          "map $uri $site_csp {",
          "  default \"default-src 'none'; frame-ancestors 'none'; base-uri 'none'\";",
        ];
        const nginxRobots = ["map $uri $site_robots {", '  default "";'];
        const redirects: Record<string, string> = {};
        const routes: string[] = [];
        for (const name of readdirSync(root, { recursive: true }).sort()) {
          const file = String(name);
          if (!file.endsWith(".html")) continue;
          let html = readFileSync(resolve(root, file), "utf8");
          const meta = html.match(
            /<meta\s+http-equiv="content-security-policy"\s+content="([^"]+)"/i,
          );
          if (!meta) throw new Error(`Missing production CSP: ${file}`);
          // Astro cannot see bytes emitted by set:html or is:inline. Hash the final
          // rendered output, then use that exact policy in both HTML and headers.
          let metaPolicy = meta[1]
            .replace(/&#39;|&#x27;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, "&");
          for (const kind of ["script", "style"]) {
            const hashes = [
              ...html.matchAll(
                new RegExp(`<${kind}([^>]*)>([\\s\\S]*?)<\\/${kind}>`, "g"),
              ),
            ]
              .filter((match) => !/\bsrc=/.test(match[1]))
              .map(
                (match) =>
                  `'sha256-${createHash("sha256").update(match[2]).digest("base64")}'`,
              );
            metaPolicy = metaPolicy.replace(
              new RegExp(`(${kind}-src )([^;]*)`),
              (_, prefix, values) =>
                `${prefix}${[...new Set([...values.split(/\s+/), ...hashes])].filter(Boolean).join(" ")}`,
            );
          }
          const cspMeta = `${meta[0].replace(meta[1], metaPolicy.replaceAll('"', "&quot;"))}>`;
          html = html
            .replace(`${meta[0]}>`, "")
            .replace(/(<head>\s*<meta charset="[^"]+">)/, `$1${cspMeta}`);
          writeFileSync(resolve(root, file), html);
          const policy = `${metaPolicy}; frame-ancestors 'none'`;
          const headers: Record<string, string> = {
            "Content-Security-Policy": policy,
          };
          if (/<meta name="robots" content="noindex/i.test(html))
            headers["X-Robots-Tag"] = "noindex, follow";
          const filePath = `/${relative(root, resolve(root, file)).replaceAll("\\", "/")}`;
          pages[filePath] = headers;
          const route = filePath.replace(/\/index\.html$/, "") || "/";
          routes.push(route);
          if (filePath.endsWith("/index.html")) {
            redirects[filePath] = route;
            if (route !== "/") redirects[`${route}/`] = route;
          }
          const aliases = [
            ...new Set([
              route,
              ...(route !== "/" && !route.endsWith(".html")
                ? [`${route}/`]
                : []),
              filePath,
            ]),
          ];
          for (const alias of aliases) {
            headerLines.push(
              "",
              alias,
              ...Object.entries(headers).map(
                ([name, value]) => `  ${name}: ${value}`,
              ),
            );
            nginx.push(`  "${alias}" "${policy.replaceAll('"', '\\"')}";`);
            if (headers["X-Robots-Tag"])
              nginxRobots.push(`  "${alias}" "noindex, follow";`);
          }
        }
        nginx.push("}", "");
        nginxRobots.push("}", "");
        for (const extension of ["pdf", "txt"])
          headerLines.push(
            "",
            `/resume/rokon-resume.${extension}`,
            `  Content-Disposition: attachment; filename="Rokon-Resume.${extension}"`,
          );
        writeFileSync(resolve(root, "_headers"), `${headerLines.join("\n")}\n`);
        writeFileSync(
          resolve(root, "..", "security-headers.json"),
          JSON.stringify({ base: SECURITY_HEADERS, pages }, null, 2),
        );
        writeFileSync(
          resolve(root, "..", "nginx-security-map.conf"),
          [...nginx, ...nginxRobots].join("\n"),
        );
        writeFileSync(
          resolve(root, "..", "nginx-security-headers.conf"),
          [
            "# Generated: include in server and in any location that defines add_header.",
            ...Object.entries(SECURITY_HEADERS).map(
              ([name, value]) => `add_header ${name} "${value}" always;`,
            ),
            "add_header Content-Security-Policy $site_csp always;",
            "add_header X-Robots-Tag $site_robots always;",
            "",
          ].join("\n"),
        );
        writeFileSync(
          resolve(root, "..", "nginx-routing-map.conf"),
          [
            "# Generated aliases only; unknown paths still return 404.",
            "map $uri $site_redirect {",
            '  default "";',
            ...Object.entries(redirects).map(
              ([alias, target]) => `  "${alias}" "${target}";`,
            ),
            "}",
            "",
          ].join("\n"),
        );
        // Sitemap integration runs before this final hook. Include the alias and
        // compatibility headers in the build's complete transfer checksum inventory.
        copyFileSync(
          resolve(root, "sitemap-index.xml"),
          resolve(root, "sitemap.xml"),
        );
        const publicSha256 = Object.fromEntries(
          readdirSync(root, { recursive: true })
            .map(String)
            .sort()
            .filter((file) => statSync(resolve(root, file)).isFile())
            .map((file) => [
              file.replaceAll("\\", "/"),
              createHash("sha256")
                .update(readFileSync(resolve(root, file)))
                .digest("hex"),
            ]),
        );
        writeFileSync(
          resolve(root, "..", "static-build.json"),
          JSON.stringify(
            {
              output: "static",
              webRoot: "client",
              origin,
              routes,
              redirects,
              generatedAt: new Date().toISOString(),
              publicSha256,
            },
            null,
            2,
          ) + "\n",
        );
      },
    },
  };
}

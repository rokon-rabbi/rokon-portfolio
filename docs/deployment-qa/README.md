# Deployment workflow verification — 2026-10-11

The later [GitHub Actions CI/CD verification](ci-results.md) adds artifact provenance, SSH pinning, bounded release retention and a generated-site browser run. The counts below describe this earlier local Nginx rehearsal and are preserved as measured history.

The guide and scripts are ready for review with configurable placeholders. **No remote commands, VPS installation, public certificate issuance or production deployment were executed.** All release mutations occurred in owned `/tmp/portfolio-*` test directories, and all site requests went to localhost.

| Validation | Result |
| --- | --- |
| Production Astro build | Passed; 11 HTML pages, **37 regular public files**, complete public SHA-256 inventory |
| Astro diagnostics | 144 files; 0 errors, 0 warnings, 0 hints |
| TypeScript | `tsc --noEmit` passed |
| Node regression checks | **119 passed**, 0 failures/skips; includes 11 deployment cases |
| Shell/Python syntax | Bash `-n` and Python AST parsing passed |
| Real Nginx workflow | **8 scenarios passed**, **483 successful HTTPS assertions**, Nginx 1.30.5 |

The [raw workflow report](workflow-results.json) records action outputs, expected exit statuses, HTTPS assertion counts, image digest and observed Nginx version. The two expected nonzero actions are a deliberately failed candidate verification and rejection of an untrusted self-signed certificate. They test safeguards; the final site selection and verification passed. Test certificates/keys, releases and the owned container were removed afterward.

The real workflow tests:

1. An empty initial selection works with the exact wildcard Nginx include.
2. Default preview performs no filesystem/service changes.
3. Separate manual staging and activation run as a non-root user, validate Nginx, reload and verify HTTPS.
4. Switching `current` leaves old workers serving the old HTML and its exact CSP until reload. A new inline script and CSP hash in the second release make a mismatch observable.
5. Previous-release rollback verifies the old HTML/CSP while the displaced release's hashed asset remains available with immutable caching.
6. An injected post-reload verification failure restores both links, reloads and verifies the previous site; the failed artifact remains for inspection.
7. Explicit local CA trust succeeds; default public CA trust rejects the test certificate. No insecure TLS option is used.
8. The HTTP-01 webroot works alongside ordinary HTTP-to-HTTPS redirects with retained query strings.

The deployment cases also exercise checksum corruption, incomplete transfers, private file types, unsafe symlinks, configuration injection, immutable asset collisions, filesystem permissions, concurrent locks, failed first activation and an unrecoverable transaction journal that blocks further changes. Checksums cover all public build bytes and all prepared release sidecars; they detect accidental corruption, not authenticate a malicious build.

This pass fixed sealing order so a staged directory stays owner-writable until its atomic move, made XML verification accept both standard `text/xml` and `application/xml`, and added a build-authoritative file inventory. That inventory also exposed an earlier QA counter treating an empty directory as a public file: the baseline has **37 files**, rather than 38 entries. The corrected runner now uses regular-file stat checks.

Reproduce locally, after a production build:

```sh
node --test --test-isolation=none tests/*.test.mjs
bash -n deploy/deploy.sh deploy/rollback.sh deploy/check-deployment.sh
pnpm exec astro check
pnpm exec tsc --noEmit
node scripts/check-release-workflow.mjs
```

The Nginx runner requires Docker and the pinned official image described in the raw report. Docker is not required on the production VPS. It mounts generated test artifacts, not the source checkout; its temporary TLS material is for localhost verification only. The retained large Three.js bundle warning concerns the existing lazy enhancement; no dependency or application hydration changes were made here.

The actual OS, domain, port ownership, SSH method, existing services and deployment identity remain unconfirmed. Public DNS/TLS trust, Certbot renewal, installed Nginx/service privileges, filesystem security policy and other production sites still need administrator review and verification. Browser behavior and public-network performance remain covered by their separate [responsive QA](../15-responsive-interaction-qa.md) and [hardening](../14-production-hardening.md) reports; these deployment tests establish static release/serving behavior, not field Core Web Vitals.

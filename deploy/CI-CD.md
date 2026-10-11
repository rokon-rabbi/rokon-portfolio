# GitHub Actions CI/CD

**Production deployment is disabled until you confirm the VPS details and approve production access.** No GitHub settings, secrets, SSH connections or remote commands have been executed. Creating these files does not enable the deployment job: the repository variable `PRODUCTION_DEPLOY_ENABLED` must explicitly equal `true`. Leave it absent or `false` until the setup below has been reviewed. The domain, OS, ports, SSH method and existing sites are still unconfirmed. This guide uses configurable settings, with no invented VPS target.

## Workflows and trust boundaries

[`ci.yml`](../.github/workflows/ci.yml) validates pull requests, every push to `main`, and manual CI runs. GitHub-hosted Ubuntu 24.04 builds use **Node 24 LTS**, pnpm **12.6.0** matching `packageManager`, a frozen lockfile, Astro validation and TypeScript. Source tests run before building; the complete Node test suite runs afterward because route, CSP and deployment tests consume generated files. Critical output/inventory verification, bundle analysis and Chromium/Firefox/mobile Chromium Playwright tests must pass before the static artifact is published. Browser QA serves the generated output without rebuilding it. Draft fixture routes are excluded. Diagnostic uploads do not count as a successful build.

[`deploy.yml`](../.github/workflows/deploy.yml) is called by CI only after its build job succeeds on a `main` push and the explicit enable switch is set. Manual CI runs and pull requests cannot deploy. It downloads the artifact **from that same workflow run**, into runner temporary storage separate from the checkout. Run ID, attempt, commit, origin, every public-file checksum and all sidecar checksums must match. Deployment renders versioned Nginx configuration on the runner; it does not rebuild assets or install Node on the VPS. It does not use `workflow_run` or `pull_request_target` to execute untrusted artifacts with secrets.

All external actions use verified full commit SHAs, with release versions in comments. Review updates through a pull request rather than changing pins to floating tags. Build jobs have a read-only contents token, no production secrets and no dependency cache shared with deployment. The deployment token additionally reads Actions artifacts; it does not write repository contents or require a personal access token. Both credentials and the GitHub token are passed as environment values, never interpolated into shell command text.

The `production` environment gates deployment and rollback. The single `portfolio-vps-production` concurrency group prevents overlapping workflow operations; the VPS also locks the actual release transaction. `queue: max` retains up to 100 pending jobs rather than replacing pending rollback/deploy operations; in-progress deployments are not cancelled when a newer push arrives. Before upload and again before activation the runner checks that the build commit remains `main`'s head. Superseded commits are deliberately rejected so an older build cannot overwrite a newer one. Every push still receives CI validation; deploy the latest approved passing head. If `main` advances during the release transaction, its successful CI run follows afterward.

## Repository and environment setup

1. Confirm OS/version, domain/subdomain, DNS, existing web server and virtual hosts, current 80/443 usage, SSH connection/port, other production sites, deployment username and dedicated paths. Follow [the VPS guide](README.md) for installation, site include, directory permissions, TLS and reviewed service hooks. Do not enable CI/CD against an unreviewed server.
2. Protect `main` with required pull request approval and the **Validate and build** status check. Require checks to be current before merging; disallow force pushes/deletion and restrict bypasses where available. Require review of `.github/workflows/`, `deploy/`, build scripts and lockfile changes through CODEOWNERS using your actual maintainer/team names. The workflow cannot distinguish an approved push from an unreviewed direct push; branch rules enforce that policy.
3. Create the **production** environment, allow only `main`, configure required reviewers, prevent self-review and disable administrator bypass where your GitHub plan supports those controls. Environment protection is a GitHub setting, not established by YAML. If required reviewers are unavailable, keep deployment disabled until you explicitly accept branch-controlled automatic deployment after initial production approval.
4. Set repository variable `PUBLIC_SITE_URL` to the confirmed **HTTPS origin**, such as `https://<confirmed-domain>`, without subpaths, credentials, query or fragment. It must correspond exactly to `VPS_DOMAIN`. Until configured, CI uses the site's existing build origin for validation only; that origin is **not confirmation of a VPS domain**. Changing domain requires a new CI build, not an edit to generated HTML.
5. Add the following secrets to the `production` environment. The caller passes only these named secrets to the reusable workflow; environment values take precedence. Check that the job receives nonempty values. Do not add them to build steps, `.env`, artifacts or repository files.

| Environment secret          | Required value                                                                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VPS_SSH_PRIVATE_KEY`       | Dedicated noninteractive deployment private key; unrelated to your personal/root keys. Store its public key only on the dedicated VPS account.                                                                                                                  |
| `VPS_SSH_KNOWN_HOSTS`       | Reviewed OpenSSH lines for **only this target**: `host ssh-ed25519 BASE64_KEY`, or `[host]:port ssh-ed25519 BASE64_KEY` for a nonstandard SSH port. Literal host names/IPs only; no wildcards, hashes, multiple-host patterns or certificate-authority markers. |
| `VPS_SSH_HOST_FINGERPRINTS` | Independently verified `SHA256:...` fingerprints for exactly those host keys, separated by whitespace. Multiple pins support a reviewed key rotation.                                                                                                           |

Obtain host keys/fingerprints through the VPS provider console or an administrator over an already trusted channel. `ssh-keyscan` can collect a candidate key but does **not authenticate it**; compare its fingerprint out of band before storing it. Local `ssh-keygen -lf <reviewed-known-hosts-file> -E sha256` displays fingerprints. These commands are documentation only. The runner compares actual key fingerprints to the pin set before SSH and enforces `StrictHostKeyChecking yes`, `UpdateHostKeys no`, an isolated known-hosts file, key-only batch authentication and no agent forwarding. Unexpected key changes stop deployment; there is no insecure fallback.

## Configurable target settings

Set these noncredential **production environment variables** after target review. Paths must be normalized absolute Linux paths without spaces, shell/configuration characters or traversal. The base and incoming parent must be separate, dedicated real directories; neither may contain the other. No defaults are supplied for the target host, domain, account or site paths.

| Variable                          | Meaning                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `VPS_SSH_HOST`                    | Confirmed direct SSH DNS host or IP, matching the known-hosts entry.                                                                        |
| `VPS_SSH_PORT`                    | Confirmed SSH port; default 22 if absent.                                                                                                   |
| `VPS_SSH_USER`                    | Dedicated non-root deployment account.                                                                                                      |
| `VPS_DOMAIN`                      | Confirmed lowercase public DNS hostname, without scheme.                                                                                    |
| `VPS_BASE`                        | Site-owned base with `releases/`, `current`, `previous`, `shared/`; public ancestors traversable by Nginx.                                  |
| `VPS_INCOMING`                    | Existing deployment-owned private **0700** incoming directory outside the base.                                                             |
| `VPS_TLS_CERT`, `VPS_TLS_KEY`     | Stable, administrator-managed certificate-chain and private-key **paths**; key contents are never transferred.                              |
| `VPS_ACCESS_LOG`, `VPS_ERROR_LOG` | Dedicated, distinct Nginx log file paths; directories/rotation prepared by administrator.                                                   |
| `VPS_ACME_ROOT`                   | Optional existing ACME HTTP-01 webroot; omit for DNS validation.                                                                            |
| `VPS_CHECK_HOOK`                  | Administrator-owned absolute executable checking the complete Nginx configuration; no arguments from CI.                                    |
| `VPS_RELOAD_HOOK`                 | Administrator-owned absolute executable performing the approved graceful Nginx reload; no arguments from CI.                                |
| `VPS_KEEP_RELEASES`               | Total recent release target, including current/previous; default 5, minimum 2, maximum 100.                                                 |
| `VPS_MIN_RELEASE_AGE_HOURS`       | Grace period since creation or last activation/displacement; default/minimum 24 hours. Increase to cover the actual worker shutdown policy. |

`PRODUCTION_DEPLOY_ENABLED` must be a **repository variable**, because job conditions run before environment variables are available. The reusable workflow and transport both fail closed unless it is `true`. Only set it after your explicit initial production approval; return it to `false` to disable new deployments and workflow rollback. Manual administrator rollback remains available independently.

The transport supports direct SSH using the dedicated key, standard public HTTPS on port 443, and Nginx listeners 80/443. An SSH alias, bastion, certificate-based login, reverse proxy or different listener topology needs a reviewed adjustment after those details are supplied. It does not guess that topology or disable verification to accommodate it.

## VPS permissions and initial deployment

The non-root SSH account needs Bash, Python 3.10+, curl, rsync and sufficient space. Node, pnpm, source builds and GitHub tokens stay on the runner. The account owns only this site's base and private incoming parent. Configure its authorized key to prohibit agent/port forwarding and PTY (for example OpenSSH's `restrict` option, after checking support); do not grant root login, broad sudo or ownership of other applications. A general `command=` restriction would break SSH/rsync unless a reviewed allowlist dispatcher supports their exact operations.

An administrator creates the dedicated Nginx include and hook executables after inspecting the existing server. Any service privilege must be limited to fixed configuration-check/reload commands for the selected service. The account should not read TLS keys or write `/etc/nginx`. However, **the selected release contains Nginx configuration read by a privileged master**: the deployment account and approved `main` code remain trusted. Template validation prevents accidental/unexpected directives during this workflow; it is not a security boundary against a compromised account changing its own files. If the deployer is untrusted, keep configuration root-owned and require administrator activation instead.

Before the first automated release, rehearse [manual staging/activation and rollback](README.md#5-initial-manual-deployment), check the empty wildcard include, certificate trust/DNS, logs and existing hosts. Confirm hooks and filesystem permissions using the actual OS. Prepare independently stored backups. Only then approve production access, configure the settings above, and enable the repository switch. A fresh approved push to `main` builds for the confirmed domain, then waits for environment review where configured.

## Normal deployment and verification

The workflow creates a unique private incoming session using `mkdir` with exclusive creation; rsync transfers only the verified build and matching small release-tool bundle. It never uses `rsync --delete` or uploads the checkout, private references or credentials. Release IDs are `gh-RUN_ID-ATTEMPT-COMMIT_PREFIX`, so retries use a distinct attempt. After complete upload, the existing controller validates the origin, complete checksums, exact Nginx templates, CSP and routes; copies into private staging; seals files; publishes immutable assets; and atomically selects the new versioned release.

Activation checks the full Nginx configuration, gracefully reloads and runs the real HTTPS checker before committing the previous-release selection. That checker uses trusted certificate validation and exact expected bodies/CSP/404/redirect/feed/resume/asset/cache behavior. No `--offline`, custom test CA or TLS bypass is used by CI. On failure it attempts restoration and verification of both old links. An unresolved recovery journal blocks later changes; follow [the recovery instructions](README.md#8-rollback-and-backup) with the administrator.

After successful activation, retention validates **all** release entries before deleting any candidate. It protects current/previous, the most recent configured count and every release within the grace period. It creates private `.backups/RELEASE_ID.tar.gz`, reads the archive back to compare all file checksums, logs its digest, then removes only that verified owned release directory. Unknown, symlinked, corrupted or foreign-owned entries stop retention. Retention failure marks the job failed while the already verified new site remains active; inspect logs instead of assuming activation rolled back.

The count is a steady-state target: protected and recent releases may exceed it temporarily. Shared `/_astro` assets remain append-only for cached HTML and rollback. Retention archives, small tool/session records and failed incoming uploads are not automatically purged; monitor disk space and review off-server backup/cleanup separately. After full deployment/retention success the newly uploaded duplicate artifact is removed from its private session; the versioned tools remain for recovery. Existing sites, TLS, Nginx installation and administrator notes are untouched.

## Rollback

Run **Portfolio production deployment** manually from `main` in GitHub Actions. This dispatch performs **rollback only**: leave `release` empty for `previous`, or enter a retained safe release ID. It uses the same enable switch, production environment, pinned SSH keys, concurrency group, server lock and HTTPS checks. It does not download/rebuild a site or prune during rollback. A previous release must exist; first-deployment rollback has no previous target. Turning off deployment also disables this workflow path; use the independently reviewed manual scripts if needed.

For manual access use [rollback.sh](rollback.sh) with the matching retained tool bundle and administrator-reviewed hooks as documented in the VPS guide. Preview first, then `--apply`. If an archived release is needed, restore its verified backup and matching tools into an isolated directory for review; do not extract an archive over current production files. Reintroduce the reviewed sealed release and shared assets through the manual recovery procedure.

To preview release retention locally on the VPS, using the approved non-root account:

```sh
python3 '<reviewed-tools-directory>/release.py' prune \
  --base '<dedicated-site-base>' --domain '<confirmed-domain>' \
  --keep-releases 5 --min-age-hours 24
```

This defaults to plan only. Add `--apply` only after reviewing the candidates, worker grace period and backup policy. Do not prune shared assets with this operation.

## Local validation and limits

Run `pnpm install --frozen-lockfile`, Astro/TypeScript checks, `pnpm build`, `node --test --test-isolation=none tests/*.test.mjs`, and `node scripts/ci-browser.mjs` with locally installed Chromium/Firefox. `actionlint .github/workflows/ci.yml .github/workflows/deploy.yml` validates workflow syntax/expressions. Its current 1.7.12 release predates the documented GitHub `queue` key and reports that one unsupported-key diagnostic. For this version, `actionlint -ignore 'unexpected key "queue" for "concurrency" section' .github/workflows/ci.yml .github/workflows/deploy.yml` checks everything else; the key is separately verified against GitHub's current concurrency documentation. [The measured CI/CD report](../docs/deployment-qa/ci-results.md) records the actual local results. SSH tests generate disposable local keys and parse the effective OpenSSH configuration; they do not contact a server. The earlier [real local Nginx release rehearsal](../docs/deployment-qa/README.md) verifies atomic activation, old workers, HTTPS and recovery.

Local validation cannot prove GitHub environment/branch rules, secret configuration, hosted-runner availability, actual VPS SSH permissions, public certificate trust or other production hosts. Those require the confirmed target and your approved first deployment. No GitHub Actions run or production access is claimed here.

Primary references: [Node release support](https://github.com/nodejs/Release), [reusable workflows and environment secrets](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows), [environment protection availability/settings](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments), [GitHub secure use](https://docs.github.com/en/actions/reference/security/secure-use), [Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [OpenSSH configuration](https://man.openbsd.org/ssh_config).

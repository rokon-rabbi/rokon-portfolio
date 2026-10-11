# Static portfolio deployment on a Linux VPS

**Prepared for review; no VPS commands or deployment have been executed.** The manual release scripts run locally on whichever Linux machine you invoke them on. Deployment and rollback default to **plan only**; `--apply` is the explicit permission to change this site's files. Activation additionally requires reviewed configuration-check, graceful-reload and HTTPS-verification hooks. The separately gated [GitHub Actions transport](CI-CD.md) can use SSH after production approval and configuration. Explicit retention can archive and remove verified older releases; it never prunes shared assets or unrelated files. These tools do not install software, open ports, obtain certificates or change `/etc/nginx`.

Before replacing placeholders, provide the **OS/version, confirmed domain/subdomain, existing web server, current owners of ports 80/443, SSH method/alias/port/login user, and whether other production sites exist**. Deployment username, site base path, Nginx include directory, log paths and certificate strategy must also be selected. Those details have been requested and are still pending. OS-specific installation, service, firewall and sudoers commands are intentionally deferred. Do not treat `rokonuzzaaman.web.app`, the previously supplied build origin, as a confirmed VPS domain.

The complete route audit and measured static-hosting results are in [the architecture report](../docs/16-static-vps-hosting.md). Runtime serving needs Nginx and TLS; Node/pnpm are needed only on the build machine. These release tools additionally need **Bash, Python 3.10+, `curl`, and a local Linux filesystem supporting `flock`, hard links, atomic rename and fsync**. No Python packages are required. Shared asset publication and staged releases must stay on the same filesystem.

## 1. Server prerequisites

An administrator first inventories the OS, web-server configuration, virtual hosts, listening ports, certificate renewals, firewall, DNS A/AAAA records, disk space and service account. Confirm the domain is available for this site; account for IPv6 before publishing AAAA records. Record successful HTTPS checks for existing sites so they can be compared after the eventual reload. Save the existing web-server configuration and recovery procedure before changing it.

If another server already owns 80/443, use its reviewed routing or agree on a migration. Do not start a second server on occupied ports, replace an existing default host, disable a service, or alter firewall/SSH rules as part of these scripts. An existing Nginx installation can ordinarily add a dedicated virtual host for a distinct domain, subject to review of its current configuration.

## 2. Safe web-server installation

If Nginx is already installed, preserve its package source, include structure, modules and service lifecycle. If it is absent, choose the OS vendor's supported installation instructions after the OS/ports inventory; some package managers start a service automatically. Confirm that behavior before installation. No distribution or installation command is assumed here.

Add a new site-specific include from [nginx.conf.example](nginx.conf.example) inside the existing `http` context. Replace `@BASE@` with the selected dedicated base path. Do not copy this example over the main `nginx.conf`. The `[c]` wildcard matches only `nginx-site.conf` and permits an empty initial site selection. Review the generated `map_hash_bucket_size` and `$site_csp`, `$site_robots`, `$site_redirect` names against existing configuration. Reconcile duplicate directives in the source templates; variable renaming also requires matching changes to the artifact generator and validator. Rebuild before enabling the site.

The administrator must test the **complete** configuration and use a graceful reload, preserving other hosts. The scripts do not install or edit this include. Coordinate concurrent administrator edits: a reload reads the whole Nginx configuration, not just this site.

## 3. Dedicated deployment user

Create a dedicated non-root account with a primary group and an SSH method consistent with the selected OS/security policy. Use reviewed SSH keys or the existing approved SSH configuration; keep private keys on the connecting machine, outside this repository. This account owns only the site's base, private incoming artifacts and versioned deployment tools. It does not own `/etc/nginx`, TLS keys or other sites. Nginx workers receive read/traverse access to public files and no write access.

No blanket sudo permission is necessary for staging. Activation's check/reload hooks are provided and reviewed by the administrator, with only the required service privileges. They take **no arguments**, must check the full configuration and must exit nonzero on failure. The verification hook takes `--base`, `--domain`, `--release`; normally it is the included `check-deployment.sh`. The scripts never use `sudo`, `eval`, a shell command string or interactive credential prompts.

Nginx parses the release's configuration includes with its service privileges. The deployer must be trusted to maintain these includes; script validation is a safeguard, not a privilege boundary against a compromised deployment account. For an untrusted deployer, keep active configuration root-owned and require administrator review and activation instead of granting automated reload access. Do not install general-purpose privileged hooks or broad sudoers rules.

## 4. Directory creation and permissions

Use a dedicated base, separate from other sites. Fill these generic placeholders only after reviewing the server details:

```sh
DOMAIN='<confirmed-lowercase-DNS-domain>'
BASE='<absolute-site-base>'
DEPLOY_USER='<dedicated-non-root-account>'
DEPLOY_GROUP='<its-primary-group>'
TOOLS_DIR='<absolute-versioned-deploy-tools-directory>'
INCOMING_DIR='<absolute-private-incoming-directory-outside-BASE>'
SERVER_ADDRESS='<confirmed-server-IP-or-hostname>'
SSH_ALIAS='<reviewed-SSH-config-alias-if-used>'
SSH_PORT='<confirmed-SSH-port>'
SSH_LOGIN='<confirmed-SSH-login-account>'
```

The administrator can create **new** directories with the selected ownership. This is a template, not a command executed by the agent:

```sh
install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 0755 "$BASE"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 0700 "$TOOLS_DIR" "$INCOMING_DIR"
```

Do not use recursive `chown`/`chmod` on `/srv`, `/var/www`, home directories or an existing host. Confirm paths are newly allocated for this site and that every public ancestor is traversable by the actual Nginx worker. Account for SELinux/AppArmor and group/ACL policies on the chosen OS. The scripts require a real, deployment-owned base without group/world write access; incoming artifacts must be outside it.

```text
BASE/                              deployment-owned, 0755
  releases/                        0755; explicit CI retention after successful activation
    RELEASE_ID/                    sealed directory, 0555
      client/                      public HTML/media; files 0444, dirs 0555
      nginx-*.conf                 configuration outside web root
      nginx-hosting.json           paths/settings, no key material
      static-build.json
      security-headers.json
      release-receipt.json         identity, timestamp and SHA-256 inventory
  shared/_astro/                   dirs 0755, immutable files 0444
  current -> releases/RELEASE_ID   atomic selection
  previous -> releases/OLDER_ID    rollback selection
  .staging/                        0700; only new incomplete work is cleaned
  .deploy.lock                     deployment/rollback serialization
  deployment.log                   private deployment event log
  activation.pending              recovery journal, present during transition
  .backups/                       0700; verified retention archives, outside web roots
```

Nginx reads the selected release's configuration at reload, but each worker uses **explicit versioned roots** for HTML, CSP and route maps. Do not replace those paths with `/current/client`: older workers would read new HTML with old CSP hashes. `/_astro/` uses the shared immutable pool so both old and new cached HTML retain their assets after deployment or rollback. Published hashes are never overwritten; collisions abort staging. The pool is append-only and has no automatic pruning.

## 5. Initial manual deployment

On the **build machine**, use Node 22.12+ and pnpm 12.6.0. Select a unique safe release ID such as a reviewed timestamp plus commit identifier; do not reuse an ID. Only DNS hostname HTTPS origins are supported by these scripts, not subpath hosting. Build for the real domain before preparing configuration.

```sh
RELEASE_ID='<unique-safe-release-id>'
TLS_CERT='<absolute-server-certificate-chain-path>'
TLS_KEY='<absolute-server-private-key-path>'
ACCESS_LOG='<absolute-dedicated-access-log-path>'
ERROR_LOG='<absolute-dedicated-error-log-path>'
ACME_ROOT='<absolute-administrator-managed-ACME-webroot>'

pnpm install --frozen-lockfile
pnpm exec astro check
pnpm exec tsc --noEmit
PUBLIC_SITE_URL="https://$DOMAIN" pnpm build
node --test --test-isolation=none tests/*.test.mjs
pnpm prepare:vps --release-root "$BASE/releases/$RELEASE_ID" \
  --asset-root "$BASE/shared" \
  --access-log "$ACCESS_LOG" --error-log "$ERROR_LOG" \
  --certificate "$TLS_CERT" --private-key "$TLS_KEY" \
  --acme-root "$ACME_ROOT"
```

For DNS-based certificate validation, omit `--acme-root`. `--http-port`/`--https-port` can override listener ports only after the existing server topology is confirmed; they do not change canonical public URLs. The certificate/key flags describe **server paths**; no certificate or private-key bytes are included in artifacts.

Inspect `dist/client` and the generated configuration. Run the local Nginx/Playwright checks documented in the architecture report before packaging. Do not package the checkout, `.env`, `.git`, private references or an old `dist/server`.

```sh
ARTIFACT='<absolute-local-archive-path-outside-public>'
tar -C dist -czf "$ARTIFACT" client static-build.json security-headers.json \
  nginx-hosting.json nginx-site.conf nginx-static-server.conf \
  nginx-security-map.conf nginx-routing-map.conf nginx-security-headers.conf
sha256sum "$ARTIFACT"
```

Transfer this archive and the matching **entire `deploy/` tool bundle**, including `release.py` and `nginx/` templates, through the supplied/verified SSH connection. Host, alias, port, username and key usage are intentionally not guessed. Verify the archive checksum and inspect its member list before extracting into a **new private incoming directory**. Archive checksums detect corruption; SSH host verification and trusted build provenance establish authenticity. Do not extract an untrusted archive or overwrite live directories.

On the VPS, logged in as the deployment user, set `SOURCE` to that unpacked artifact directory and preview:

```sh
SOURCE='<absolute-unpacked-incoming-artifact-directory>'
bash "$TOOLS_DIR/deploy.sh" --base "$BASE" --domain "$DOMAIN" \
  --source "$SOURCE" --release "$RELEASE_ID"
```

Review the plan. Explicit staging does not change `current` or reload Nginx:

```sh
bash "$TOOLS_DIR/deploy.sh" --base "$BASE" --domain "$DOMAIN" \
  --source "$SOURCE" --release "$RELEASE_ID" --apply
bash "$TOOLS_DIR/check-deployment.sh" --base "$BASE" --domain "$DOMAIN" \
  --release "$RELEASE_ID" --offline
```

Staging checks the origin, generated Nginx templates, all HTML/CSP maps, static paths, inline hashes, private/runtime files, content copying and shared-asset collisions. It records checksums and seals files before publishing the release directory. Receipt hashes detect later corruption; they are not signatures.

After the administrator reviews/installs the dedicated include, confirms TLS readiness and prepares hooks, activate the already staged release:

```sh
CHECK_HOOK='<absolute-reviewed-config-check-executable>'
RELOAD_HOOK='<absolute-reviewed-graceful-reload-executable>'
bash "$TOOLS_DIR/deploy.sh" --base "$BASE" --domain "$DOMAIN" \
  --release "$RELEASE_ID" --activate --apply \
  --check-hook "$CHECK_HOOK" --reload-hook "$RELOAD_HOOK" \
  --verify-hook "$TOOLS_DIR/check-deployment.sh"
```

This initial activation sets `current`, tests the complete configuration, reloads, verifies HTTPS, then commits `previous`. A failed first activation restores an empty site selection and reloads without these virtual hosts; existing hosts are preserved by the administrator's dedicated include. The wildcard include is essential for that empty selection. Do not point a non-wildcard include at a missing current release.

## 6. HTTPS and certificate management

Confirm DNS and the selected ACME method first. For HTTP-01, an administrator uses the **commented, domain-specific bootstrap** in `nginx.conf.example` to expose only `/.well-known/acme-challenge/` at the chosen ACME webroot. It must coexist with existing hosts and occupy no conflicting server name. Prepare its log directory and test/reload the configuration before certificate issuance. Use Certbot's **certonly/webroot** flow to avoid automatic edits to unrelated Nginx hosts; a generic command template is:

```sh
certbot certonly --webroot --webroot-path "$ACME_ROOT" --domain "$DOMAIN"
```

The administrator runs this later, with the OS's approved installation and privileges. Once certificates exist, remove only the temporary bootstrap site file before activating final TLS hosts. Prepared final hosts retain the domain-specific ACME location when `--acme-root` is supplied, so renewal can succeed despite the ordinary HTTP-to-HTTPS redirect. DNS validation is an alternative when HTTP-01 is unsuitable; keep provider credentials administrator-controlled and outside the app/repository.

Configure and test the existing certificate-renewal timer and a successful-renewal hook that validates then gracefully reloads the selected Nginx service. Test renewal with the provider's staging/dry-run mechanism and verify it did not alter other sites. Monitor expiry. Keep keys root-restricted; the deployment user does not need to read them. Stable certificate paths allow renewal without rebuilding the app. No certificate issuance, renewal or private-key handling is automated by these deployment scripts.

TLS 1.2/1.3 and the application's existing HSTS/CSP/security headers remain intact. HSTS is not broadened to other subdomains. Optional HTTP/2 depends on the installed Nginx version and remains commented until reviewed.

## 7. Deployment verification

```sh
bash "$TOOLS_DIR/check-deployment.sh" --base "$BASE" --domain "$DOMAIN"
```

The default checker validates release checksums, shared assets, **trusted HTTPS**, exact HTML bodies and per-page CSP, noindex, real 404s, canonical aliases/query strings, RSS/robots/sitemaps/search JSON, resume attachments, all static files, critical MIME types and cache policies. It retries while graceful reload completes and never uses insecure TLS. `--release` checks a selected staged/active release; `--offline` checks integrity only and is **not** a production activation verification hook.

Before DNS cutover, `--connect-ip '<confirmed-server-IP>'` retains the domain for Host/SNI and certificate validation; `--https-port` supports a reviewed test topology. `--ca-cert` supplies an explicit trusted CA bundle, useful for isolated local tests. Normal public deployment uses the system CA store. The equivalent `CHECK_CONNECT_IP`, `CHECK_HTTPS_PORT`, `CHECK_CA_CERT` variables can configure the checker invoked as a hook; they contain no credentials. Scripts do not assume a successful reload means the new worker is ready.

Also repeat the existing Playwright mobile/desktop and cross-browser smoke checks against the deployed origin, visually inspect key pages, and compare existing production sites with their saved baseline. Curl verification does not prove client-side interactions, Core Web Vitals, certificate renewal or all other hosted services are healthy. Access/error logs are configured per virtual host; log directories/rotation are administered separately from this application. `deployment.log` records selections/recovery without credentials.

## 8. Rollback and backup

Preview the previous release, then explicitly apply it using the same reviewed hooks:

```sh
bash "$TOOLS_DIR/rollback.sh" --base "$BASE" --domain "$DOMAIN"
bash "$TOOLS_DIR/rollback.sh" --base "$BASE" --domain "$DOMAIN" --apply \
  --check-hook "$CHECK_HOOK" --reload-hook "$RELOAD_HOOK" \
  --verify-hook "$TOOLS_DIR/check-deployment.sh"
```

Use `--release '<retained-release-id>'` for an older explicit target. Rollback validates the sealed artifact and asset pool, atomically changes the selection, checks/reloads/verifies, and makes the displaced release `previous`. It does not rebuild the app, overwrite files, touch TLS keys or delete releases. Both deploy and rollback use the same site lock.

If configuration, reload or HTTPS verification fails, the scripts attempt to restore **both** old selection links, test/reload that configuration and verify the old release. Failed candidate directories remain for diagnosis. If recovery also fails, or the process/machine dies mid-transition, `activation.pending` records the old/previous/candidate IDs and blocks further deployment. Inspect the links, journal, full Nginx configuration, actual HTTPS response and logs with the administrator; restore the recorded selection and successfully validate/reload/verify before manually clearing the journal. Do not blindly delete it or rerun deployment. SIGINT/SIGTERM during activation initiate recovery; SIGKILL/power loss require this manual procedure.

Keep current and previous releases, older artifacts, the matching versioned tools, the shared asset pool and the reviewed site include in an access-controlled off-server backup. Verify backup SHA-256 inventories and periodically restore into a **new isolated directory**, validate offline, then rehearse activation there. Preserve relative `current`/`previous` symlinks. Back up certificate/private-key state separately under the administrator's encrypted backup policy; never package it with this public site.

Monitor disk usage. [The CI/CD guide](CI-CD.md) documents explicit release retention, private verified backups and a minimum 24-hour grace period. Manual deployments do not automatically prune. Shared assets and retention archives are never automatically deleted: review their off-server backup and longer-term cleanup policy separately, accounting for the one-year immutable browser cache. Retaining a release directory alone does not make its assets available to newly started workers; keep the shared pool too.

## 9. Troubleshooting

| Symptom | Check / safe next action |
| --- | --- |
| Built origin/root mismatch | Rebuild with the confirmed domain; prepare for the exact new ID/base. Do not patch sealed HTML/configuration. |
| Unexpected directives/CSP/checksum error | Re-transfer the trusted artifact; inspect corruption or template changes. Do not bypass validation. |
| Wrong site, certificate or connection refusal | Review DNS A/AAAA, domain/vhost matching, listener ownership and public TLS with the administrator. |
| 403 or missing media | Check ancestor traversal, file modes, actual Nginx worker, shared asset root and SELinux/AppArmor. Do not use chmod 777. |
| CSP blocks scripts/styles | Verify exact versioned HTML/map pairing; compare response CSP with `security-headers.json`. Do not weaken CSP globally. |
| Nginx map duplicate / configuration failure | Review the complete host config; reconcile source templates before preparing a new release. |
| Hash collision | Preserve the published bytes; fix the build's content-hash naming and use a new release. |
| Lock held | Determine which invocation owns it; coordinate rather than killing a deployment blindly. |
| `activation.pending` | Follow the administrator-assisted journal recovery procedure above. |
| Certificate renewal fails | Check the per-domain ACME location/DNS method and existing renewal timer/hook. |
| Rollback validator changed after a tools update | Restore the compatible reviewed tools bundle; do not edit old release receipts/configuration. |

## 10. Future updates

For each update: review content/credentials, build with the same confirmed public origin, run source/static/browser checks, allocate a fresh ID, prepare version-pinned configuration plus shared assets/logging, package/verify/transfer, preview, then explicitly apply and activate:

```sh
bash "$TOOLS_DIR/deploy.sh" --base "$BASE" --domain "$DOMAIN" \
  --source "$SOURCE" --release "$RELEASE_ID" --apply --activate \
  --check-hook "$CHECK_HOOK" --reload-hook "$RELOAD_HOOK" \
  --verify-hook "$TOOLS_DIR/check-deployment.sh"
```

No CI deployment credentials are embedded. Keep tooling compatible with retained release formats; dry-run rollback before adopting a changed validator/template bundle. Static article scheduling, publication changes, canonical domains and metadata require a rebuild. Application serving still needs no Node process, Cloudflare adapter or database. A future contact form requires a real endpoint and separately reviewed CSP/backend architecture.

## Local validation and limits

Run `node --test --test-isolation=none tests/deployment-scripts.test.mjs` for filesystem/transaction fault checks. `node scripts/check-release-workflow.mjs` rehearses the real Nginx/TLS workflow on localhost in an isolated temporary tree; Docker is a local test dependency only. This runner owns and stops its own container and never contacts a VPS. Measured results are stored in [deployment QA](../docs/deployment-qa/). Final VPS-specific installation, privileges, public DNS/TLS, renewal and other-site smoke checks remain pending until the requested environment details are supplied.

Primary references: [Nginx reload behavior](https://nginx.org/en/docs/beginners_guide.html#control), [Nginx access logging](https://nginx.org/en/docs/http/ngx_http_log_module.html), and [Certbot webroot/renewal guidance](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot).

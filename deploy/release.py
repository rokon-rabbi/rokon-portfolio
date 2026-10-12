#!/usr/bin/env python3
"""Linux-only static release tools. No SSH, package manager, sudo or shell eval."""
import argparse
import base64
import datetime as dt
import fcntl
import hashlib
import html.parser
import ipaddress
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time
from contextlib import contextmanager

TOOLS = Path(__file__).resolve().parent
SIDECARS = {
    "static-build.json", "security-headers.json", "nginx-hosting.json",
    "nginx-site.conf", "nginx-static-server.conf", "nginx-security-map.conf",
    "nginx-routing-map.conf", "nginx-security-headers.conf",
}
RECEIPT = "release-receipt.json"
BASE_HEADERS = {
    "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def safe_path(value):
    require(isinstance(value, str) and re.fullmatch(r"/[A-Za-z0-9/_.-]+", value)
            and ".." not in value.split("/"), "Server paths must be safe absolute paths without traversal")
    return str(Path(value))


def safe_id(value):
    require(isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,95}", value)
            and ".." not in value, "Release ID needs 1–96 safe characters, without '..'")
    return value


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest() if hasattr(hashlib, "file_digest") \
            else hashlib.sha256(stream.read()).hexdigest()


def inventory(root):
    files = {}
    for path in sorted(root.rglob("*")):
        require(not path.is_symlink(), f"Symlink forbidden in artifact: {path}")
        require(path.is_dir() or path.is_file(), f"Nonregular artifact: {path}")
        relative = path.relative_to(root).as_posix()
        require(re.fullmatch(r"[A-Za-z0-9_./-]+", relative), f"Unsafe artifact filename: {relative}")
        require(not any(part.startswith(".") or part.startswith("qa-") for part in Path(relative).parts),
                f"Private/QA artifact filename: {relative}")
        if path.is_file() and relative != RECEIPT:
            files[relative] = digest(path)
    return files


class Metadata(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.policy = None
        self.canonical = None
        self.noindex = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta" and attrs.get("http-equiv", "").lower() == "content-security-policy":
            self.policy = attrs.get("content")
        if tag == "meta" and attrs.get("name") == "robots":
            self.noindex = attrs.get("content", "").startswith("noindex")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")


def read_json(path):
    return json.loads(path.read_text())


def sync_directory(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def validate_artifact(root, base, domain, release_id, sealed=False):
    require(root.is_dir() and not root.is_symlink() and root.resolve() == root, "Artifact directory missing or symlinked")
    required = SIDECARS | {"client"} | ({RECEIPT} if sealed else set())
    require({p.name for p in root.iterdir()} == required,
            "Artifact must contain only client/ and the documented generated sidecars")
    hashes = inventory(root)
    require(not any(re.search(r"(?:^|/)(?:server|_worker\.js|wrangler[^/]*)(?:/|$)|\.(?:map|mjs)$", p)
                    for p in hashes), "Server, Worker or source-map artifacts are forbidden")
    public_extensions = {".html", ".css", ".js", ".json", ".xml", ".txt", ".pdf", ".woff", ".woff2",
                         ".svg", ".png", ".webp", ".avif", ".jpg", ".jpeg", ".gif", ".ico", ".wasm"}
    for name in hashes:
        if name.startswith("client/") and name != "client/_headers":
            require(Path(name).suffix.lower() in public_extensions, f"Unexpected public file type: {name}")
            if Path(name).suffix.lower() in {".html", ".css", ".js", ".json", ".xml", ".txt", ".svg"}:
                require(not re.search(rb"-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----|(?:AKIA|ASIA)[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{30,}",
                                      (root / name).read_bytes()), f"Credential pattern in public artifact: {name}")
    manifest, headers, hosting = (read_json(root / name) for name in
                                 ("static-build.json", "security-headers.json", "nginx-hosting.json"))
    require(manifest.get("output") == "static" and manifest.get("webRoot") == "client", "Not a static build")
    require(manifest.get("publicSha256") == {name.removeprefix("client/"): value for name, value in hashes.items()
                                            if name.startswith("client/")}, "Build file inventory/checksum mismatch; verify the transfer")
    require(manifest.get("origin") == f"https://{domain}", "Built origin does not match --domain; rebuild first")
    require(headers.get("base") == BASE_HEADERS, "Security header contract changed; review the tooling")
    expected_root = f"{base}/releases/{release_id}"
    require(hosting.get("releaseRoot") == expected_root, "Nginx release root does not match this release ID/base")
    require(hosting.get("origin") == manifest["origin"], "Nginx origin mismatch")
    require(hosting.get("assetRoot") == f"{base}/shared", "Prepare the shared /_astro asset root before deployment")
    require(hosting.get("accessLog") and hosting.get("errorLog"), "Prepare dedicated access and error logs")
    require(hosting.get("certificate") and hosting.get("privateKey"), "TLS file paths are required")
    require(hosting["accessLog"] != hosting["errorLog"], "Use different access and error logs")
    require(set(hosting) == {"releaseRoot", "origin", "assetRoot", "accessLog", "errorLog", "acmeRoot",
                            "certificate", "privateKey", "httpPort", "httpsPort"}, "Unknown hosting settings")
    for name in ("certificate", "privateKey", "assetRoot", "accessLog", "errorLog", "acmeRoot"):
        if hosting[name] is not None:
            safe_path(hosting[name])
            if name != "assetRoot":
                require(not hosting[name].startswith(str(base) + "/releases/"),
                        "TLS, logs and ACME state must live outside release directories")
    require(all(type(hosting[key]) is int and 1 <= hosting[key] <= 65535 for key in ("httpPort", "httpsPort"))
            and hosting["httpPort"] != hosting["httpsPort"], "Invalid listener ports")
    values = {
        "RELEASE_ROOT": expected_root, "ORIGIN": manifest["origin"], "SERVER_NAME": domain,
        "CERTIFICATE": hosting["certificate"], "PRIVATE_KEY": hosting["privateKey"],
        "HTTP_PORT": str(hosting["httpPort"]), "HTTPS_PORT": str(hosting["httpsPort"]),
        "ASSET_ROOT_DIRECTIVE": f"root {hosting['assetRoot']};",
        "LOG_DIRECTIVES": f"access_log {hosting['accessLog']} combined;\n    error_log {hosting['errorLog']} warn;",
        "ACME_LOCATION": f"location ^~ /.well-known/acme-challenge/ {{\n        root {hosting['acmeRoot']};\n        try_files $uri =404;\n    }}" if hosting["acmeRoot"] else "",
    }
    for name in ("site", "static-server"):
        template = (TOOLS / "nginx" / f"{name}.conf.template").read_text()
        expected = re.sub(r"@([A-Z_]+)@", lambda match: values[match[1]], template)
        require((root / f"nginx-{name}.conf").read_text() == expected,
                f"Unexpected directives in nginx-{name}.conf; regenerate from the reviewed template")
    pages = headers.get("pages", {})
    html_paths = sorted("/" + p.removeprefix("client/") for p in hashes if p.startswith("client/") and p.endswith(".html"))
    require(set(pages) == set(html_paths) and "/index.html" in pages and "/404.html" in pages,
            "CSP page manifest does not match every emitted HTML file")
    routes, redirects = [], {}
    nginx = ["# Generated: include in nginx's http context. Regenerate on every build.",
             "map $uri $site_csp {", "  default \"default-src 'none'; frame-ancestors 'none'; base-uri 'none'\";"]
    robots = ["map $uri $site_robots {", '  default "";']
    for path in html_paths:
        document = (root / "client" / path.lstrip("/")).read_bytes().decode("utf-8")
        meta = Metadata()
        meta.feed(document)
        require(meta.policy and re.fullmatch(r"[A-Za-z0-9' ;:/+_=.*-]+", meta.policy), "Invalid CSP syntax")
        policy = meta.policy + "; frame-ancestors 'none'"
        require(pages[path] == {"Content-Security-Policy": policy,
                **({"X-Robots-Tag": "noindex, follow"} if meta.noindex else {})}, "HTML/CSP/noindex mismatch")
        require(meta.canonical and meta.canonical.startswith(manifest["origin"] + "/"), "Wrong canonical origin")
        for kind in ("script", "style"):
            for attrs, content in re.findall(fr"<{kind}([^>]*)>([\s\S]*?)</{kind}>", document):
                if re.search(r"\bsrc=", attrs):
                    continue
                hashed = base64.b64encode(hashlib.sha256(content.encode()).digest()).decode()
                require(f"'sha256-{hashed}'" in meta.policy, f"Unhashed inline {kind} in {path}")
        route = path.removesuffix("/index.html") or "/"
        routes.append(route)
        if path.endswith("/index.html"):
            redirects[path] = route
            if route != "/":
                redirects[route + "/"] = route
        for alias in dict.fromkeys([route, *([route + "/"] if route != "/" and not route.endswith(".html") else []), path]):
            nginx.append(f'  "{alias}" "{policy}";')
            if meta.noindex:
                robots.append(f'  "{alias}" "noindex, follow";')
    require(manifest["routes"] == routes and manifest["redirects"] == redirects, "Static route manifest mismatch")
    require((root / "nginx-security-map.conf").read_text() == "\n".join(nginx + ["}", ""] + robots + ["}", ""]),
            "Nginx CSP/robots map differs from emitted HTML")
    routing = ["# Generated aliases only; unknown paths still return 404.", "map $uri $site_redirect {", '  default "";']
    routing.extend(f'  "{alias}" "{target}";' for alias, target in redirects.items())
    require((root / "nginx-routing-map.conf").read_text() == "\n".join(routing + ["}", ""]), "Unexpected routing map")
    directives = ["# Generated: include in server and in any location that defines add_header."]
    directives.extend(f'add_header {name} "{value}" always;' for name, value in BASE_HEADERS.items())
    directives.extend(["add_header Content-Security-Policy $site_csp always;", "add_header X-Robots-Tag $site_robots always;", ""])
    require((root / "nginx-security-headers.conf").read_text() == "\n".join(directives), "Unexpected security directives")
    require((root / "client/_astro").is_dir(), "Missing hashed browser assets")
    if sealed:
        receipt = read_json(root / RECEIPT)
        require(receipt.get("release") == release_id and receipt.get("domain") == domain
                and receipt.get("sha256") == hashes, "Release checksum/identity mismatch; do not activate")
    return manifest, headers, hashes


def managed_link(base, name):
    path = base / name
    if not path.is_symlink():
        require(not path.exists(), f"Refusing to replace unmanaged {name}")
        return None
    target = os.readlink(path)
    require(target.startswith("releases/") and target.count("/") == 1, f"Unmanaged {name} target")
    release_id = safe_id(target.split("/")[1])
    require((base / target).is_dir() and not (base / target).is_symlink(), f"Broken {name} target")
    return release_id


def atomic_link(base, name, release_id):
    managed_link(base, name)
    if release_id is None:
        (base / name).unlink(missing_ok=True)  # Only a validated managed symlink.
        sync_directory(base)
        return
    temporary = base / f".{name}-{os.getpid()}-{time.time_ns()}"
    temporary.symlink_to(f"releases/{safe_id(release_id)}")
    try:
        os.replace(temporary, base / name)  # Same filesystem: no unlink/create gap.
        sync_directory(base)
    finally:
        temporary.unlink(missing_ok=True)


def owned_regular(path):
    if path.exists() or path.is_symlink():
        require(not path.is_symlink() and path.is_file() and path.stat().st_uid == os.getuid(),
                f"Not an owned regular state file: {path}")


def log(base, action, release_id, **extra):
    path = base / "deployment.log"
    owned_regular(path)
    with path.open("a") as stream:
        stream.write(json.dumps({"time": dt.datetime.now(dt.timezone.utc).isoformat(),
                                "action": action, "release": release_id, **extra}) + "\n")


@contextmanager
def lock(base):
    owned_regular(base / ".deploy.lock")
    with (base / ".deploy.lock").open("a") as stream:
        try:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError("Another deployment/rollback holds the site lock") from None
        require(not (base / "activation.pending").exists(),
                "Unresolved activation.pending: inspect and recover with an administrator first")
        yield


def ensure_directory(path, mode=0o755):
    require(not path.is_symlink(), f"Directory may not be symlinked: {path}")
    if not path.exists():
        path.mkdir(mode=mode)
        path.chmod(mode)  # Public directories must remain readable despite umask 077.
    require(path.is_dir() and path.stat().st_uid == os.getuid()
            and not path.stat().st_mode & 0o022, f"Directory must be owned and not group/world writable: {path}")
    if mode == 0o755:
        require(path.stat().st_mode & 0o055 == 0o055, f"Public directory needs read/traverse permission: {path}")


def pool_assets(base, release):
    pool = base / "shared" / "_astro"
    for source in sorted((release / "client/_astro").rglob("*")):
        relative = source.relative_to(release / "client/_astro")
        target = pool / relative
        if source.is_dir():
            ensure_directory(target)
            continue
        require(not target.is_symlink(), "Symlink in asset pool")
        if target.exists():
            require(target.is_file() and digest(target) == digest(source),
                    f"Immutable asset name collision: {relative}; use a new content hash")
        else:
            # Publish complete bytes atomically, without replacing any existing hash.
            with tempfile.NamedTemporaryFile(dir=base / ".staging", delete=False) as out:
                temporary = Path(out.name)
                try:
                    with source.open("rb") as src:
                        shutil.copyfileobj(src, out)
                    out.flush()
                    os.fsync(out.fileno())
                    temporary.chmod(0o444)
                    os.link(temporary, target)
                    sync_directory(target.parent)
                finally:
                    temporary.unlink(missing_ok=True)


def check_pool(base, release):
    for directory in (base / "shared", base / "shared/_astro"):
        require(directory.is_dir() and not directory.is_symlink(), "Shared asset directories must be real directories")
    require(not any(path.is_symlink() for path in (base / "shared/_astro").rglob("*")), "Symlink in shared asset pool")
    for source in (release / "client/_astro").rglob("*"):
        if source.is_file():
            target = base / "shared/_astro" / source.relative_to(release / "client/_astro")
            require(target.is_file() and not target.is_symlink() and digest(target) == digest(source),
                    "Missing or changed shared asset; restore it before activation")


def stage(base, source, domain, release_id):
    _, _, original = validate_artifact(source, base, domain, release_id)
    for name, mode in (("releases", 0o755), ("shared", 0o755), (".staging", 0o700)):
        ensure_directory(base / name, mode)
    ensure_directory(base / "shared/_astro")
    destination = base / "releases" / release_id
    require(not destination.exists() and not destination.is_symlink(), "Release ID already exists; never overwrite")
    temporary = Path(tempfile.mkdtemp(prefix=f"{release_id}-", dir=base / ".staging"))
    try:
        shutil.copytree(source / "client", temporary / "client")
        for name in SIDECARS:
            shutil.copyfile(source / name, temporary / name)
        _, _, copied = validate_artifact(temporary, base, domain, release_id)
        require(copied == original, "Artifact changed while copying; rebuild/transfer again")
        (temporary / RECEIPT).write_text(json.dumps({"release": release_id, "domain": domain,
            "created": dt.datetime.now(dt.timezone.utc).isoformat(), "sha256": copied}, indent=2) + "\n")
        pool_assets(base, temporary)
        for path in temporary.rglob("*"):
            if path.is_file():
                with path.open("rb") as stream:
                    os.fsync(stream.fileno())
        for path in sorted((p for p in temporary.rglob("*") if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
            sync_directory(path)
        sync_directory(temporary)
        for path in temporary.rglob("*"):
            path.chmod(0o555 if path.is_dir() else 0o444)
        # Moving a directory across parents updates '..' and needs owner write.
        temporary.chmod(0o755)
        temporary.rename(destination)
        destination.chmod(0o555)
        sync_directory(destination.parent)
        log(base, "staged", release_id)
        print(f"Staged sealed release {release_id}; current was not changed.")
    finally:
        if temporary.exists():
            # Only this invocation's new staging directory is cleaned up.
            for path in temporary.rglob("*"):
                path.chmod(0o700 if path.is_dir() else 0o600)
            temporary.chmod(0o700)
            shutil.rmtree(temporary)


def run_hook(path, *args):
    require(path and Path(path).is_absolute() and Path(path).is_file() and os.access(path, os.X_OK),
            "Activation requires absolute executable check, reload and verification hooks")
    subprocess.run([path, *args], check=True, timeout=180)


def prune(args):
    """Only sealed, receipt-verified releases; never shared assets or active selections."""
    base = args.base
    require(not args.source and not args.activate and not args.release,
            "Prune takes retention settings, not a source or target release")
    require(2 <= args.keep_releases <= 100 and 24 <= args.min_age_hours <= 8760,
            "Keep 2–100 releases and a grace period of at least 24 hours")
    current, previous = managed_link(base, "current"), managed_link(base, "previous")
    require(current, "No current release; refusing retention")
    releases = base / "releases"
    ensure_directory(releases)
    now = dt.datetime.now(dt.timezone.utc)
    entries = []
    # Validate every entry before deleting anything; unknown files cause a safe stop.
    for path in releases.iterdir():
        release_id = safe_id(path.name)
        validate_artifact(path, base, args.domain, release_id, sealed=True)
        require(all(p.stat().st_uid == os.getuid() for p in [path, *path.rglob("*")]),
                "Release retention requires deployment-owned files")
        created = dt.datetime.fromisoformat(read_json(path / RECEIPT)["created"])
        require(created.tzinfo is not None and created <= now, "Invalid release creation time")
        entries.append((created, release_id, path))
    entries.sort(reverse=True)
    protected = {current, previous, *(item[1] for item in entries[:args.keep_releases])}
    # Age since last activation/rollback matters as well as creation time.
    last_used = {}
    history = base / "deployment.log"
    owned_regular(history)
    if history.exists():
        for line in history.read_text().splitlines():
            event = json.loads(line)
            if event.get("action") in ("activated", "activation-reverted"):
                used = dt.datetime.fromisoformat(event["time"])
                require(used.tzinfo is not None, "Invalid deployment history timestamp")
                # The displaced previous worker may still be draining after a reload.
                for name in ("release", "previous", "restored"):
                    if event.get(name):
                        last_used[event[name]] = max(last_used.get(event[name], used), used)
    candidates = [item for item in entries if item[1] not in protected and
                  (now - max(item[0], last_used.get(item[1], item[0]))).total_seconds() >= args.min_age_hours * 3600]
    if not args.apply:
        print(f"PLAN ONLY: archive/prune {[item[1] for item in candidates]}; current, previous and recent releases protected.")
        return
    backups = base / ".backups"
    ensure_directory(backups, 0o700)
    require(backups.stat().st_mode & 0o077 == 0, "Release backups must be private (0700)")
    for _, release_id, path in candidates:
        archive = backups / f"{release_id}.tar.gz"
        require(not archive.exists() and not archive.is_symlink(), "Backup already exists; review before pruning")
        with tempfile.NamedTemporaryFile(prefix=".backup-", dir=backups, delete=False) as stream:
            temporary = Path(stream.name)
        try:
            snapshot = {**inventory(path), RECEIPT: digest(path / RECEIPT)}
            with tarfile.open(temporary, "w:gz") as bundle:
                bundle.add(path, arcname=release_id, recursive=True)
            restored = {}
            with tarfile.open(temporary, "r:gz") as bundle:
                for member in bundle.getmembers():
                    require(member.isdir() or member.isfile(), "Unexpected archive member")
                    if member.isfile():
                        relative = member.name.removeprefix(release_id + "/")
                        restored[relative] = hashlib.sha256(bundle.extractfile(member).read()).hexdigest()
            require(restored == snapshot and inventory(path) == {k: v for k, v in snapshot.items() if k != RECEIPT},
                    "Release changed during backup; refusing deletion")
            with temporary.open("rb") as stream:
                os.fsync(stream.fileno())
            temporary.rename(archive)
            sync_directory(backups)
            log(base, "retention-backup", release_id, sha256=digest(archive))
            # Only this validated owned release directory is removed. No shared pool pruning.
            for directory in [path, *(p for p in path.rglob("*") if p.is_dir())]:
                directory.chmod(0o700)
            shutil.rmtree(path)
            sync_directory(releases)
            log(base, "pruned", release_id)
            print(f"Archived and pruned managed release {release_id}.")
        finally:
            temporary.unlink(missing_ok=True)


def activate(args, release_id):
    base = args.base
    old, previous = managed_link(base, "current"), managed_link(base, "previous")
    require(old != release_id, "Release is already current")
    require(old is not None or previous is None, "Previous exists without current; recover state first")
    target = base / "releases" / release_id
    validate_artifact(target, base, args.domain, release_id, sealed=True)
    check_pool(base, target)
    if old:
        validate_artifact(base / "releases" / old, base, args.domain, old, sealed=True)
        check_pool(base, base / "releases" / old)
    # Preflight hook paths without invoking them. Hooks never receive shell text.
    for hook in (args.check_hook, args.reload_hook, args.verify_hook):
        require(hook and Path(hook).is_absolute() and Path(hook).is_file() and os.access(hook, os.X_OK),
                "Supply all three reviewed executable hooks before activation")
    pending = base / "activation.pending"
    owned_regular(pending)
    with pending.open("x") as stream:
        json.dump({"old": old, "previous": previous, "candidate": release_id}, stream)
        stream.flush()
        os.fsync(stream.fileno())
    sync_directory(base)
    try:
        atomic_link(base, "current", release_id)
        run_hook(args.check_hook)
        run_hook(args.reload_hook)
        run_hook(args.verify_hook, "--base", str(base), "--domain", args.domain, "--release", release_id)
        atomic_link(base, "previous", old)
        log(base, "activated", release_id, previous=old)
    except BaseException:
        print("Activation failed; restoring the managed links and previous Nginx selection.", file=sys.stderr)
        try:
            atomic_link(base, "current", old)
            atomic_link(base, "previous", previous)
            run_hook(args.check_hook)
            run_hook(args.reload_hook)
            if old:
                run_hook(args.verify_hook, "--base", str(base), "--domain", args.domain, "--release", old)
            log(base, "activation-reverted", release_id, restored=old)
            pending.unlink()
            sync_directory(base)
        except BaseException as recovery:
            print(f"RECOVERY REQUIRED: {recovery}. activation.pending retained; do not deploy again.", file=sys.stderr)
        raise
    pending.unlink()
    sync_directory(base)
    print(f"Activated {release_id}; previous={old or '(none)'}. No release directories were deleted.")


def fetch(args, path):
    origin = f"https://{args.domain}" + (f":{args.https_port}" if args.https_port != 443 else "")
    with tempfile.TemporaryDirectory(prefix="static-verify-") as temporary:
        headers, body = Path(temporary) / "headers", Path(temporary) / "body"
        command = ["curl", "--silent", "--show-error", "--proto", "=https", "--tlsv1.2", "--max-time", "15",
                   "--max-redirs", "0", "--dump-header", str(headers), "--output", str(body),
                   "--write-out", "%{http_code}"]
        if args.connect_ip:
            ipaddress.ip_address(args.connect_ip)
            address = f"[{args.connect_ip}]" if ":" in args.connect_ip else args.connect_ip
            command.extend(["--noproxy", args.domain, "--resolve", f"{args.domain}:{args.https_port}:{address}"])
        if args.ca_cert:
            command.extend(["--cacert", args.ca_cert])
        result = subprocess.run([*command, origin + path], capture_output=True, text=True, timeout=20)
        require(result.returncode == 0, f"HTTPS request failed: {result.stderr.strip()}")
        lines = headers.read_text().replace("\r", "").strip().split("\n\n")[-1].splitlines()[1:]
        values = {name.strip().lower(): value.strip() for line in lines if ":" in line
                  for name, value in [line.split(":", 1)]}
        return int(result.stdout), values, body.read_bytes()


def verify_once(args, release_id):
    release = args.base / "releases" / release_id
    manifest, policies, _ = validate_artifact(release, args.base, args.domain, release_id, sealed=True)
    check_pool(args.base, release)
    if args.offline:
        print(f"Offline integrity passed for {release_id}; live HTTPS was not tested.")
        return
    checks = 0
    for page, policy in policies["pages"].items():
        route = page.removesuffix("/index.html") or "/"
        status, headers, body = fetch(args, route)
        require(status == (404 if page == "/404.html" else 200), f"Wrong status at {route}: {status}")
        require(body == (release / "client" / page.lstrip("/")).read_bytes(), f"Wrong release body at {route}")
        require(headers.get("content-type", "").startswith("text/html"), f"Wrong HTML MIME at {route}")
        for name, value in {**BASE_HEADERS, **policy}.items():
            require(headers.get(name.lower()) == value, f"Wrong {name} at {route}")
        require(headers.get("cache-control") == ("no-store" if page == "/404.html" else "no-cache"), "Wrong HTML cache policy")
        checks += 1
    for alias, canonical in manifest["redirects"].items():
        status, headers, _ = fetch(args, alias + "?deploy-check=1")
        require(status == 308 and headers.get("location") == canonical + "?deploy-check=1", "Canonical redirect mismatch")
        checks += 1
    for path in ("/not-a-real-deployment-route/deep", "/_astro/missing.js", "/_headers", "/.env", "/server/entry.mjs"):
        status, headers, body = fetch(args, path)
        require(status == 404 and body == (release / "client/404.html").read_bytes()
                and headers.get("cache-control") == "no-store"
                and headers.get("content-security-policy") == policies["pages"]["/404.html"]["Content-Security-Policy"]
                and headers.get("x-robots-tag") == "noindex, follow", "Custom 404/security mismatch")
        checks += 1
    for path, mime in {"/robots.txt": "text/plain",
                       "/sitemap.xml": "application/xml", "/sitemap-index.xml": "application/xml",
                       "/sitemap-0.xml": "application/xml", "/blog/search-index.json": "application/json",
                       "/resume/rokon-resume.pdf": "application/pdf", "/resume/rokon-resume.txt": "text/plain"}.items():
        status, headers, body = fetch(args, path)
        actual_mime = headers.get("content-type", "").split(";", 1)[0]
        allowed_mimes = {"application/xml", "text/xml"} if mime == "application/xml" else {mime}
        require(status == 200 and actual_mime in allowed_mimes
                and body == (release / "client" / path.lstrip("/")).read_bytes(),
                f"Static endpoint failed: {path} (status={status}, MIME={actual_mime})")
        require(headers.get("x-content-type-options") == "nosniff", "Endpoint security headers missing")
        if path.startswith("/resume/"):
            extension = path.rsplit(".", 1)[1]
            require(headers.get("content-disposition") == f'attachment; filename="Rokon-Resume.{extension}"', "Download filename mismatch")
        checks += 1
    endpoint_paths = {"robots.txt", "sitemap.xml", "sitemap-index.xml", "sitemap-0.xml",
                      "blog/search-index.json", "resume/rokon-resume.pdf", "resume/rokon-resume.txt"}
    for asset in sorted((release / "client").rglob("*")):
        if asset.is_file():
            relative = asset.relative_to(release / "client").as_posix()
            if asset.suffix == ".html" or relative == "_headers" or relative in endpoint_paths:
                continue
            path = "/" + relative
            status, headers, body = fetch(args, path)
            cache = "public, max-age=31536000, immutable" if relative.startswith("_astro/") else "public, max-age=3600"
            require(status == 200 and body == asset.read_bytes()
                    and headers.get("cache-control") == cache, f"Static asset/cache mismatch at {path}")
            if asset.suffix in (".css", ".js", ".svg"):
                mime = headers.get("content-type", "").split(";", 1)[0]
                require(mime in {".css": {"text/css"}, ".js": {"application/javascript", "text/javascript"},
                                 ".svg": {"image/svg+xml"}}[asset.suffix], f"Wrong asset MIME at {path}")
            checks += 1
    print(f"HTTPS verification passed for {release_id}: {checks} checks; certificate validation enabled.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("deploy", "rollback", "verify", "prune"))
    parser.add_argument("--base", required=True, help="Dedicated existing site base directory")
    parser.add_argument("--domain", required=True, help="Confirmed public DNS hostname, without scheme")
    parser.add_argument("--release", help="New release ID, rollback target, or verification target")
    parser.add_argument("--source", help="Prepared static artifact directory (deploy only)")
    parser.add_argument("--apply", action="store_true", help="Explicitly allow local filesystem changes")
    parser.add_argument("--activate", action="store_true", help="Activate after staging, or activate an existing sealed release (deploy only)")
    parser.add_argument("--check-hook", help="Reviewed executable: validate the complete Nginx configuration")
    parser.add_argument("--reload-hook", help="Reviewed executable: graceful Nginx reload")
    parser.add_argument("--verify-hook", help="Executable HTTPS checker; receives base/domain/release flags")
    parser.add_argument("--offline", action="store_true", help="Integrity only; verify operation only")
    parser.add_argument("--connect-ip", help="Verify this IP while retaining domain/SNI")
    parser.add_argument("--https-port", type=int, default=int(os.environ.get("CHECK_HTTPS_PORT", "443")))
    parser.add_argument("--ca-cert", help="Explicit CA bundle; TLS validation stays enabled")
    parser.add_argument("--attempts", type=int, default=10, help="HTTPS retries while a graceful reload completes")
    parser.add_argument("--keep-releases", type=int, default=5, help="Prune: retained releases, including current/previous")
    parser.add_argument("--min-age-hours", type=int, default=24, help="Prune: minimum age since creation/last use")
    args = parser.parse_args()
    require(os.getuid() != 0, "Run as the dedicated non-root deployment user")
    require(sys.version_info >= (3, 10), "Python 3.10+ is required")
    args.base = Path(safe_path(args.base))
    require(args.base.is_dir() and args.base.resolve() == args.base and args.base.stat().st_uid == os.getuid()
            and not args.base.stat().st_mode & 0o022, "Base must be a real, owned directory without group/world write access")
    require(len(args.domain) <= 253 and "." in args.domain and all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
            for label in args.domain.split(".")), "Use a confirmed lowercase DNS hostname")
    require(1 <= args.https_port <= 65535 and 1 <= args.attempts <= 30, "Invalid verification port/retry count")
    if args.operation == "verify":
        args.connect_ip = args.connect_ip or os.environ.get("CHECK_CONNECT_IP")
        args.ca_cert = args.ca_cert or os.environ.get("CHECK_CA_CERT")
        require(not args.apply and not args.activate and not args.source, "Verify is read-only")
        release_id = safe_id(args.release) if args.release else managed_link(args.base, "current")
        require(release_id, "No current release; provide --release for a staged release")
        for attempt in range(args.attempts):
            try:
                verify_once(args, release_id)
                return
            except (ValueError, subprocess.TimeoutExpired) as error:
                if args.offline or attempt == args.attempts - 1:
                    raise
                print(f"Waiting for verified release ({attempt + 1}/{args.attempts}): {error}", file=sys.stderr)
                time.sleep(1)
    require(not args.offline and not args.ca_cert and not args.connect_ip,
            "Verification options belong to check-deployment.sh (or its CHECK_* environment)")
    require(not (args.base / "activation.pending").exists(), "Unresolved activation.pending; recover before proceeding")
    managed_link(args.base, "current")
    managed_link(args.base, "previous")
    if args.operation == "prune":
        if args.apply:
            with lock(args.base):
                prune(args)
        else:
            prune(args)
        return
    if args.operation == "deploy":
        require(args.release, "Deploy needs a --release ID")
        release_id = safe_id(args.release)
        if not args.source:
            require(args.activate, "Provide --source to stage, or --activate for an existing release")
            validate_artifact(args.base / "releases" / release_id, args.base, args.domain, release_id, sealed=True)
            check_pool(args.base, args.base / "releases" / release_id)
            if not args.apply:
                print(f"PLAN ONLY: activate sealed release {release_id}; no files or services changed.")
                return
            with lock(args.base):
                activate(args, release_id)
            return
        source = Path(args.source).resolve()
        require(not source.is_relative_to(args.base), "Incoming artifact must be outside the site base")
        validate_artifact(source, args.base, args.domain, release_id)
        require(not (args.base / "releases" / release_id).exists(), "Release ID already exists")
        if not args.apply:
            print(f"PLAN ONLY: stage {source} into {args.base}/releases/{release_id}; "
                  f"activation={'requested' if args.activate else 'not requested'}. No files or services changed.")
            return
        with lock(args.base):
            stage(args.base, source, args.domain, release_id)
            if args.activate:
                activate(args, release_id)
    else:
        require(not args.source and not args.activate, "Rollback accepts a target release, not source/activate")
        release_id = safe_id(args.release) if args.release else managed_link(args.base, "previous")
        require(release_id, "No previous release; provide an existing --release")
        validate_artifact(args.base / "releases" / release_id, args.base, args.domain, release_id, sealed=True)
        check_pool(args.base, args.base / "releases" / release_id)
        if not args.apply:
            print(f"PLAN ONLY: activate existing release {release_id}; no files or services changed.")
            return
        with lock(args.base):
            activate(args, release_id)


if __name__ == "__main__":
    os.umask(0o077)
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(143))
    signal.signal(signal.SIGINT, lambda *_: sys.exit(130))
    try:
        main()
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)

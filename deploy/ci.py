#!/usr/bin/env python3
"""GitHub runner transport. No production action without an explicit enable flag.

The remote subcommand uses only the existing non-root release controller.
No credentials, build tools, package installation or general sudo run on the VPS.
"""
import ipaddress
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile

TOOLS = Path(__file__).resolve().parent


def require(condition, message):
    if not condition:
        raise ValueError(message)


def path_value(value):
    require(isinstance(value, str) and re.fullmatch(r"/[A-Za-z0-9/_.-]+", value)
            and ".." not in value.split("/") and str(Path(value)) == value and value != "/",
            "Set a normalized, dedicated absolute VPS path without traversal")
    return value


def release_value(value):
    require(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,95}", value or "")
            and ".." not in value, "Invalid release ID")
    return value


def configuration(env):
    require(env.get("DEPLOY_APPROVED") == "true", "Production access is disabled; explicit approval and setup are required")
    operation = env.get("DEPLOY_OPERATION")
    require(operation in ("deploy", "rollback"), "Invalid production operation")
    require(env.get("GITHUB_REF") == "refs/heads/main" and
            env.get("GITHUB_EVENT_NAME") == ("push" if operation == "deploy" else "workflow_dispatch"),
            "Production accepts only main pushes or main manual rollback")
    commit = env.get("DEPLOY_COMMIT", "")
    require(re.fullmatch(r"[a-f0-9]{40}", commit) and commit == env.get("GITHUB_SHA"), "Approved commit mismatch")
    run, attempt = env.get("GITHUB_RUN_ID", ""), env.get("GITHUB_RUN_ATTEMPT", "")
    require(re.fullmatch(r"\d+", run) and re.fullmatch(r"\d+", attempt), "Missing GitHub run identity")
    domain = env.get("VPS_DOMAIN", "")
    require(len(domain) <= 253 and "." in domain and all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", label)
            for label in domain.split(".")), "Set the confirmed VPS DNS domain")
    result = {"operation": operation, "domain": domain, "commit": commit, "run": run, "attempt": attempt,
              "release": release_value(f"gh-{run}-{attempt}-{commit[:12]}") if operation == "deploy"
              else (release_value(env["DEPLOY_ROLLBACK_RELEASE"]) if env.get("DEPLOY_ROLLBACK_RELEASE") else None)}
    for key, setting in (("base", "VPS_BASE"), ("incoming", "VPS_INCOMING"), ("checkHook", "VPS_CHECK_HOOK"),
                         ("reloadHook", "VPS_RELOAD_HOOK"), ("certificate", "VPS_TLS_CERT"),
                         ("privateKey", "VPS_TLS_KEY"), ("accessLog", "VPS_ACCESS_LOG"), ("errorLog", "VPS_ERROR_LOG")):
        result[key] = path_value(env.get(setting, ""))
    result["acmeRoot"] = path_value(env["VPS_ACME_ROOT"]) if env.get("VPS_ACME_ROOT") else None
    require(not Path(result["incoming"]).is_relative_to(result["base"]) and
            not Path(result["base"]).is_relative_to(result["incoming"]), "Incoming and site base must be separate dedicated paths")
    result["keep"] = int(env.get("VPS_KEEP_RELEASES") or "5")
    result["minAge"] = int(env.get("VPS_MIN_RELEASE_AGE_HOURS") or "24")
    require(2 <= result["keep"] <= 100 and 24 <= result["minAge"] <= 8760, "Invalid release retention policy")
    return result


def host_settings(env):
    host, user = env.get("VPS_SSH_HOST", ""), env.get("VPS_SSH_USER", "")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        require(len(host) <= 253 and all(re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?", label)
                for label in host.split(".")), "Invalid SSH host")
    require(re.fullmatch(r"[a-z_][a-z0-9_-]{0,31}", user) and user != "root", "Use a dedicated non-root SSH account")
    port = int(env.get("VPS_SSH_PORT") or "22")
    require(1 <= port <= 65535, "Invalid SSH port")
    return host, user, port


def ssh_configuration(directory, env):
    host, user, port = host_settings(env)
    target = host if port == 22 else f"[{host}]:{port}"
    known = env.get("VPS_SSH_KNOWN_HOSTS", "")
    lines = [line.split() for line in known.splitlines() if line.strip() and not line.startswith("#")]
    require(lines and all(len(line) >= 3 and line[0] == target and line[1] in
                         ("ssh-ed25519", "ecdsa-sha2-nistp256", "ssh-rsa") for line in lines),
            "Known hosts must contain only explicit pinned keys for the configured host/port")
    pins = set(env.get("VPS_SSH_HOST_FINGERPRINTS", "").split())
    require(pins and all(re.fullmatch(r"SHA256:[A-Za-z0-9+/]{43}", pin) for pin in pins), "Supply verified SHA256 host fingerprints")
    key, hosts, config = (directory / name for name in ("identity", "known_hosts", "ssh_config"))
    key.write_text(env.get("VPS_SSH_PRIVATE_KEY", "") + "\n")
    hosts.write_text(known + "\n")
    key.chmod(0o600)
    hosts.chmod(0o600)
    check = subprocess.run(["ssh-keygen", "-l", "-E", "sha256", "-f", str(hosts)], capture_output=True, text=True)
    actual = {line.split()[1] for line in check.stdout.splitlines() if len(line.split()) > 1}
    require(check.returncode == 0 and actual == pins, "Known-host keys do not match the independently verified fingerprints")
    # No passphrase prompts, agents, logs of private/public key contents or insecure fallback.
    check = subprocess.run(["ssh-keygen", "-y", "-P", "", "-f", str(key)], capture_output=True)
    require(check.returncode == 0, "Provide a valid dedicated noninteractive deployment private key")
    config.write_text(f"""Host portfolio-target
    HostName {host}
    User {user}
    Port {port}
    IdentityFile {shlex.quote(str(key))}
    UserKnownHostsFile {shlex.quote(str(hosts))}
    GlobalKnownHostsFile /dev/null
    StrictHostKeyChecking yes
    UpdateHostKeys no
    IdentitiesOnly yes
    BatchMode yes
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    ForwardAgent no
    ClearAllForwardings yes
    RequestTTY no
    ConnectTimeout 15
    ServerAliveInterval 15
    ServerAliveCountMax 4
    LogLevel ERROR
""")
    config.chmod(0o600)
    return config


# Fixed code only; user-controlled arguments arrive as separately quoted argv.
CREATE_SESSION = """import os,sys,pathlib
assert os.getuid() != 0, 'Non-root SSH required'
p=pathlib.Path(sys.argv[1]); child=p/sys.argv[2]
assert p.is_dir() and p.resolve()==p and p.stat().st_uid==os.getuid() and p.stat().st_mode & 0o077==0, 'Private owned incoming directory required'
os.mkdir(child, 0o700)
"""


def current_main(env):
    require(re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", env.get("GITHUB_REPOSITORY", "")), "Invalid GitHub repository")
    require(env.get("GH_TOKEN"), "Missing read-only GitHub token")
    result = subprocess.run(["gh", "api", f"repos/{env['GITHUB_REPOSITORY']}/git/ref/heads/main", "--jq", ".object.sha"],
                            capture_output=True, text=True, env=env)
    require(result.returncode == 0 and result.stdout.strip() == env["DEPLOY_COMMIT"],
            "Main has advanced or could not be verified; this older build will not be activated")


def runner(env):
    request = configuration(env)  # Fail before any SSH or credential file if not approved/configured.
    host_settings(env)
    if request["operation"] == "deploy":
        current_main(env)
    with tempfile.TemporaryDirectory(prefix="portfolio-ci-") as temporary:
        root = Path(temporary)
        root.chmod(0o700)
        config = ssh_configuration(root, env)
        payload = root / "payload"
        payload.mkdir()
        bundle = payload / "tools"
        bundle.mkdir()
        for name in ("ci.py", "release.py", "deploy.sh", "rollback.sh", "check-deployment.sh"):
            shutil.copyfile(TOOLS / name, bundle / name)
        (bundle / "nginx").mkdir()
        for name in ("site.conf.template", "static-server.conf.template"):
            shutil.copyfile(TOOLS / "nginx" / name, bundle / "nginx" / name)
        (payload / "request.json").write_text(json.dumps(request))
        if request["operation"] == "deploy":
            source = Path(env.get("DEPLOY_ARTIFACT", ""))
            require(source.is_absolute() and source.is_dir() and source.resolve() == source, "Downloaded artifact directory missing")
            # Preparation checks exact file list, run/SHA/origin and checksums before transport.
            shutil.copytree(source, payload / "artifact", symlinks=True)
            subprocess.run(["node", str(TOOLS.parent / "scripts/ci-artifacts.mjs"), "prepare",
                            str(payload / "artifact"), str(payload / "request.json")], check=True)
        session_id = release_value(f"ci-{request['operation']}-{request['run']}-{request['attempt']}")
        remote_path = request["incoming"] + "/" + session_id
        ssh = ["ssh", "-F", str(config), "portfolio-target"]
        subprocess.run([*ssh, shlex.join(["python3", "-c", CREATE_SESSION, request["incoming"], session_id])], check=True)
        subprocess.run(["rsync", "--recursive", "--quiet", "--protect-args", "--chmod=D700,F600",
                        "--rsh", shlex.join(["ssh", "-F", str(config)]), str(payload) + "/",
                        f"portfolio-target:{remote_path}/"], check=True)
        if request["operation"] == "deploy":
            current_main(env)  # Check again after upload, before touching the current release.
        subprocess.run([*ssh, shlex.join(["python3", remote_path + "/tools/ci.py", "remote", remote_path])], check=True)
    print("Production operation completed and verified.")


def remote(session):
    require(os.getuid() != 0, "Never deploy as root")
    directory = Path(path_value(session))
    require(directory.resolve() == directory and directory.is_dir() and directory.stat().st_uid == os.getuid()
            and directory.stat().st_mode & 0o077 == 0 and TOOLS == directory / "tools", "Invalid private CI session")
    request = json.loads((directory / "request.json").read_text())
    require(request["operation"] in ("deploy", "rollback"), "Invalid operation")
    base, domain = path_value(request["base"]), request["domain"]
    for key in ("checkHook", "reloadHook"):
        path_value(request[key])
    for name in ("deploy.sh", "rollback.sh", "check-deployment.sh"):
        (TOOLS / name).chmod(0o700)
    common = ["--base", base, "--domain", domain]
    hooks = ["--check-hook", request["checkHook"], "--reload-hook", request["reloadHook"],
             "--verify-hook", str(TOOLS / "check-deployment.sh")]
    if request["operation"] == "deploy":
        subprocess.run([sys.executable, str(TOOLS / "release.py"), "deploy", *common,
                        "--source", str(directory / "artifact"), "--release", release_value(request["release"]),
                        "--activate", "--apply", *hooks], check=True)
        subprocess.run([sys.executable, str(TOOLS / "release.py"), "prune", *common,
                        "--keep-releases", str(request["keep"]), "--min-age-hours", str(request["minAge"]), "--apply"], check=True)
        # This invocation's private duplicate only; tools/journal diagnostics remain available.
        shutil.rmtree(directory / "artifact")
    else:
        target = ["--release", release_value(request["release"])] if request["release"] else []
        subprocess.run([sys.executable, str(TOOLS / "release.py"), "rollback", *common, *target, "--apply", *hooks], check=True)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        if len(sys.argv) == 1:
            runner(dict(os.environ))
        elif len(sys.argv) == 3 and sys.argv[1] == "remote":
            remote(sys.argv[2])
        else:
            raise ValueError("Invalid CI transport arguments")
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        # Subprocess errors show argv, never credential contents (keys are file-only).
        print(f"ERROR: {error}", file=sys.stderr)
        sys.exit(1)

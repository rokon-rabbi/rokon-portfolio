import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

function python(source) {
  const result = spawnSync(
    "python3",
    ["-c", `import sys\nsys.path.insert(0, 'deploy')\nimport ci\n${source}`],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr + result.stdout);
}
const environment = `env = dict(DEPLOY_APPROVED='true', DEPLOY_OPERATION='deploy', GITHUB_REF='refs/heads/main',
GITHUB_EVENT_NAME='push', DEPLOY_COMMIT='a'*40, GITHUB_SHA='a'*40, GITHUB_RUN_ID='123', GITHUB_RUN_ATTEMPT='1',
VPS_DOMAIN='portfolio.example', VPS_BASE='/srv/portfolio-example', VPS_INCOMING='/srv/portfolio-incoming',
VPS_CHECK_HOOK='/usr/local/libexec/example-check', VPS_RELOAD_HOOK='/usr/local/libexec/example-reload',
VPS_TLS_CERT='/etc/example/cert.pem', VPS_TLS_KEY='/etc/example/key.pem',
VPS_ACCESS_LOG='/var/log/nginx/example.access.log', VPS_ERROR_LOG='/var/log/nginx/example.error.log')`;
test("transport fails closed for absent approval, PRs, other branches and mismatched commits", () => {
  python(`${environment}
assert ci.configuration(env)['release'] == 'gh-123-1-aaaaaaaaaaaa'
for changes in [dict(DEPLOY_APPROVED=''), dict(GITHUB_EVENT_NAME='pull_request'), dict(GITHUB_REF='refs/heads/feature'), dict(DEPLOY_COMMIT='b'*40)]:
    try: ci.configuration(dict(env, **changes))
    except ValueError: pass
    else: raise AssertionError('Unauthorized production event accepted')
`);
});
test("transport rejects root SSH, shell injection, overlapping paths and unsafe rollback IDs", () => {
  python(`${environment}
for changes in [dict(VPS_BASE='/srv/x;touch /tmp/x'), dict(VPS_INCOMING='/srv/portfolio-example/incoming'), dict(VPS_MIN_RELEASE_AGE_HOURS='0')]:
    try: ci.configuration(dict(env, **changes))
    except ValueError: pass
    else: raise AssertionError('Unsafe production settings accepted')
for host,user in [('example.test','root'), ('x;false','deploy'), ('example.test','deploy;false')]:
    try: ci.host_settings(dict(VPS_SSH_HOST=host, VPS_SSH_USER=user))
    except ValueError: pass
    else: raise AssertionError('Unsafe SSH settings accepted')
for target in ['../current', 'x;false', '--help']:
    try: ci.release_value(target)
    except ValueError: pass
    else: raise AssertionError('Unsafe release accepted')
`);
});
test("transport verifies actual SSH key fingerprints and never enables insecure fallback", () => {
  python(`import tempfile, subprocess
from pathlib import Path
with tempfile.TemporaryDirectory(prefix='portfolio-test-ssh-') as temporary:
    root=Path(temporary); key=root/'test-key'
    subprocess.run(['ssh-keygen','-q','-t','ed25519','-N','','-f',str(key)], check=True)
    public=Path(str(key)+'.pub').read_text().split()
    fingerprint=subprocess.check_output(['ssh-keygen','-l','-E','sha256','-f',str(key)+'.pub'], text=True).split()[1]
    env=dict(VPS_SSH_HOST='example.test', VPS_SSH_PORT='2222', VPS_SSH_USER='deploy',
        VPS_SSH_PRIVATE_KEY=key.read_text(), VPS_SSH_KNOWN_HOSTS='[example.test]:2222 '+' '.join(public[:2]),
        VPS_SSH_HOST_FINGERPRINTS=fingerprint)
    configuration=ci.ssh_configuration(root,env).read_text()
    effective=subprocess.check_output(['ssh','-G','-F',str(root/'ssh_config'),'portfolio-target'],text=True)
    settings=dict(line.split(' ',1) for line in effective.splitlines())
    assert settings['stricthostkeychecking']=='true' and settings['batchmode']=='yes'
    assert settings['hostname']=='example.test' and settings['port']=='2222'
    assert settings['identitiesonly']=='yes' and settings['forwardagent']=='no'
    for required in ['StrictHostKeyChecking yes','UpdateHostKeys no','IdentitiesOnly yes','BatchMode yes','ForwardAgent no']:
        assert required in configuration
    assert (root/'identity').stat().st_mode & 0o777 == 0o600
    for changes in [dict(VPS_SSH_HOST_FINGERPRINTS='SHA256:'+'A'*43),dict(VPS_SSH_KNOWN_HOSTS='* '+' '.join(public[:2])),dict(VPS_SSH_KNOWN_HOSTS='other.test '+' '.join(public[:2]))]:
        try: ci.ssh_configuration(root,dict(env,**changes))
        except ValueError: pass
        else: raise AssertionError('Unverified SSH host accepted')
`);
});

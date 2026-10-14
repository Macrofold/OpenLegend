"""Publish a checked content-addressed tree; never change a branch or commit.

Invoked only after candidate checks. The connector creates the two-parent commit
and advances the existing UI branch separately. This temporary file is excluded
from the candidate tree.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import urllib.request

REPO = 'Macrofold/OpenLegend'
MAIN = '1700f3b23a39acfdd14f3a6ab34c8ce330847bc3'
UI = '705efb2bd102ba151123659b129372aea62b6a79'
CANDIDATE = '1404c65ec38ae7f4765ea303a13f00608e0dbfbf'
root = Path(os.environ['RUNNER_TEMP']) / 'ui-reconciled'
assert os.environ['GITHUB_REPOSITORY'] == REPO
assert os.environ['GITHUB_REF'] == 'refs/heads/docs/game-ui-research-redesign'

def git(*args, **kwargs):
    return subprocess.check_output(['git', *args], **kwargs)

def entries(ref):
    result = {}
    for record in git('ls-tree', '-rz', ref).split(b'\0'):
        if not record:
            continue
        header, path = record.split(b'\t', 1)
        mode, kind, sha = header.decode().split()
        assert kind == 'blob'
        result[path.decode()] = (mode, sha)
    return result

def api(path, payload=None):
    request = urllib.request.Request(
        f'https://api.github.com/repos/{REPO}/{path}',
        data=None if payload is None else json.dumps(payload).encode(),
        headers={
            'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28',
        },
        method='GET' if payload is None else 'POST',
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)

assert api('git/ref/heads/main')['object']['sha'] == MAIN
assert api('git/ref/heads/docs/game-ui-research-redesign')['object']['sha'] == os.environ['GITHUB_SHA']
changes = git('diff', '--name-only', UI, os.environ['GITHUB_SHA'], text=True).splitlines()
allowed = {'.github/workflows/ui-merge-source.yml', '.github/scripts/ui-reconcile.py', '.github/scripts/ui-reconcile-publish.py'}
assert set(changes) <= allowed, changes
base = entries(MAIN)
original = entries(CANDIDATE)
known = {sha for _, sha in [*entries(UI).values(), *base.values()]}
current = {}
tree = []
for path, (mode, _) in original.items():
    file = root / path
    if not file.exists() and not file.is_symlink():
        continue
    assert path not in allowed
    data = os.readlink(file).encode() if mode == '120000' else file.read_bytes()
    sha = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
    current[path] = (mode, sha)
    if base.get(path) == (mode, sha):
        continue
    entry = {'path': path, 'mode': mode, 'type': 'blob'}
    if sha in known:
        entry['sha'] = sha
    else:
        entry['content'] = data.decode('utf-8')
        assert git('hash-object', '-w', '--stdin', input=data).decode().strip() == sha
    tree.append(entry)
for path, (mode, _) in base.items():
    if path not in current:
        tree.append({'path': path, 'mode': mode, 'type': 'blob', 'sha': None})
# Independently calculate the complete local tree using a private index.
env = dict(os.environ, GIT_INDEX_FILE=str(Path(os.environ['RUNNER_TEMP']) / 'ui-final.index'))
subprocess.run(['git', 'read-tree', '--empty'], env=env, check=True)
index = b''.join(f'{mode} {sha}\t{path}\0'.encode() for path, (mode, sha) in current.items())
subprocess.run(['git', 'update-index', '-z', '--index-info'], input=index, env=env, check=True)
expected = git('write-tree', env=env, text=True).strip()
subprocess.run(['git', 'diff', '--check', UI, expected], check=True)
result = api('git/trees', {'base_tree': git('rev-parse', f'{MAIN}^{{tree}}', text=True).strip(), 'tree': tree})
assert result['sha'] == expected, (result['sha'], expected)
print('VERIFIED_CANDIDATE_TREE=' + expected)
print('UI_PARENT=' + os.environ['GITHUB_SHA'])
print('MAIN_PARENT=' + MAIN)
print('TREE_ENTRIES_CHANGED=' + str(len(tree)))
print('No branch references or commits were changed by this publication.')

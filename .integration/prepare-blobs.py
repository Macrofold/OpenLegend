"""Prepare reviewed, immutable source blobs only; never write trees, commits or refs.

History and workflow-bearing tree publication remain with the authorized connector.
The data-only manifest supplies exact source hashes and reviewed conflict edits.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

REPO = 'Macrofold/OpenLegend'
MAIN = 'da02629d9f0a29a9e24473ff2ab995977a79be1a'
SOURCE = 'a6c070997e2c993fde3ee65eedc572e4bada28d2'
ROOT = Path(__file__).parent
plan = json.loads((ROOT / 'replay.json').read_text())
assert plan['main'] == MAIN and plan['source'] == SOURCE
assert os.environ['GITHUB_REPOSITORY'] == REPO
assert os.environ['GITHUB_REF'] == 'refs/heads/feature/invention-repertoire-foundation'
assert plan['publishFeature'] is False
cache, metadata, trees, replayed = {}, {}, {}, {}
generated, uploaded = set(), set()
result = {'main': MAIN, 'source': SOURCE, 'prepared': [], 'uploaded': [], 'completed': False}
last_write = 0.0

def api(path, body=None):
    global last_write
    assert path.startswith(f'/repos/{REPO}/git/')
    if body is not None:
        assert path == f'/repos/{REPO}/git/blobs'
        if len(uploaded) >= 300:
            raise RuntimeError('Immutable blob upload bound exhausted.')
        time.sleep(max(0, 1.1 - (time.monotonic() - last_write)))
        last_write = time.monotonic()
    request = urllib.request.Request('https://api.github.com' + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization': 'Bearer ' + os.environ['GITHUB_TOKEN'],
                 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json',
                 'X-GitHub-Api-Version': '2022-11-28'})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            data = response.read(20_000_001)
            if len(data) > 20_000_000:
                raise RuntimeError('GitHub response exceeded its bound.')
            return json.loads(data)
    except urllib.error.HTTPError as error:
        try:
            message = str(json.loads(error.read(8192)).get('message', ''))[:1000]
        except (ValueError, UnicodeError):
            message = 'Non-JSON response'
        raise RuntimeError(f'GitHub HTTP {error.code}: {message}; no retry performed.') from None

def digest(kind, data):
    return hashlib.sha1(f'{kind} {len(data)}\0'.encode() + data).hexdigest()

def content(sha):
    if sha not in cache:
        value = api(f'/repos/{REPO}/git/blobs/{sha}')
        assert value['encoding'] == 'base64'
        data = base64.b64decode(value['content'])
        if digest('blob', data) != sha:
            raise RuntimeError('Source content hash mismatch.')
        cache[sha] = data
    return cache[sha]

def remember(data):
    sha = digest('blob', data)
    cache[sha] = data
    generated.add(sha)
    return sha

def commit(sha):
    if sha not in metadata:
        metadata[sha] = api(f'/repos/{REPO}/git/commits/{sha}')
    return metadata[sha]

def files(sha):
    tree = commit(sha)['tree']['sha']
    if tree not in trees:
        value = api(f'/repos/{REPO}/git/trees/{tree}?recursive=1')
        if value.get('truncated'):
            raise RuntimeError('Incomplete source tree.')
        entries = {}
        for entry in value['tree']:
            if entry['type'] == 'tree':
                continue
            path = entry['path']
            if entry['type'] != 'blob' or path.startswith('/') or '..' in Path(path).parts or '.git' in Path(path).parts:
                raise RuntimeError('Unsupported source entry.')
            entries[path] = {'mode': entry['mode'], 'sha': entry['sha']}
        trees[tree] = entries
    return trees[tree]

def tree_hash(entries):
    root = {}
    for path, entry in entries.items():
        parts = path.split('/')
        node = root
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = (entry['mode'], entry['sha'])
    def build(node):
        data = b''
        for name, value in sorted(node.items(), key=lambda pair: (pair[0] + ('/' if isinstance(pair[1], dict) else '')).encode()):
            mode, sha = ('40000', build(value)) if isinstance(value, dict) else value
            data += mode.lstrip('0').encode() + b' ' + name.encode() + b'\0' + bytes.fromhex(sha)
        return digest('tree', data)
    return build(root)

def resolve(change):
    lines = content(change['base']).decode().splitlines(keepends=True)
    previous = 0
    for edit in change['edits']:
        start, end = edit['start'], edit['start'] + edit['remove']
        if not previous <= start <= end <= len(lines):
            raise RuntimeError('Invalid reviewed source edit.')
        previous = end
    for edit in reversed(change['edits']):
        start = edit['start']
        lines[start:start + edit['remove']] = edit['text'].splitlines(keepends=True)
    sha = remember(''.join(lines).encode())
    if sha != change['sha']:
        raise RuntimeError('Reviewed resolution hash mismatch.')
    return sha

try:
    main_files = files(MAIN)
    if tree_hash(main_files) != commit(MAIN)['tree']['sha']:
        raise RuntimeError('Main source tree mismatch.')
    excluded = set(plan['excludedParents'])
    for index, entry in enumerate(plan['commits']):
        original = commit(entry['original'])
        parents = entry['parents']
        if original['tree']['sha'] != entry['originalTree'] or [p['sha'] for p in original['parents']] != parents:
            raise RuntimeError('Original source metadata mismatch.')
        if any(parent not in replayed and parent not in excluded for parent in parents):
            raise RuntimeError('Source parent was not prepared.')
        old, after = files(parents[0]), files(entry['original'])
        target = dict(replayed.get(parents[0], main_files))
        merged_main = [files(parent) for parent in parents[1:] if parent in excluded]
        resolutions = plan['resolutions'].get(entry['original'], {})
        for path in sorted(old.keys() | after.keys()):
            base, theirs, ours = old.get(path), after.get(path), target.get(path)
            if base == theirs or any(theirs == source.get(path) for source in merged_main) or ours == theirs:
                continue
            if ours == base:
                if theirs:
                    target[path] = theirs
                else:
                    target.pop(path, None)
                continue
            resolution = resolutions.get(path)
            if not ours or not theirs:
                if not resolution:
                    raise RuntimeError(f'Unreviewed deletion conflict: {path}')
                target[path] = {'mode': (theirs or ours)['mode'], 'sha': resolve(resolution)}
                continue
            with tempfile.TemporaryDirectory() as temporary:
                inputs = []
                for name, source in zip(('rebased', 'old-parent', 'original'), (ours, base, theirs)):
                    file = Path(temporary) / name
                    file.write_bytes(content(source['sha']) if source else b'')
                    inputs.append(str(file))
                merged = subprocess.run(['diff3', '-m', '-E', '-L', 'rebased', '-L', 'old-parent', '-L', 'original', *inputs], capture_output=True, timeout=60, check=False)
            if merged.returncode not in (0, 1):
                raise RuntimeError(f'Source merge failed: {path}')
            sha = remember(merged.stdout)
            if resolution:
                sha = resolve(resolution)
            elif merged.returncode:
                raise RuntimeError(f'Unreviewed conflict: {path}')
            target[path] = {'mode': theirs['mode'], 'sha': sha}
        if tree_hash(target) != entry['tree']:
            raise RuntimeError('Prepared tree differs from local reviewed hash.')
        for sha in sorted({value['sha'] for value in target.values()} & generated - uploaded):
            created = api(f'/repos/{REPO}/git/blobs', {'encoding': 'base64', 'content': base64.b64encode(content(sha)).decode()})
            if created['sha'] != sha:
                raise RuntimeError('Uploaded source hash mismatch.')
            uploaded.add(sha)
        replayed[entry['original']] = target
        result['prepared'].append({'original': entry['original'], 'tree': entry['tree']})
        result['uploaded'] = sorted(uploaded)
        (ROOT / 'replay-result.json').write_text(json.dumps(result, indent=2))
        print(f"Prepared source {index + 1}/{len(plan['commits'])}: {entry['original'][:8]}", flush=True)
    result['completed'] = True
finally:
    result['uploaded'] = sorted(uploaded)
    (ROOT / 'replay-result.json').write_text(json.dumps(result, indent=2))

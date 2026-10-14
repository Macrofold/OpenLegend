import difflib
import hashlib
import json
import os
import pathlib
import re
import subprocess
import zipfile

OLD = 'bf7366beb621e9c9c4cb03718c542c48ce2b6381'
NEW = '7a576214fbb9891b2e9f742db56bbeccaa3a58a1'
ROOT = pathlib.Path.cwd()
OUT = pathlib.Path(os.environ['RUNNER_TEMP'])
CONFIG = json.loads((ROOT / '.github/rebase-resolutions.json').read_text())
LOG = []
RESOLVED = []
PATTERN = re.compile(r'^<<<<<<< [^\n]*\n(.*?)^\|\|\|\|\|\|\| [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n', re.M | re.S)


def git(*args, check=True):
    p = subprocess.run(['git', *args], capture_output=True)
    if check and p.returncode:
        raise RuntimeError(p.stderr.decode())
    return p


def text(*args):
    return git(*args).stdout.decode()


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def nonoverlapping_merge(base, left, right):
    if left == right or right == base:
        return left
    if left == base:
        return right
    tokenize = lambda s: re.findall(r'\w+|[^\w\s]|\s+', s)
    b, l, r = map(tokenize, (base, left, right))
    if max(map(len, (b, l, r))) > 10000:
        return None
    def changes(other):
        return [(i, j, other[k:n]) for op, i, j, k, n in difflib.SequenceMatcher(None, b, other, autojunk=False).get_opcodes() if op != 'equal']
    lc, rc = changes(l), changes(r)
    edits = list(lc)
    for item in rc:
        if item in lc:
            continue
        i, j, replacement = item
        for a, z, _ in lc:
            if max(i, a) < min(j, z) or (i == j and a <= i <= z) or (a == z and i <= a <= j):
                return None
        edits.append(item)
    for i, j, replacement in sorted(edits, key=lambda e: (e[0], e[1]), reverse=True):
        b[i:j] = replacement
    return ''.join(b)


base = text('merge-base', OLD, NEW).strip()
git('config', 'user.name', 'OpenLegend documentation review')
git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
git('config', 'commit.gpgsign', 'false')
git('config', 'core.hooksPath', '/dev/null')
assert not text('status', '--porcelain').strip(), 'dirty isolated checkout'
git('switch', '--detach', OLD)
os.environ['GIT_EDITOR'] = 'true'
result = git('rebase', '--onto', NEW, base, check=False)
LOG.append(result.stdout.decode() + result.stderr.decode())
remaining = []
for iteration in range(1000):
    if result.returncode == 0:
        break
    raw = text('ls-files', '-u')
    if not raw:
        raise RuntimeError('Rebase stopped without file conflicts: ' + LOG[-1])
    paths = sorted({line.split('\t', 1)[1] for line in raw.splitlines()})
    planned = []
    source_commit = text('rev-parse', 'REBASE_HEAD').strip()
    for name in paths:
        stages = {}
        for stage in (1, 2, 3):
            p = git('show', f':{stage}:{name}', check=False)
            stages[str(stage)] = p.stdout.decode() if p.returncode == 0 else None
        if pathlib.PurePosixPath(name).suffix != '.md' or any(v is None for v in stages.values()):
            remaining.append(dict(path=name, stages=stages, source_commit=source_commit))
            continue
        git('checkout', '--conflict=diff3', '--', name)
        current = (ROOT / name).read_text()
        hunks = list(PATTERN.finditer(current))
        if not hunks:
            raise RuntimeError('Unrecognized conflict markers: ' + name)
        edits, decisions, missing = [], [], []
        for match in hunks:
            left, ancestor, right = match.groups()
            key = name + ':' + digest(left) + ':' + digest(right)
            supplied = CONFIG.get('hunks', {}).get(key)
            if supplied is not None:
                assert supplied.get('reason'), key
                choices = {'left': left, 'right': right, 'both': left + right}
                merged = supplied['content'] if 'content' in supplied else choices[supplied['take']]
                reason = supplied['reason']
            else:
                merged = nonoverlapping_merge(ancestor, left, right)
                reason = 'Disjoint token edits only; no competing edit selected.'
            if merged is None:
                missing.append(dict(key=key, left=left, base=ancestor, right=right, context=current[max(0,match.start()-180):match.start()]))
            else:
                edits.append((match.start(), match.end(), merged))
                decisions.append(dict(path=name, key=key, reason=reason, source_commit=source_commit))
        if missing:
            remaining.append(dict(path=name, stages=stages, conflict=current, hunks=missing, source_commit=source_commit))
        else:
            for start, end, merged in reversed(edits):
                current = current[:start] + merged + current[end:]
            planned.append((name, current, decisions))
    if remaining:
        break
    for name, merged, decisions in planned:
        (ROOT / name).write_text(merged)
        git('add', '--', name)
        RESOLVED.extend(decisions)
    empty = git('diff', '--cached', '--quiet', check=False).returncode == 0
    result = git('rebase', '--skip' if empty else '--continue', check=False)
    LOG.append(result.stdout.decode() + result.stderr.decode())
else:
    raise RuntimeError('Unexpected rebase iteration count')

success = result.returncode == 0 and not remaining
head = text('rev-parse', 'HEAD').strip()
tree = text('rev-parse', 'HEAD^{tree}').strip()
summary = dict(success=success, old=OLD, main=NEW, base=base, head=head, tree=tree, remaining=remaining, resolved=RESOLVED)
(OUT / 'rebase-result.json').write_text(json.dumps(summary, indent=2))
with zipfile.ZipFile(OUT / 'rebase-result.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('result.json', json.dumps(summary, indent=2))
    z.writestr('rebase.log', '\n'.join(LOG))
    z.writestr('status.txt', text('status', '--porcelain'))
    if success:
        z.writestr('range-diff.txt', text('range-diff', '--no-color', f'{base}..{OLD}', f'{NEW}..{head}'))
        z.writestr('rebased.patch', text('diff', '--binary', NEW, head))
        z.writestr('rebased-history.txt', text('log', '--reverse', '--format=%H%x09%P%x09%s', '--name-status', f'{NEW}..{head}'))
        z.writestr('tree.txt', text('ls-tree', '-r', '--long', 'HEAD'))
        for entry in text('ls-files').splitlines():
            path = ROOT / entry
            if not path.is_file() or path.is_symlink():
                continue
            if path.suffix in ('.md', '.mdc', '.txt', '.json', '.yaml', '.yml', '.ts', '.tsx', '.mjs', '.js', '.py', '.html', '.css') and 'archive' not in path.parts:
                z.writestr('source/' + entry, path.read_bytes())
    else:
        z.writestr('unmerged-index.txt', text('ls-files', '-u'))
        z.writestr('conflict.diff', text('diff', '--cc'))
        for path in (ROOT / '.git/rebase-merge').glob('*'):
            if path.is_file():
                z.writestr('rebase-state/' + path.name, path.read_bytes())
print(json.dumps({k:v for k,v in summary.items() if k not in ('remaining','resolved')}, indent=2))
print('Unresolved paths:', [x['path'] for x in remaining])
print('Mechanical or exact reviewed resolutions:', len(RESOLVED))
if success and CONFIG.get('approved_tree'):
    assert tree == CONFIG['approved_tree'], 'Candidate differs from reviewed tree'

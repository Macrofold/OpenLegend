"""Build a reviewed candidate from pinned snapshots; no Git reads or writes."""
import pathlib
import shutil
import subprocess
import re
import json
import hashlib

ROOT = pathlib.Path('/tmp/openlegend-reconcile')
OUT = ROOT / 'candidate'
if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(ROOT / 'main', OUT, symlinks=True)


def content(label, path):
    p = ROOT / label / path
    return p.read_bytes() if p.is_file() else None


def resolve(path, left, ancestor, right):
    # diff3 -E omits changes made identically on both sides.
    if left == right:
        return left
    if left == ancestor:
        return right
    if right == ancestor:
        return left
    if path == 'apps/server/src/ai-director.ts':
        if 'let attemptBindings: AttemptBinding[] = []' in left:
            return left[left.index('    let attemptBindings:'):]
    if path == 'apps/server/src/cognition-contracts.ts':
        if 'COGNITION_VERSION' in left:
            return "export const COGNITION_VERSION = 'cognition-v15-grounded-introductions';\n"
        if 'invocation: navigationInvocationSchema' in left:
            return right.replace("z.enum(['known', 'proposal'])", "z.enum(['known', 'proposal', 'invoke'])").replace(
                '        actionId,\n',
                '        actionId,\n        invocation: navigationInvocationSchema\n          .extend({ targetEntityId: entityId.nullable() })\n          .nullable(),\n',
            )
    if path == 'packages/domain/src/kernel.ts':
        return left
    if path == 'packages/domain/src/events.ts':
        return right if 'entityEpisodes:' in right else left
    if path == 'apps/server/src/response-context.ts':
        return right
    if path in ['apps/server/src/cognition-maintenance.ts', 'apps/server/src/entity-references.ts', 'packages/domain/src/response.ts']:
        return right
    if path.endswith('.md'):
        if not ancestor.strip():
            return right + '\n' + left
        if path == 'archive/05-project/implementation-status.md':
            suffix = left[left.index('\n## Native action capability slice'):]
            return right.replace('This does not implement sustained target following.', 'Sustained following is provided by the separate native activity described below.') + suffix
        if path == 'docs/architecture.md':
            if 'Current parameterized text resolution' in left:
                return left[:left.index('Immediate responses use')] + right
            return right
        if path == 'docs/maintainers/TODO.md':
            return right.replace('same-actor cooldown,', 'immediate new-evidence eligibility,')
        if path == 'docs/maintainers/performance.md':
            return ('PF00/PF01/PF02/PF03/PF04/PF05/PF08/PF09 include delivered work below. Remaining qualification stays unchecked. '
                    'PF10 includes local SQLite worker isolation, not a production-scaling result; further simulation/serialization workers and additional PF04 connection isolation remain conditional. '
                    'PF06/PF07 and PF11 remain gated. PostgreSQL-first measurement policy is in [the profiling guide](performance-profiling.md#primary-performance-baseline).\n')
    raise RuntimeError('Unreviewed conflict in ' + path + '\nLEFT\n' + left + '\nRIGHT\n' + right)


def merge(path, left, base, right):
    files = [ROOT / name / path for name in ['branch', 'base', 'main']]
    result = subprocess.run(['diff3', '-m', '-E', '-L', 'FEATURE', '-L', 'BASE', '-L', 'MAIN', *map(str, files)], capture_output=True)
    if result.returncode > 1:
        raise RuntimeError(result.stderr.decode())
    text = result.stdout.decode()
    # -E omits ancestor blocks; recover the actual base from a separate ordinary merge.
    if result.returncode:
        full = subprocess.run(['diff3', '-m', '-A', '-L', 'FEATURE', '-L', 'BASE', '-L', 'MAIN', *map(str, files)], capture_output=True)
        text = full.stdout.decode()
        pattern = r'^<<<<<<< FEATURE\n(.*?)^\|\|\|\|\|\|\| BASE\n(.*?)^=======\n(.*?)^>>>>>>> MAIN\n'
        text = re.sub(pattern, lambda m: resolve(path, *m.groups()), text, flags=re.M | re.S)
        # Base-only hunks describe identical changes and have no remaining conflict.
        pattern = r'^<<<<<<< BASE\n.*?^=======\n(.*?)^>>>>>>> MAIN\n'
        text = re.sub(pattern, lambda m: m.group(1), text, flags=re.M | re.S)
        if re.search(r'^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)', text, re.M):
            raise RuntimeError('Unresolved markers in ' + path)
    return text.encode()

paths = set()
for label in ['base', 'branch', 'main']:
    for p in (ROOT / label).rglob('*'):
        if p.is_file() and 'node_modules' not in p.parts:
            paths.add(str(p.relative_to(ROOT / label)))
changed = []
for path in sorted(paths):
    base, left, right = (content(label, path) for label in ['base', 'branch', 'main'])
    if left == base or left == right:
        continue
    if right == base:
        result = left
    elif None in (left, base, right):
        raise RuntimeError('Structural conflict in ' + path)
    else:
        result = merge(path, left, base, right)
    target = OUT / path
    if result is None:
        target.unlink(missing_ok=True)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(result)
    changed.append(path)

# Preserve main's episode-before-evidence invariant in the batching implementation.
p = OUT / 'packages/domain/src/kernel.ts'
s = p.read_text()
start = s.index('    // Persistent exposure episodes do not imply identity recognition across a disappearance.', s.index('function* updateEncounters'))
end = s.index('\n', s.index('      );', start)) + 1
block = s[start:end]
s = s[:start] + s[end:]
needle = '    const acquired = seen.filter((id) => !previouslySeen.has(id));'
s = s.replace('    const objectIds = visible.objects;\n', '')
s = s.replace(needle, '    const objectIds = visible.objects;\n' + block + needle, 1)
p.write_text(s)

# Keep compact capability-specific instructions, plus the branch's invocation and approval semantics.
p = OUT / 'apps/server/src/response-context.ts'
s = p.read_text()
s = s.replace('Use a known action handle to withdraw an unresolved intent.', 'Use a known action handle to accept the exact revised action or withdraw an unresolved intent; never accept for another actor.')
s = s.replace("'known|expression|proposal' : 'known|proposal'", "'known|expression|proposal|invoke' : 'known|proposal|invoke'")
s = s.replace('for proposal, fill description (max 500).', 'for proposal, fill description (max 500) and optionally targetEntityId. For invoke, use the Native navigation contract and invocation field; other action fields stay null.')
s = s.replace('unsupported mechanics require separate invention admission.', 'unsupported mechanics cannot execute; proposals may explicitly report partial fulfillment or ask the initiator to accept a revised action.')
p.write_text(s)

# Current facts must not retain superseded per-feature reset requirements.
p = OUT / 'archive/05-project/implementation-status.md'
s = p.read_text().replace('Current development saves require schema 11.', 'State evolves through the current in-place upgrade owner.')
p.write_text(s)

manifest = {}
for path in changed:
    p = OUT / path
    if p.exists():
        data=p.read_bytes()
        manifest[path]={'sha':hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),'bytes':len(data)}
    else:
        manifest[path]={'sha':None}
(ROOT / 'candidate-manifest.json').write_text(json.dumps(manifest, indent=2))
print(json.dumps({'changedFiles':len(changed),'candidate':str(OUT)},indent=2))

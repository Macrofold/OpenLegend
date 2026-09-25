from pathlib import Path
import subprocess, re, hashlib, json, os
r = Path(os.environ['MERGE_ROOT'])
f, b, m = r/'feature', r/'common-base', r/'current-main'
changed = []
for p in sorted(m.rglob('*')):
    if not p.is_file() or p.is_symlink() or any(x in ('.git','node_modules','dist') for x in p.relative_to(m).parts):
        continue
    rel = str(p.relative_to(m)); base = b/rel; target = f/rel
    if base.exists() and base.read_bytes() == p.read_bytes():
        continue
    changed.append(rel)
    if not target.exists() or (base.exists() and target.read_bytes() == base.read_bytes()):
        target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(p.read_bytes()); continue
    if target.read_bytes() == p.read_bytes():
        continue
    if not base.exists():
        raise RuntimeError('Independent added file '+rel)
    result = subprocess.run(['diff3','-m','-L','branch','-L','common-base','-L','main',str(target),str(base),str(p)],capture_output=True)
    if result.returncode not in (0,1):
        raise RuntimeError(result.stderr.decode())
    def resolve(match):
        ours, old, theirs = match.groups()
        if rel == 'apps/server/src/game-saves.ts':
            return ours.replace('const MAX_SAVES = 20;\n','')
        if rel == 'packages/domain/src/perception.ts':
            return '  soundTransmissionAtLeast,\n  SPATIAL_LIMITS,\n'
        if rel == 'packages/domain/src/kernel.ts':
            if ours.startswith('import '):
                return ours
            return theirs.split('  const nearbyObjects =')[0] + ours
        if rel in ('docs/architecture.md','docs/documentation-changelog.md','docs/maintainers/TODO.md','docs/verification.md'):
            return ours+'\n'+theirs
        raise RuntimeError('Unreviewed conflict '+rel)
    text = re.sub(r'<<<<<<< branch\n(.*?)\|\|\|\|\|\|\| common-base\n(.*?)=======\n(.*?)>>>>>>> main\n',resolve,result.stdout.decode(),flags=re.S)
    if '<<<<<<<' in text:
        raise RuntimeError('Unresolved '+rel)
    if rel == 'docs/architecture.md':
        text = text.replace('Incompatible saves are rejected without migration or deletion; use a separate directory.','Development saves evolve in place through the existing upgrade owner; incompatible state fails explicitly without reset.')
    target.write_text(text)
digest = hashlib.sha256(''.join(p+'\0'+hashlib.sha256((f/p).read_bytes()).hexdigest()+'\n' for p in changed).encode()).hexdigest()
if digest != 'e31de4d2f6c488c5c3ac588c39e5048ca4ddccc57fddb026c53274c506b28ed2':
    raise RuntimeError('Reconciled source differs from reviewed local tree: '+digest)
(r/'merge-paths.json').write_text(json.dumps(changed))
print('Prepared and authenticated',len(changed),'upstream paths')

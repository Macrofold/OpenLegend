from pathlib import Path
import json,re,subprocess
r=json.loads(Path('docs/verification/perception-capture.json').read_text())
rows=[]
for scene,pair in r['scenarios'].items():
 for phase in ['cold','warm']:
  a,b=pair['before'][phase],pair['after'][phase]
  rows.append(f"| {scene} / {phase} | {a['steps']} | {a['totalMs']:.1f} → {b['totalMs']:.1f} | {a['p95Ms']:.2f} → {b['p95Ms']:.2f} | {a['headroom']:.2f} → {b['headroom']:.2f} |")
p=Path('docs/verification.md');s=p.read_text()+'''

### Per-entity capture closeout

The final profile exposed unnecessary `current(world.entities)` materialization of actor-private nested state while collecting perception scalars. `captureSource` now reads actor scalars directly and retains the existing immutable inert-entity cache. This is a one-boundary change, not another cache or state owner. A 200-step native trace including a source-name edit matched complete transition digests before/after; cold/warm stress world digests matched too. Production build and the real HTTP/SQLite exercise were rerun. The [capture report](verification/perception-capture.json) compares the preceding implementation with this final change on one host; it must not be multiplied into speedups measured on other hosts.

| Scenario / phase | Measured advances | Total ms: prior → final | Run p95 ms: prior → final | Native headroom: prior → final |
| --- | ---: | ---: | ---: | ---: |
'''+ '\n'.join(rows)+ '\n'
p.write_text(s)
p=Path('docs/architecture.md');s=p.read_text();s+='\nPerception scalar capture does not call `current` on the full entity roster: that would copy nested private actor state unrelated to sensing. Only inert per-entity records and the needed actor transform are materialized. The existing single snapshot/experience owners and all privacy rules remain unchanged.\n';p.write_text(s)
p=Path('docs/maintainers/TODO.md');s=p.read_text();s+='\n- [ ] Cover per-entity perception scalar capture against full native transition outcomes for changing actor plans, edited inert source metadata, mutable builders, geometry/sense changes and restored frames. The manual 200-step trace and stress digests are narrow observations, not a regression suite.\n';p.write_text(s)
# Check changed documentation's local paths/anchors without scanning external sites.
files=subprocess.check_output(['git','diff','--name-only','0582e8660e154e6383a407ffb09e75f0b8c6223a','--','*.md'],text=True).splitlines()
missing=[]
for name in files:
 p=Path(name)
 if not p.exists():continue
 for target in re.findall(r'\]\(([^\s)]+)\)',p.read_text()):
  if '://' in target or target.startswith('mailto:'):continue
  path=target.split('#')[0]
  if path and not (p.parent/path).exists():missing.append((name,target))
if missing:raise RuntimeError(f'Broken documentation paths: {missing[:20]}')
for p in Path('.github').glob('perception-capture*'):p.unlink()
Path('.github/workflows/check.yml').write_text(Path('/tmp/standard-check.yml').read_text())

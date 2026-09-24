from pathlib import Path
import json,subprocess,re
baseline='cb830dbce0f475b442b8417c5d3a1bf9b529eb37'
# The failed experiment never committed runtime changes. Do not overwrite unrelated code.
changed=subprocess.check_output(['git','diff','--name-only',baseline,'HEAD','--','packages','apps'],text=True)
if changed.strip():raise RuntimeError('Unexpected source changes after qualified baseline: '+changed)
report={
 'scope':'Rejected optional copying experiment, not implemented behavior or capacity evidence.',
 'qualifiedImplementation':baseline,
 'experimentRun':'35959611757',
 'productionBuild':'passed',
 'nativeTrace':{'steps':200,'completeTransitionDigestsEqual':True},
 'failedWorkload':{'scenario':'gems','warmup':30,'stepsRequested':600,'timeoutSeconds':30,'exitCode':124,'lastStage':'measured steps'},
 'decision':'Do not adopt the per-entity capture patch. Retain the verified whole-roster capture until the warm-path regression is understood.',
 'paidModelCalls':0
}
Path('docs/verification/perception-capture-deferred.json').write_text(json.dumps(report,indent=2)+'\n')
p=Path('docs/verification.md');s=p.read_text();s+='''

### Rejected optional capture experiment

An additional attempt to replace `current(world.entities)` with per-entity reads compiled and matched complete transition digests over a 200-step native trace, but the warm gem workload failed its 30-second deadline during measured advances. The change was **not committed to runtime source**. The preceding qualified implementation and its final matched-host report remain the current result; do not claim scalar-only actor capture or extrapolate the short trace into performance safety. The [rejection record](verification/perception-capture-deferred.json) preserves the exact scope. Investigate draft/proxy allocation and warm-path behavior before trying that optimization again.

The full-package warm mixed run did not show a throughput improvement: approximately 2,959 ms before versus 2,989 ms after across 600 measured advances, with run p95 5.77 ms versus 7.43 ms. Cold-burst gains must not be presented as a universal steady-state speedup. The larger 612-entity scene produced 61,135 events and 66,083 awareness records, took approximately 8.21 seconds for 180 advances and had a 4.46-second cold maximum; native headroom at requested 3× was 0.12. This is a measured failing capacity case, not 100-observer qualification.
''';p.write_text(s)
p=Path('docs/maintainers/performance.md');s=p.read_text();s+='''

### Residual capture and dense-scene gate

- [ ] Investigate the warm-path timeout from the rejected per-entity capture experiment before replacing whole-roster `current` materialization. The 200-step equality trace passed but the warm gem profile did not finish within 30 seconds; no candidate performance result was accepted. The verified implementation still pays roster-snapshot/copying cost. See [record](../verification/perception-capture-deferred.json).
- [ ] Reduce and remeasure genuine dense acquisition bursts after the private-audience correction. The final 612-entity workload failed requested 3× native capacity with a 4.46-second cold maximum; first acquisition, finalization, active evidence representation and main-thread service tails need separate attribution. Workers can improve isolation but do not remove necessary output construction or permit dropping witnesses.
''';p.write_text(s)
p=Path('docs/maintainers/TODO.md');s=p.read_text();s+='''

- [ ] Before adopting narrower per-entity perception capture, reproduce the warm 500-gem timeout in run 35959611757 and compare draft/proxy allocations, cache lifetimes and native states over at least the full failing interval. Short transition equality did not qualify that rejected optimization. The existing whole-roster capture is intentionally retained.
''';p.write_text(s)
p=Path('docs/documentation-changelog.md');s=p.read_text();s+='''

The optional scalar-only capture experiment was rejected after a warm-workload deadline failure. Recorded the unchanged qualified implementation, the warm mixed result without a throughput gain, and the dense-scene capacity failure instead of reporting universal scalability.
''';p.write_text(s)
# Check actual local Markdown paths, excluding examples inside fenced code blocks.
files=subprocess.check_output(['git','diff','--name-only','0582e8660e154e6383a407ffb09e75f0b8c6223a','--','*.md'],text=True).splitlines()
missing=[]
for name in files:
 p=Path(name)
 if not p.exists():continue
 text=re.sub(r'(?ms)^```.*?^```[^\n]*\n?', '', p.read_text())
 for target in re.findall(r'\]\(([^\s)]+)\)',text):
  if '://' in target or target.startswith('mailto:'):continue
  path=target.split('#')[0]
  if path and not (p.parent/path).exists():missing.append((name,target))
if missing:raise RuntimeError(f'Broken local documentation paths: {missing[:20]}')
for p in Path('.github').glob('perception-capture*'):p.unlink()
Path('.github/workflows/check.yml').write_text(subprocess.check_output(['git','show',baseline+':.github/workflows/check.yml'],text=True))
Path(__file__).unlink()

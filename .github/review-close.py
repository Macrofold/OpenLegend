from pathlib import Path
import json, sys

if '--clean' in sys.argv:
 Path('.github/workflows/check.yml').write_text('''name: Code checks
on:
  push:
  pull_request:
permissions:
  contents: read
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run check
''')
 for name in ['review-edit.py','review-core.py','review-smoke.mjs','review-fixture-loader.mjs','review-close-smoke.mjs','review-close.py']:
  Path('.github',name).unlink(missing_ok=True)
 Path('docs/verification/action-review-context.txt').unlink(missing_ok=True)
 raise SystemExit(0)

# The reviewer needs the chosen action, not a duplicate of every discarded candidate.
p=Path('apps/server/src/action-grounding.ts');s=p.read_text()
start=s.index('const review = await ports.judge(')
a=s.index('          state:', start);b=s.index('          questions:',a)
s=s[:a]+'''          state: {
            request: text,
            targetEntityId: act.targetEntityId,
            actor: context.actor,
            capabilities: context.capabilities,
            declaredOmissions: result.omitted,
            native: { description: nativeDescription, commands: boundCommands },
          },
'''+s[b:]
p.write_text(s)
p=Path('docs/architecture.md');s=p.read_text().replace('The independent fulfillment classifier sees actual decoded commands, not only the generator\'s revised prose.', 'The independent fulfillment classifier sees actual decoded commands, not only the generator\'s revised prose. Its bounded packet contains the request, actor goals/work, capability constraints, declared omissions and chosen native behavior; discarded candidates are not resent.');p.write_text(s)

r=json.loads(Path('docs/verification/action-review-final.json').read_text())
rows=[]
for name in ['mixed','gems']:
 entry=r['stress'][name];a=entry['baseline'];b=entry['reviewed']
 rows.append(f"| {name} ({b['entities']} entities) | {a['totalMs']:.2f} | {b['totalMs']:.2f} | {a['p95Ms']:.2f} / {b['p95Ms']:.2f} | {a['maxMs']:.2f} / {b['maxMs']:.2f} |")
f=r['stress']['followers']
section='''
## Action capability review

**September 24, 2026 UTC.** Review baseline: `35a448e6a2c55f2b9f62256403c364420cac1ef4`. Qualified source slices are `edf4fe8`, `f5b6821` and `4e2bb53`; the closeout adds a smaller fulfillment-review packet without changing the native executor. Production TypeScript checking and client builds passed in the isolated GitHub runner. Unit/browser suites were neither written nor run, as requested. No live Jev/LLM calls were made and paid model usage was **$0**. Semantic stages below use explicitly injected outputs; these are observed runtime outcomes, not behavioral accuracy or full acceptance claims.

### Actual runtime scope

- [Core exercise](verification/action-review-core.json): exact coordinate movement reached its destination with zero semantic calls; same prose with different target/mode retained separate pending records; a newly queued plan invalidated an old replacement approval before movement started; one operation's binding could not authorize a second operation.
- [Service and semantic-boundary exercise](verification/action-review-runtime.json): an optimistic generated action with no reported stealth omission was held when the independent classifier could not establish full fulfillment; documented tolerable omissions remained partial; a later simulated optional provider outage retained the earlier grounded move; repeated identical operations retained separate identities with no repeated inference; explicit player retries reached classification again. Real loopback HTTP admission, current public-state/patch projection and SQLite shutdown/restart retained pending approval without exposing its commands.
- [Final native exercise and matched profiles](verification/action-review-final.json): a lost target could not replace existing running work; enqueued preparation remained admissible before future supplies arrive; an explicit target survived beyond the first 64 entries in a 92-entity observation; native following remained active under the isolated workload below.
- [Closeout packet exercise](verification/action-review-closeout.json): the compact reviewer packet still contains decoded native behavior and retains the uncertain revision for approval. Packet size and classifier/generator counts are recorded explicitly. This does not measure live providers.

### Matched-host native stress

Both revisions ran on the same Ubuntu GitHub runner, Node v22.23.2, Intel Xeon 6973P-C. The unchanged built-in scenarios each contain 180 measured one-second native advances, zero warm-up and requested speed 3. Baseline is the pre-review commit above. These are single paired measurements, not statistically established speedups. Final entity/event/awareness counts matched across each pair; that is not proof of complete behavioral equivalence.

| Scenario | Baseline total ms | Reviewed total ms | p95 baseline / reviewed ms | Maximum baseline / reviewed ms |
| --- | --- | --- | --- | --- |
'''+ '\n'.join(rows)+f'''

The isolated fifty-follower workload admitted all {f['admitted']} actors and retained all {f['activeAtEnd']} activities after {f['steps']} one-second advances. Median was {f['p50Ms']:.2f} ms, p95 {f['p95Ms']:.2f} ms, maximum {f['maxMs']:.2f} ms, total {f['totalMs']:.2f} ms. It deliberately disables cognition/memory and uses repeated fixture positions to isolate native controllers; it is not crowd collision, social-memory, browser, persistence or end-to-end population qualification.

**Remaining performance limitation:** the mixed scenario has a large first-exposure encounter/event/awareness spike in both baseline and reviewed revisions. Its reviewed native headroom including that cold work is only {r['stress']['mixed']['reviewed']['headroom']:.2f} at requested 3x, below the required 1 even before server/persistence work. `updateEncounters`, event recording and draft finalization appear in the profiles. No claim of sustained population capacity or hitch-free startup is justified. PF/EPR own reducing this cost while preserving audience, event and knowledge semantics. The independent earlier-run raw profile in the service exercise has different timings and is not substituted for this matched comparison.

### Qualification still outstanding

Live Jev/LLM fidelity and threshold calibration; actual NPC acceptance decisions; browser interaction/accessibility and UI-scope races; full crash/permission/replay matrix; PostgreSQL/manual-save variants; general constraints/roles/parameter questions; definition-specific dependency invalidation; and invention/workflow integration remain open in [AC](maintainers/action-capabilities.md#delivered-scope-and-remaining-work), [TODO](maintainers/TODO.md#action-review-regression-todos) and [PF](maintainers/performance.md#action-capability-review-observations). Existing test fixtures need the current schema 11 rather than legacy conversion. Native point movement/follow is implemented, not the entire action repertoire.

Temporary branch-only review runners are removed at closeout and the original CI workflow is restored. No test suite was disabled permanently, and `main` was not changed by this review.
'''
p=Path('docs/verification.md');s=p.read_text()
if '\n## Action capability review\n' in s:raise RuntimeError('Review evidence already exists')
p.write_text(s+section)

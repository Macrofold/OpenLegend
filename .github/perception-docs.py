from pathlib import Path
import json,re,statistics
p=Path('docs/architecture.md');s=p.read_text()
s=re.sub(r'The world now requires development schema \*\*\d+\*\*','The world now requires development schema **13**',s)
s=s.replace('a saved schema-8 manifest','the current saved manifest')
s=re.sub(r'schema version \d+ rejects incompatible development worlds','schema version 13 rejects incompatible development worlds',s)
s=s.replace('A goal edit alone does not change the autonomous response fingerprint.', 'Goal or learned-technique changes create an ordinary reconsideration opportunity through the existing Jev-first route, cooldown and spending policy; no generation is mandatory.')
s=s.replace('Development schema 12 rejects earlier worlds without conversion;', 'Development schema 13 rejects earlier worlds without conversion;')
s=s.replace('format 11 (`development-2026-09-24-actions2`)','format 13 (`development-2026-09-24-perception2`)')
s=s.replace('format 10 (`development-2026-09-24-actions1`)','format 13 (`development-2026-09-24-perception2`)')
s+='''

The source/feature cache is derived; `perceptionFeatures` is only the shared last-phase outward-feature baseline needed to distinguish meaningful changes across save/load. Private recognition, memories and opinions are not shared. Relevant goal/knowledge changes invalidate ordinary reconsideration without requiring an object to leave and re-enter sight. The existing Jev/cognition policy may still choose native continuation, defer or decline; no new automatic provider loop is added.
'''
p.write_text(s)
p=Path('README.md');s=p.read_text();s=re.sub(r'This branch uses development format \d+', 'This branch uses development format 13',s);s+='\nThe native perception/runtime changes and their measured limits are documented in [perception performance verification](docs/verification.md#perception-performance-implementation).\n';p.write_text(s)
p=Path('archive/05-project/implementation-status.md');s=p.read_text();s+='''

## Native perception and reaction-performance slice

Implemented: observer-private visual acquisitions, bounded experience admission, unchanged-exposure reuse with source/geometry/sense invalidation, current coarse feature deltas, shared immutable inert-source descriptors, new-evidence intake, generation-safe bounded scheduler tickets and cooperative checkpoints within native steps. Existing domain/experience/ActorWork/world-writer owners remain authoritative. Current development format is 13; same-version exposure/feature baselines survive restart.

Evidence and residual limits are in [Verification](../../docs/verification.md#perception-performance-implementation). General sensory schemas, fully mutation-fed regional intake, arbitrary persistent-stimulus reminders, dedicated simulation workers, all-speed long-session/end-to-end capacity, PostgreSQL and browser acceptance remain incomplete; [EPR](../../docs/maintainers/events-perception-and-reactions.md) and [PF](../../docs/maintainers/performance.md) retain ownership.
''';p.write_text(s)
p=Path('docs/maintainers/events-perception-and-reactions.md');s=p.read_text()
s=s.replace('**Status:** proposed work; no item is complete merely because this tracker exists. Implement when requested.', '**Status:** a native implementation slice is delivered below; unchecked broader contracts and qualification remain open. Implementation is not population or live-model acceptance.')
for start in ['Separate an observer acquiring evidence from an outwardly observable encounter/action.', 'Remove general `telemetryRevision` from cognitive invalidation', 'Avoid recomputing every actor\'s nearby visibility before checking per-actor eligibility.', 'Replace full retained-experience reconstruction for trigger selection', 'Make dirty-state acknowledgement generation-aware:']:
 s=s.replace('- [ ] '+start,'- [x] '+start)
s+='''

## Delivered native slice and remaining integration

- [x] Observer-private visual acquisition through the existing event/experience owner; observed modality, meaningful living contacts and ordinary-object non-trigger policy retained. Real speech/gestures remain separate outward events.
- [x] Bounded batches of at most 128 new awareness entries and final-phase sealing of newly owned evidence; no raw-state append shortcut or dropped witness history.
- [x] Reuse native exposure membership when the relevant observer/source/map/sense facts are unchanged; preserve stationary-observer source-motion invalidation, current coarse feature changes, asleep/sightless behavior and same-version baselines.
- [x] Share immutable inert-source descriptors; use existing current observations for ongoing stimuli instead of duplicating an event every tick.
- [x] Reuse `ActorWork` with frozen-snapshot deduplication, at most 64 eligible schedule reads per pass, rotating inspected tickets and generation-safe wake acknowledgements. Eligible trigger selection uses ordered unconsumed evidence instead of full recall reconstruction.
- [x] Goal/learned-technique changes can create an ordinary reconsideration opportunity under existing Jev routing, cooldown, fairness and budgets. They do not directly buy generation or grant private knowledge.
- [x] Cooperative native checkpoints preserve full-step atomicity and event-time evidence while allowing host I/O to run. These are not later-game-tick delivery or a second simulation owner.
- [ ] Complete the general EPR01 typed source/episode interfaces, arbitrary sensory-detail evaluators, owner-private threshold/reminder generalization, source-correction cursors and feature-specific policy. The native finite feature adapter is not those systems.
- [ ] Replace the remaining lightweight per-mind/per-entity signature pass and conservative global inventory/manifest invalidation only when profiles justify a mutation-fed regional index. General external-event audience discovery still uses the exact existing path, not a speculative reverse graph.
- [ ] Qualify cold rotation of own-response provenance, fairness under long-running provider work, all-speed long-session/recovery and concurrent editor mutations. The current shared workflow's finite concurrency and protected native survival are unchanged.

Current facts are in [Architecture](../architecture.md#change-driven-exposure-and-reaction-intake); actual runtime/performance evidence is in [Verification](../verification.md#perception-performance-implementation). Deferred automated cases remain in [TODO](TODO.md#perception-performance--deferred-automated-validation). Do not mark the broader EPR00–EPR10 acceptance complete from these native observations.
''';p.write_text(s)
p=Path('docs/maintainers/performance.md');s=p.read_text();s+='''

## Perception/evidence and burst delivery

- [x] Remove private-acquisition audience amplification, batch through the existing experience owner, reuse unchanged exposure and immutable source metadata, and seal newly owned evidence at the final native phase.
- [x] Remove the duplicate all-observer sensory scan from thought admission and diagnostic telemetry as a cognition invalidator. Consume the ordered new-evidence tail; bound schedule reads and preserve newer dirty generations.
- [x] Add cooperative native checkpoints under the existing single mutation lane. Measure CPU, wall time, yields and longest slices separately; reads never see partial native state.
- [x] Run matched original/final cold and warm native profiles, mature-tail lookup and a real HTTP/SQLite burst/restart exercise. See [evidence](../verification.md#perception-performance-implementation), not a population guarantee.
- [ ] Further reduce indivisible finalization, a single path query, projection/serialization and commit spikes when they dominate measured full-stack tails. A long-lived worker or isolated serializer remains PF10-gated; it cannot create another writer or copy the full world each frame.
- [ ] Qualify sustained 1×/3×/8× real-time debt and command latency with representative moving observers, history, database and browser load. The larger native profile and profiler headroom exclude those costs.
- [ ] Flat active-evidence arrays still have copy-on-write append cost; current backlog/consolidation policy bounds them. Profile legitimate mature workloads before introducing paged active state or replacing Immer.
''';p.write_text(s)
p=Path('docs/maintainers/TODO.md');s=p.read_text()
s=re.sub(r'- \[ \] \*\*SR10 — Fixed-phase audience equivalence:\*\*[^\n]*', '- [ ] **SR10 — Acquisition scope and outward-audience equivalence:** private visual acquisition now intentionally has only its observer as audience. Compare real outward speech/action recipients and ordering against uncached exact sensing; cover sleepers, dead/non-memory actors, new actors, private contacts and source changes. Assert that C seeing A but not X cannot acquire X from A noticing it. Do not restore the obsolete broadcast-acquisition behavior merely to match an old digest.',s)
s+='''

- [ ] Automate the finite visible-feature adapter across fire/depletion/name/life changes, same coordinates on changed supports, shared inert-descriptor invalidation and mutable-builder fallback. Add each future sensory dependency with its actual implementation; cosmetic fields do not create new senses.
- [ ] Cover goal/knowledge reconsideration with an already-visible object through injected Jev native/defer routes and bounded live qualification. Verify unchanged goals/knowledge, unrelated diagnostics and distant feature changes do not repeatedly buy inference. Live model behavior is not established by these native exercises.
- [ ] Exercise cooperative HTTP publication during queued cancellation, pause, restore and shutdown; preserve the previous snapshot until full completion. Compare all events, intermediate receipts, physical states and RNG, not only throughput. Performance thresholds require repeated named-host runs; no automated suites were written or run for this task.
''';p.write_text(s)
p=Path('docs/performance.md');s=p.read_text();s+='''

## Native burst execution boundary

A native step may expose cooperative checkpoints, but not a partial world. The application keeps the existing writer lease while servicing I/O against the preceding snapshot; later commands execute only after the step completes. Simulation time, event occurrence, required perception and physical consequences are unchanged by host yields. Finalization and other indivisible operations remain separately measured gates for further work. Current implementation is in [Architecture](architecture.md#cooperative-native-burst-handling), work in [PF](maintainers/performance.md#perceptionevidence-and-burst-delivery), and evidence in [Verification](verification.md#perception-performance-implementation).
''';p.write_text(s)
r=json.loads(Path('docs/verification/perception-final-performance.json').read_text())
rows=[]
for name,values in r['cold'].items():
 for version,runs in values.items():
  rows.append(f"| {name} | {version} | {statistics.median(x['totalMs'] for x in runs):.1f} | {statistics.median(x['p95Ms'] for x in runs):.2f} | {statistics.median(x['maxMs'] for x in runs):.1f} | {statistics.median(x['headroom'] for x in runs):.2f} |")
p=Path('docs/verification.md');s=p.read_text();s+='''

## Perception performance implementation

Production TypeScript/Vite builds and ad hoc native/service exercises were run; no unit or browser suite was written or run and paid model usage was $0. These results do not establish live Jev/LLM quality, PostgreSQL behavior, browser responsiveness or production population capacity.

The [private-acquisition report](verification/perception-private-batching.json) records the intentional audience correction: mixed-scene awareness fell from 31,756 to 3,474 with the same 3,254 event count. The [exposure report](verification/perception-exposure-reuse.json) verifies unchanged visibility reuse, stationary-source feature changes, moved-source invalidation and same-version rebaselining. The [intake report](verification/perception-intake.json) includes 1,001 identical-snapshot refreshes with two actor inspections, preservation of a newer wake and 1,000 one-record lookups over 20,000 retained synthetic records. Synthetic oversized lookup history is not a gameplay backlog-capacity claim.

The [cooperative report](verification/perception-cooperative.json) compares complete native transition bytes with synchronous execution, without changing the frozen input; timer callbacks run during a cold-exposure burst. Its geometry caches were warmed by the synchronous oracle, so it is not an independent cold-host latency measurement. The [service report](verification/perception-service.json) exercises real loopback HTTP, queued native cancellation, full-step publication, SQLite restart and 130-mind ticket pagination. Its timers and fixture data are not a browser suite.

The [final matched-host report](verification/perception-final-performance.json) alternates original `0582e86` and final code in separate processes on one runner, three cold runs per scenario, plus a warm run and a bounded larger scene. Profiler overhead is included. Below are medians across the three run-level summaries, **not pooled latency percentiles**; headroom uses the scenario's requested 3× rate and excludes database, browser and inference costs.

| Scenario | Build | Total ms, 180 advances | Run p95 ms | Run maximum ms | Native headroom |
| --- | --- | ---: | ---: | ---: | ---: |
'''+ '\n'.join(rows)+'''

Cold maxima, warm throughput, longest cooperative slices and full-stack command latency are separate measures. No promise that every native suboperation fits eight milliseconds is made. Remaining indivisible finalization/path/projection/commit work and larger-world qualification stay in PF/EPR. Private-acquisition audience/evidence differences are intentional; old broadcast-event digest equality is not the correctness oracle.
''';p.write_text(s)
p=Path('docs/documentation-changelog.md');s=p.read_text();s+='''

## 2026-09-24 — Perception and reaction performance

Recorded private visual-acquisition semantics, bounded experience batches, exposure/feature reuse, ordered reaction intake and cooperative native checkpoints. Updated EPR/PF delivery state, current development format 13, measured native/HTTP evidence and deferred automated coverage. Superseded the SR10 requirement to reproduce broadcast acquisition audiences while retaining outward-event equivalence requirements.
''';p.write_text(s)
# Remove this task's transient implementation machinery; leave all unrelated workflows untouched.
for pattern in ['perception-*.py','perception-*.mjs','exposure-*.py','exposure-*.mjs','intake-*.py','intake-*.mjs','burst-*.py','burst-*.mjs']:
 for p in Path('.github').glob(pattern):p.unlink()
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

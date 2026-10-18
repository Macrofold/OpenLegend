# Does saving rebuild unchanged memory-search information?

October16,2026. **Completed diagnostic. This suspected saving is absent in the measured busy world.**

Saving maintains both the actual character observations and a catalog used to find relevant observations later. The current recording shows material time inserting catalog records. The code already reads the old and new observation bodies before deciding whether to archive them. This diagnostic will count how often those bodies are exactly equal while a catalog record is still rebuilt. It adds no database requests, scans or changed game rules. If that rarely happens, this idea is rejected before writing an optimization.

Source/type/package/actual-worker and appropriate current behavior checks precede execution. Complete provenance, failed attempts and results will be recorded here. No canonical runtime change is retained; additional/cumulative provider cost is$0.

[Standalone gaps](bottlenecks.md) · [Project plan](../../projects/three-times-scene-performance.md) · [Experiment register](../../maintainers/performance.md)

## Result: zero unchanged-body rewrites

| New/changed catalog input during the measured phase | Personal observations | Other personal memory records | Summaries |     Total |
| --------------------------------------------------- | --------------------: | ----------------------------: | --------: | --------: |
| New canonical records                               |             **5,065** |                       **210** |     **0** | **5,275** |
| Existing canonical records rewritten                |                     0 |                             0 |         0 |         0 |
| Old bodies identical to their new body              |                 **0** |                         **0** |     **0** |     **0** |
| Old bodies changed / deleted                        |                 0 / 0 |                         0 / 0 |     0 / 0 |     0 / 0 |

All fifteen fixed metrics are present before and after measurement; differences exclude restoration/setup. The positive real PostgreSQL cases separately prove that an unchanged, changed and deleted body each increments the correct counter and no other classification. The ordinary complete world/private-place/correction/forgetting/load/reopen checks also pass. Counter-only source stripping reproduces the parent's entire normalized executable code and SQL exactly, confirming that the diagnostic adds only the registered scalar instrumentation. All source/type/package/six-alias/actual-worker gates pass.

This rules out an unchanged-body skip as an optimization for this tested workload. The catalog cost comes from creating new records, principally one personal account for each nearby character, rather than repeatedly rewriting old identical bodies. It does not prove that forgetting, correction, reordering or other worlds can never rewrite an old body. No no-op-write implementation is selected from a zero count.

The actual30.291second phase reaches2.331× with29accepted/1skipped inputs, command p95913ms,37new plans (minimum2),21checked food outputs and all17people/40animals alive. All source, storage/error and exact owned-cleanup checks pass. Smooth3×/input still fails. This instrumented count run is not a before/after speed improvement. Both the focused SQL fixture and actual game close normally with exact database/session counts0/0 and their own directories absent.

Source root `/private/tmp/ol-pf155-memory-counts-20261016-a`,443files/SHA-256 `a42fadc123c598a49c9e9a71720683bf7ecd55fcff951d72dc6d0422693559f7`. Qualification `/private/tmp/ol-pf155-static-result-20261016-a.json`, `/private/tmp/ol-pf155-source-equivalence-20261016-a.json`, `/private/tmp/ol-pf155-postgres-0-candidate-20261016-a.json`; actual count analysis `/private/tmp/ol-pf155-count-analysis-20261016-a.json` pins raw report SHA-256 `74439eb6f47372dd76a43565c9bddc897097d13b2f31f36dc9c6681463c6e9ee`. No canonical counter code is retained. Additional/cumulative provider cost is$0.

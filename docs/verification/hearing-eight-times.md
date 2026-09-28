# Hearing at eight-times simulation speed verification

These are recorded observations from the original verification log, not a new run. “Current” refers to each observation’s recorded revision. [Verification index](../verification.md) · [Current acceptance owners](../maintainers/README.md).

## Hearing 8x runtime qualification

Scope: continued qualification from `9766841`, already integrated with main through `03105fed9209c126e4e69e9faeb4687f42d1e74a` and the `fdcbd31` guidance update. Integration preserved branch checkpoints with connector-published merges, not a force-rebased linear history. This pass changed native profiling, ray-bound setup, receiver geometry reuse and native supply lookup. No manual automated suite or test file was written/run; normal repository CI was left enabled. Paid provider spending was $0. Node 22.16.0, one shared container; raw profiles and disposable databases were kept outside the repository.

### Real native execution measurements

The existing profiler supports `execution: native-slice` in addition to its reference one-second path. Warm-up and duration count actual consumed simulated seconds. It reports slice sizes/counts and whole-call latency; setting `speed: 8` alone never accelerates the benchmark or proves the server keeps up. The committed `scripts/performance/scenarios/mixed-8x.json` supplies a repeatable 2,400-second native workload. Native headroom excludes SQL, publication, providers and graphics.

A 344-entity mixed scenario (10 added people, 20 animals and 300 objects, seed 73) completed 2,400 simulated seconds in 3,930.0 ms before the small optimizations in this pass: 610.7 simulated seconds/wall second, or 1.27 native headroom against the required 480. This includes cold initial exposure. A separate 434-entity scene with 100 added people, 20 animals and 300 objects did not qualify: 960 simulated seconds took 7,688.2 ms before scalar ray setup and 7,410.3 ms afterward, with the same final world digest. Dense visual discovery and status work dominate this case; a 1.1-second cold slice remains. These are short matched samples, not a general population guarantee.

### Geometry work without disclosure changes

An ad-hoc bound-query experiment compared 400,000 original/new classifications including upright-body expansion, parallel/zero-length and boundary cases. Both returned the same 5,286 hits with zero differences; measured old/new query time was 48.35/16.18 ms. Scalar setup is bound once per segment, while division/epsilon arithmetic and exact halfspace tests are unchanged. This is not exhaustive geometric qualification.

The receiver experiment used 100 added people, 20 animals and 500 objects, with 501 immutable snapshots that changed only actor energy and three voice modes per snapshot. All 1,503 candidate queries returned identical ordered-ID digests. Total old/new time was 845.13/112.85 ms; median three-query pass 1.425/0.185 ms, p95 2.593/0.358 ms. One hundred additional mutable/frozen pose, hearing-binding and memory-membership variants also matched. The index retains geometric inputs/IDs, rebinds current entities, and does not cache live hearing permissions or linguistic evidence.

### Evolving-world bottleneck and correction

A first 60-second disk-backed server run at the requested 8× slowed after food supplies were depleted. It advanced 29,018 simulated seconds in 68,200.6 wall ms including its final drain: 7.09×. Only 193 of the scheduled 480 utterances were delivered because the diagnostic driver awaited an overloaded tick. A final empty debt queue therefore did not mean that this run passed.

Profiling the saved evolved scene identified native hunger fallback repeatedly enumerating/proxying every scenery object for every hungry NPC. A resource-definition index in the existing native participant roster preserves live quantity, visibility, nearest-target order and approach checks while removing that scan. Advancing the identical evolved world by another 2,400 simulated seconds took 14,031.9 ms before and 3,954.3 ms afterward (171.0/606.9 simulated seconds per wall second). The entire final-world digest and 4,679-event/7,988-awareness counts matched. No survival or hearing rule was relaxed.

### Disk-backed accelerated-play envelope

The corrected run used the actual `WorldService`, native `executeCommand`, disk-backed SQLite transactions, heartbeat, real elapsed-time `tick` calls and `projectView` plus full JSON serialization. It contained 344 entities with 11 NPC speakers. Eight roughly 100-character utterances were offered per real second, rotating whisper/normal/shout. No model provider or browser was involved. The driver targeted 50 ms updates and awaited each tick/publication; offered versus delivered speech is reported explicitly rather than hidden by this scheduling constraint.

| Measurement                               |                     Corrected run |
| ----------------------------------------- | --------------------------------: |
| Wall duration including final drain/flush |                       60,060.3 ms |
| Actual simulated time advanced            | 28,806 seconds (8.002 game hours) |
| Effective multiplier                      |                           7.9936× |
| Offered / accepted utterances             |                         480 / 480 |
| Public full-view projections/encodings    |                             1,077 |
| Final admitted simulation debt            |           0.731 simulated seconds |
| Speech transition median / p95 / maximum  |        5.791 / 8.172 / 135.302 ms |
| Tick-call median / p95 / maximum          |      41.187 / 57.857 / 274.957 ms |
| Public projection+encoding median / p95   |                  6.138 / 8.001 ms |
| Final heap / storage error                |                   102.3 MB / none |

This run kept up with 8× to timer/flush granularity and delivered every offered utterance through the depleted-food period. Full-view JSON totaled 239.5 MB; this is not actual SSE network traffic because the driver encoded full views rather than patches. Tick timings include multiple internal yielding slices, not one uninterrupted event-loop block. Cold stalls and final heap are observations, not frame-latency or leak certification. Longer sessions, independent concurrent producers, slow clients, actual AI, PostgreSQL and graphics remain separate gates.

The maintained `scripts/stress-hearing.ts` driver repeated the 60-second, 10-added-person, eight-utterance workload using its documented CLI. It accepted all 480 scheduled utterances and advanced 28,804 simulated seconds in 60,079.6 wall ms (7.9905×), with 0.683 simulated seconds of remaining debt and no storage error. Speech p95 was 9.249 ms; final heap was 74.7 MB. Its separate five-second smoke run accepted all 40 scheduled utterances. The repeat supports the bounded envelope while demonstrating normal host/timer variance; it does not add a graphical or larger-population claim.

### Concentrated hearing and durable evidence

A separate native speech plus disk-SQLite burst contained 614 entities, including 101 NPC speakers and 500 added objects. All 400 utterances committed, delivering 34,799 listener perspectives (38,718 total awareness entries including setup) in 4,066.1 ms. Median/p95/maximum speech transaction latency was 9.164/12.524/212.276 ms; final heap 104.7 MB and no storage error. Voice modes rotated without recipient truncation. This isolates audible delivery/persistence throughput; no native time advanced, so it is not an 8× full-world population pass.

### Build and static checks

The generated-status configuration check, production TypeScript and Vite build completed successfully. Full-repository typechecking reports exactly the same 168 diagnostics as the pinned pre-pass snapshot, all in existing test/fixture sources; no test files were edited and no suite was run to hide this baseline failure. The checkout-dependent agent-guidance checker could not run from the source archive because it requires a Git index; this is not a claimed passing guidance check. A separate filesystem link/anchor audit covers changed documentation. Normal repository CI remains unchanged.

### Remaining qualification

The 344-entity disk-backed result does not close the 100-person dense full-native case. [HE05](../maintainers/hearing-and-speech.md#he05--runtime-and-performance-qualification), PF03 and SW08 retain dense discovery/status cost, cold-tail responsiveness, sustained history and independent producer qualification. The prior fixed-anchor DOM checks do not establish real PlayCanvas/camera performance. New automated regression cases are in [TODO](../maintainers/TODO.md#hearing-8-runtime--deferred-regression-coverage). No historical event remasking, audio-recipient pruning, asynchronous uncommitted speech or alternate writable world state was introduced.

# Three-times scene performance investigation

September 26, 2026. Initial measured base `a39311dc`; reconciled onto newly merged `75ee15f7` before final verification, macOS development host, Node 22.23.2 for PostgreSQL comparisons. [Plan](../projects/three-times-scene-performance.md), [work owners](../maintainers/performance.md#current-3-local-scene-follow-through), [reproduction](../maintainers/performance-profiling.md#full-server-scene-profiler).

## Status

The requested sustained stall-free 3× scene is **not accepted**. Measured redundant work has been removed, and the latest 60-second PostgreSQL scene maintained 2.998× with no storage error. Cold and warm command/publication tails remain visible. Earlier comparisons were disrupted by severe concurrent host load. No stall-free, long-soak or live-provider-quality acceptance is claimed.

The disposable fixture starts with 20 other agents, 20 visible animals and 100 visible objects, plus the player and one animal initially outside view. Objects occupy nine nearby positions; actors move naturally, so initial visibility is not sustained-density proof. Real HTTP movement, presence, SSE and server timers are used. Raw JSON/CPU profiles are private under `/private/tmp/openlegend-three-times/`, not committed. No real provider requests, paid calls or automated unit/integration/browser suites ran.

## Measurements and their limits

Matched 30-second PostgreSQL runs with spending disabled and presence heartbeats preceded the final bird/diagnostic changes. These establish improvement in specific stages, not final capacity acceptance:

| Metric                      |           Base | Intermediate optimized build |
| --------------------------- | -------------: | ---------------------------: |
| Achieved simulation speed   |         2.996× |                       3.000× |
| Public projection median    |        90.4 ms |                       4.3 ms |
| Public projection p95       |       279.2 ms |                       9.6 ms |
| SSE updates                 |            145 |                          297 |
| Warm SSE gap p95            |       388.5 ms |                     224.0 ms |
| Warm largest SSE gap        |       866.4 ms |                     603.0 ms |
| Collected heap, start → end | 40.4 → 51.8 MB |               40.6 → 56.9 MB |

Source-specific flushes and early budget rejection subsequently measured warm SSE p95 164 ms, warm maximum 507 ms and collected heap 40.6 → 50.4 MB in another 30-second spending-disabled run. Those remaining gaps are visible, not a pass. Earlier scripted command measurements included a presence request every fourth command; the maintained harness now measures the command alone, so do not compare those old numbers as pure command latency.

A 30-second native-route cognition fixture completed 61 local judge calls, achieved 2.983×, and still measured 2.317-second warm command p95, 221 ms warm SSE p95 and a 2.289-second maximum gap. Heap grew 40.5 → 59.5 MB after GC. This ran before routine-animal trigger and diagnostic coalescing changes. It demonstrates that accounting/context work can remain expensive even when model transport itself is free; it does not qualify real Jev reasoning.

Later base/candidate runs had rejected commands and approximately 0–0.166× progress during host saturation. A sampled host load exceeded 230 on 10 logical CPUs with zero idle CPU. Treat those as failed experiments, not usable speedups or proof that host contention explains every remaining delay. An instrumented EXPLAIN run also paused on maintenance scheduling failure and is excluded. The earlier full-disk blocker was absent (roughly 31–33 GiB free).

Native seed-73 dense replay (300 measured slices, 20 warmup, three requested game seconds per slice) advanced 897.4 seconds. Root-only snapshots measured 2.323 s versus 2.449 s baseline wall time; both produced digest `b312233b1f2620505edd9a2e2670e2934faf60913e62e712d5d032da1a830d30`. These Node 24.13.0 native samples exclude database/browser/cognition. A tentative status-reconciliation skip was removed during review because its small noisy gain did not justify additional invalidation assumptions.

## Bird and lifecycle behavior

A separate seed-73 natural-flight run with 20 NPCs and 300 native slices advanced the same 894.4 game seconds before/after. It retained **34 bird sightings across 21 observers**, and 97 animal sightings overall. Significant bird-acquisition records changed from 34 to zero. Current visibility and raw evidence remain; only automatic semantic salience changed. This does not claim that all bird-related attention disappeared: active interests and meaningful separate events still qualify.

Real PostgreSQL/HTTP one-off checks exercised the current read routing and joined authority fence:

- An independent read returned the last committed value while a writer transaction was held; commit became visible afterward and intentional rollback left it unchanged.
- A second writer was refused by the advisory ownership lock.
- Preference changes were returned by the cached profile path.
- Control replacement rejected an old fence (`control-changed`); the refreshed fence passed. Revoked sessions were rejected (`session`).
- Movement was accepted, and exact command replay reused its outcome.
- Injecting a world-record insert failure rejected the command, preserved the world-head revision and paused the simulation with a visible storage error.
- One hundred same-turn updates to one intelligence record resulted in one SQL write containing update 99; shutdown drained it.

Earlier SQLite browser inspection exercised sign-in, resume at 3×, camera rotation and pause. Warm 10-second frame samples reached p95 17.7–18.2 ms, maximum 33–42 ms and zero frames above 50 ms/long tasks; earlier warm samples were slower (p95 25–32 ms). Cold loading included a 1.267-second long task. The fixture may have dispersed by later samples and this was not the final runtime, so these are renderer observations only.

## Remaining acceptance

PF00/PF05/PF08/PF09/PF12 retain quiet-host final-build PostgreSQL/browser comparisons, cold first exposure, sustained input tails, natural history growth and stable heap. Narrow changed-target visibility reuse remains open: an affected observer may rescan its whole visible set, and cognition has a separate visibility pass. Observer sight setup is now shared within those passes. No measured reduction is claimed for every individual optimization.

The carried-over action-revision/follow workflow arrived during this task in `75ee15f7`. The earlier measurements and lifecycle drill predate that merge; its approval/revision cases are not claimed here. Broader detector/height-boundary, missing-extension/interrupted-startup, restore-with-pending-actions, reconnect/draft-cleanup and hosted/full-suite coverage remain with their existing feature owners. Writer locking and commit rollback were exercised as listed above. No new unit/integration tests were authored.

## Reconciliation

The incoming native-action branch added private encounter batching, coarse changed-feature intake, bounded fair ActorWork selection, bounded HistoryBatch construction and its own general restarted-server workload. These were preserved. The bird change now uses its `encounterEmitter`; meaningful changed-detail intake remains intact. Both history and record SQL use the shared adapter-specific parameter ceiling while keeping construction byte bounds. Documentation conflicts retained both changes' scope and unresolved acceptance. The focused `profile-server.ts` supplies local cognition/SQL/SSE-gap attribution; the existing `performance/profile-server.mjs` retains general restarted/scenario comparisons.

## Final local checks

On the combined `75ee15f7` tree, `pnpm typecheck`, `pnpm build` and `pnpm config:check` passed. Final verification repaired a required diagnostic input field; earlier verification repaired a nullable-position guard in the profiler. Build retains existing PlayCanvas worker externalization and bundle-size warnings. The natural-flight probe repeated the same 34 sightings/zero significant bird onsets after reconciliation. Full automated suites remain unrun as instructed.

The combined production build was also exercised in a fresh SQLite browser world: local sign-in, 3× resume, a ground-click walk with visibly changed player/camera position, pause, reload and explicit Control here takeover succeeded. No browser console errors were observed in that sample. The temporary browser/server were closed; this short functional pass adds no final-build frame-rate guarantee.

The final combined PostgreSQL scene attempt exceeded the 90-second parent watchdog during startup/initial work on the still-busy host and produced no completed capacity report. Its disposable database was removed by the wrapper. Keep this as incomplete verification, not a passing final-build stress result.

## Continued merged-build investigation

All following runs use the combined `75ee15f7` source with this task’s changes and Node 22.23.2. They are ad hoc runtime/profiling observations, not automated acceptance suites.

- **Shared sight setup:** 21 observers × 100 passes returned the same 294,800 visible results. Rebuilding the observer query per entity took 303/184 ms; binding once per batch took 75/81 ms. Cognition and `observeActor` now use that shared phase-local helper. Targets still use current participation, transforms and body dimensions.
- **PostgreSQL memory batches:** 1,000 sources across 20 actors, then revision changes/deletions and repeat reconciliation. Ordinary reconciliation statements fell from 16 to 4 (19→7 including transaction setup/commit). Both implementations produced identical hashes for 858 remaining sources, 286 valid vectors and 572 queued embeddings; rollback preserved the original queue. Busy-host elapsed samples were 8.53/13.38/11.58 s before and 10.57/5.14/5.25 s after. Cold variance prevents a universal speedup claim. The final implementation materializes only needed metadata, not source text/vectors.
- **Merged SQLite server:** two 15-second funded local-cognition runs achieved 2.967×/2.988×, with no storage errors. Before/after shared sight setup, warm publication p95 was 95/82 ms; warm maximum 137/154 ms; cold maximum 529/516 ms. Collected heap ended at 65.2/58.7 MB, with 89/115 fixture calls. These short differing activity samples do not establish a memory reduction.
- **Scheduling read failure:** a deliberate read failure emitted a failed maintenance diagnostic while native time continued at 2.995× with no storage error. A separate run advanced the scheduler’s injected wall clock by 60 seconds and observed successful scheduling reads resume; simulation continued at 2.983×. Paid execution remained fixture-only. This isolates advisory reads; it does not ignore authoritative write failures.
- **Merged action lifecycle:** follow held normally, cancelled after target death, and cancelled after a fixture forced locomotion loss through an active restriction. A real Sleep command cleared visible entities and episodes; Wake restored 12 visible entities with a new exposure episode. The forced restriction fixture is not a claim that every authored incapacity effect was tested.
- **Pending action rollback:** through real HTTP/SQLite callers, started follow, then injected failure after world-record writes while cancelling it. The cancellation returned `storage`, the head revision did not advance, reloading still contained follow, and the server paused with the save error.

PostgreSQL host conditions varied enormously: setup took 10–12 seconds during saturation, with ordinary metadata/diagnostic writes hitting five-second timeouts. A plain `SELECT 1` varied from 0.6 to 184 ms; host samples showed zero idle CPU and 13 GiB compressed memory. Later setup took 0.39–0.44 seconds. Failed runs remain failed; a generic maintenance failure alone does not prove that its failed operation was read-only. A later six-second run completed at 2.974× without storage error but had a 1.145-second cold gap.

Two subsequent 30-second PostgreSQL runs exercised local cognition, native movement, HTTP commands and SSE. The second added per-actor one-second advisory inspection coalescing and removed its unnecessary header lookup:

| Metric                     | Before advisory coalescing | After advisory coalescing |
| -------------------------- | -------------------------: | ------------------------: |
| Achieved speed             |                     2.989× |                    2.995× |
| Local fixture calls        |                        182 |                       176 |
| Maintenance status queries |                      1,294 |                       546 |
| World-head reads           |                      1,648 |                       345 |
| Metadata reads             |                      5,482 |                     2,761 |
| Warm publication p95 / max |                97 / 200 ms |               97 / 319 ms |
| Cold maximum gap           |                     879 ms |                    865 ms |
| Warm command p95           |                     227 ms |                    259 ms |
| Collected heap at end      |                    77.3 MB |                   65.5 MB |

Both maintained nearly 3× with no storage errors. The query reduction is demonstrated; the noisy latency/heap observations do **not** establish an across-the-board timing improvement, a fixed heap regression, or stall-free play. The original 80-versus-69-MB handoff comparison used a different workload/baseline and is not directly comparable.

A final 60-second PostgreSQL run achieved **2.998×**, executed 340 no-cost local judge calls, and had no storage error. Initial and final player views both contained 20 other agents, 20 animals and 100 objects (this samples the endpoints, not every intervening frame). Warm command p95 was 197 ms; warm publication p95/max were 104/367 ms; cold maximum was 1.461 s. Resident history ended at 2,133 events, 5,376 awareness records and one personal memory. Collected heap was 41.2→76.3 MB. This is a short growth observation, not a demonstrated leak or a plateau/long-soak guarantee.

Review found that earlier profiled runs sampled heap after CPU-profile JSON allocation. The harness now collects and captures heap after profile output, before constructing the final inspection/report. Treat older CPU-profile versus non-profile heap differences as contaminated; they cannot establish the carried-over 80-versus-69-MB regression. Completed PostgreSQL samples resolve the prior disk-blocked ability to run this workload, not PF00/PF05/PF08’s remaining cold/tail and long-term acceptance.

Final static checks passed after the diagnostic field repair: TypeScript, production build, generated configuration and changed-file formatting/diff checks. Existing PlayCanvas worker externalization and bundle-size warnings remain. The final read-failure/recovery drill (including the one-second inspection bound) made one failed read followed by 21 resumed actor reads after the injected clock advanced; native simulation continued with no storage error. No automated suites or paid providers were used.

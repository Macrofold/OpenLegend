# Performance implementation tracker

## Data foundation follow-up

The record/query migration and measurements are in [D1/D2](production-data.md#remaining-d1d2-implementation-and-evidence) and [Verification](../verification/data-foundation.md#data-foundation-runtime). Independent PostgreSQL read/write lanes, batched witness eligibility updates, indexed required evidence and skipping discarded memory observation work are implemented. Inactive memory/awareness/summary residency and scoped cold-source consumers are implemented. Dense preparation/copy work is reduced with unchanged native outcomes. PF08/PF09 remain open: initial perception still creates large actor/evidence fan-out and Immer copies growing recent arrays. [Current hardening measurements](../verification/data-runtime-hardening.md#data-runtime-hardening) separate cold-history growth from dense-scene cost. The 100/100/100/1000 and half-size scene runs recovered correctly but did not meet interactive capacity. Bounded worker checkpoints now exceed the former 64 MiB limit under explicit work/package bounds; [current evidence](../verification/checkpoints-and-recovery.md#bounded-history-checkpoints-and-recovery) includes busy-host tail latency and paused restore memory. Do not close D5 from scoped SQL or checkpoint measurements.

## Foundations 1–5 measurements and remaining cost

Follow-up reservation-owner review measured 2,048 native held-item consumptions at a
1,649 ms median versus 3,148 ms at review start (about 48% less wall time, 45% less CPU),
with identical world digests. Draft-owned updates reuse the existing reservation index;
exact fractional summation, occupancy and forks remain verified. The
[review evidence](../verification/foundations-1-5.md#foundation-follow-up-review) records the matched scope.
This does not close the mixed-workload regression or hosted-capacity gates below.

SC/MP/PO/DI/ACT now supply the native owners, real account isolation, bounded streams and process-wide work admission. [Final foundation evidence](../verification/foundations-1-5.md#foundation-priorities-15--implementation-evidence) separates native CPU, both-adapter commits/pages, cold residency and actual browser/TCP behavior. Operational work ceilings are not qualified hosted capacities.

- [x] **PF03/09 foundation regression:** the final matched seed-73 workload (10 added people, 20 added animals, 300 scattered roots, 180 steps, three repetitions per revision) used about 24% more median process CPU than `ce7ef555` at `c1330009` (1,777/2,196 ms). By `be68b1e0` both revisions simulated different worlds, so identical-outcome proofs now compare current main before and after a change. The [September 28 follow-through](../verification/perception-reaction-intake.md#pf0309--native-cpu-stage-2) removed per-root draft proxies and whole-actor copies from the encounter phase, cached encounter inputs per immutable record and removed the boundary freeze's per-key entry-pair allocation. Median seed-73 CPU fell about 18% (1,962 → 1,603 ms, shared host) with identical final, awareness and per-step outcome/audience/RNG digests. Requested 3× is still not reached (headroom 0.60–0.77); do not claim it. Remaining cost is Immer finalization of changed actors (PF08) and status reconciliation (time owner).
- [ ] **September 28 quiet-host confirmation:** repeat the [perception-reaction intake](../verification/perception-reaction-intake.md) timing comparisons on a quiet host: the matched seed-73 CPU runs, the 40,000-entity boundary-freeze timing and the 870-entity first-exposure burst. Every recorded timing was taken on a heavily shared host. Its outcome digests and counters do not depend on load, but no timing there may support acceptance until rerun.
- [ ] **PF08/09 wide resident state:** direct-child pages and root membership are indexed, reservation admission avoids repeated metadata reconstruction, and terminal contributions/appraisals/objects are cold after commit. The flat resident entity map still adds copying cost to root movement. Preserve the five-row write set and exact cold/fork equivalence while measuring alternatives before changing authoritative representation.
  - September 28 [measurements](../verification/perception-reaction-intake.md#pf08--flat-resident-entity-map-stage-9): the boundary freeze now walks only changed entities (patch write set plus the copies Immer published, including cancelled writes) when the predecessor was deep-frozen (40,000-entity freeze 32 → 0.35–0.6 ms, shared host), with the map API and saves unchanged.
  - Immer's first-write copy and full-key finalization of the flat map remain O(N) per transition (about 90/205 ms at 40,000).
  - Sharded entity records or a separate lot map would change that scaling. Both need the save owner's persistence/schema work and an owner decision, so they are recorded as designs, not implemented.
  - Nested plan-command drafts inside the native loop remain a separate API-preserving follow-up for the native-loop owners.
- [ ] **PF04/11 shared load:** actual slow-reader timeout and 40-connection churn passed, and 10,000-lot/12-level SQLite/PostgreSQL journeys report payload/commit tails. These short scenarios do not establish steady heap, 100 independent active humans, mixed live retrieval, WAN or hosted security/operations. Qualify the existing D5 workload before release.

## Elapsed-time integration

[PF13](simulation-time.md#pf13--elapsed-time-simulation) is the focused delivery tracker for independent clock rates, boundary-limited integration and its remaining qualification. [Simulation time](../simulation-time.md) owns the contract. PF12 remains the larger performance program; its older mandatory-step assumptions are superseded, not a requirement to restore a one-second loop.

## Spatial measurements

Cross-link [SW06/SW14](spatial-world.md) for spatial readiness and measurements rather than adding another worker framework here. Retain the implemented static bounds index; one Recast worker and shape-level Rapier are now integrated. Qualify larger workloads before adding more workers, affected-tile rebuilding or a crowd solver. Derived caches and camera updates must retain zero provider cost; SW17–SW19 own current spatial/presentation scope.

This is the sole tracker for runtime performance optimization. [Runtime performance design](../performance.md) owns the approach; [Architecture](../architecture.md#performance-critical-path) owns implementation facts and [Verification](../verification/performance-investigation.md#performance-investigation) owns evidence. Checked items identify delivered implementation or explicitly named runtime observations. Unchecked acceptance and regression items remain open; implementation is not scale qualification.

## Delivery status

PF00/PF01/PF02/PF03/PF04/PF05/PF08/PF09 now include delivered work below. Remaining measurement, failure coverage and legacy compatibility work stay unchecked. Additional PF04 connection isolation and PF06/PF07/PF10 remain conditional without evidence justifying their extra mechanisms. PF11 is explicitly deferred.

Foundations 1–5 add principal/controller admission, scoped per-player streams and shared connection-based automatic pause. Regional replication, the unattended-world toggle and verification with 100 agents, 100 players and thousands of animals remain open. Gameplay epochs remain separate from control generations. Native animals retain full simulation fidelity; dormancy and analytic updates remain gated on semantic equivalence.

## Order and stop rule

For the selected data-foundation work, qualify the [first/growth workload profiles](../../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product) and the [delegated performance direction](../performance.md#selected-approach). Tiny-world budgets below remain useful early checks; passing them alone does not complete the selected first-release target. PF11/D5 retain full player/network/browser qualification, and D6 retains distributed expansion. Replace the withdrawn 20 ms recall gate with measured end-to-end budgets and relevance evidence.

Run PF00 as a short baseline pass, then take the highest measured cost per unit of implementation effort. The initial order below reflects the known query amplification and polling, not a measured ranking of live latency. After each task, repeat the same relevant workload, report before/after percentiles and costs, and rerank. Once the small-world budgets pass with headroom, stop adding mechanisms; retain later tasks as gated scale work.

PF00's short attribution milestone unblocks the immediate fixes. Its larger percentile/soak qualification can follow those fixes; do not build a general benchmarking platform before removing the observed query amplification.

Dependencies require the relevant interface or measurement, not final certification of an entire stage. If PF03 attributes remaining CPU cost to cold history, bring PF08 forward; do not require the CPU budget to pass before removing its measured cause.

PF05 keeps prompt committed publication, with the measured 100-viewer workload now justifying a 50 ms coalescing window to avoid redundant projection. Its movement-cadence experiment still depends on PF03. Stable task IDs identify scope; the Order column controls initial execution priority.

| Order | Task                                          | Expected benefit                                                          | Effort / gate                                             |
| ----- | --------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| 0     | PF00: reproducible baseline                   | Identify where a click actually waits; prevent optimizing the wrong layer | Small; required before changes                            |
| 1     | PF01: compact history/commit SQL              | Remove the confirmed per-event/per-witness query amplification            | Small–medium; immediate                                   |
| 2     | PF02: triggered narration and due work        | Eliminate idle story transactions and repeated actor scheduling reads     | Small narrator change, medium scheduler change; immediate |
| 3     | PF05: prompt scoped publication               | Remove avoidable visual delay and history refresh traffic                 | Small–medium; immediate publication first                 |
| 4     | PF03: cheap native steps and appends          | Reduce main-thread blocking and cost that grows with history              | Medium; choose measured hotspot first                     |
| 5     | PF04: isolate optional database traffic       | Keep inspection/diagnostics/background activity out of the command queue  | Small–medium; only if contention remains after PF01/PF02  |
| 6     | PF06: bound and coalesce optional diagnostics | Prevent trace bursts, large serialization and shutdown backlogs           | Small–medium; batching depends on measured growth         |
| 7     | PF07: bounded command microbatches            | Amortize commits during bursts without delaying lone commands             | Medium; only if commit overhead still dominates bursts    |
| 8     | PF08: bounded hot state and checkpoints       | Prevent aging worlds from increasing every-step cost                      | Medium–large; long-session gate                           |
| 9     | PF09: population indexes and deadlines        | Replace world-wide scans with relevant actors/regions                     | Medium; population-profile gate                           |
| 10    | PF10: worker isolation and prediction         | Keep rendering/I/O responsive when necessary work remains expensive       | Medium–large; explicit CPU or network gate                |
| 11    | PF11: larger-world qualification              | Establish actual capacity and next partition boundary                     | Gated; follows the production-data scale track            |

## Acceptance budgets

These are initial engineering targets for a named desktop and healthy same-host PostgreSQL, not measured results or external promises. PF00 must record hardware, process/build mode, database version/topology, world data, workload and achieved simulation speed. D09 remains the product device decision. Report p50/p95/p99, counts and raw sampled timings; tiny samples do not establish tail percentiles.

| Metric                                                                     | Small-world target                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Click to local destination/pending feedback                                | p95 within one 60 Hz frame; no network dependency                                                                       |
| Native command received to durable result                                  | p95 ≤100 ms, p99 ≤200 ms, including admission queue and database wait                                                   |
| Durable commit to affected player view emission                            | p95 ≤16 ms, p99 ≤33 ms under normal output load                                                                         |
| Click to first confirmed action update on local setup                      | p95 ≤150 ms, p99 ≤250 ms; also measure first changed position separately from accepted action                           |
| Click to first changed position for an accepted, unobstructed walk         | p95 ≤200 ms, p99 ≤350 ms on the local setup; predicted pixels do not count as confirmation                              |
| Native tick CPU at 1×                                                      | p95 ≤8 ms, p99 ≤16 ms per 50 ms batch on both fresh and mature tiny worlds                                              |
| Main-thread simulation work at 8×                                          | No continuous slice >8 ms; sustain requested simulation speed without growing debt                                      |
| Excess timer lateness                                                      | p95 ≤10 ms, p99 ≤25 ms during ordinary play; record GC pauses separately                                                |
| Ordinary walk commit without checkpoint, invalidation or narration trigger | ≤9 SQL round trips including transaction boundaries; witness count adds rows, not statements within a chunk             |
| Idle Narrator                                                              | Zero periodic claim queries when no queued/due work exists                                                              |
| Background contention                                                      | Optional inspection/tracing adds ≤10 ms to native command p95 at the small-world load                                   |
| Long-session behavior                                                      | Pending queues and caches remain within declared caps; no linear per-step dependence on cold historical rows after PF08 |

An injected slow database may exceed normal latency budgets. Correct behavior is bounded queues, responsive pending/paused UI and truthful durability state. Do not pass by dropping events, lowering requested speed silently, disabling relevant background load or hiding confirmed latency behind prediction.

PF03 snapshot freezing and bounded catch-up are implemented; [recorded profiling](../verification/performance-investigation.md#mature-world-tick-profiling) includes mature-save before/after runtime measurements. The next priority is dense first-exposure work and extended qualification of PF08 with naturally aging worlds; synthetic cold-history growth is measured. PF04/PF07/PF10 remain gated on residual measured cost.

## Current 3× local scene follow-through

[Plan](../projects/three-times-scene-performance.md) · [Evidence](../verification/three-times-scene-performance.md). PF00/PF03/PF04/PF05/PF06/PF08/PF09/PF12.3–8: source-specific flushes, durable-snapshot maintenance checks, early spending preflight, profile caching, plain-SELECT read routing, joined publication fences, PostgreSQL batching, narrower cognitive wake dependencies, root-only snapshots and coalesced bounded diagnostics are implemented. Routine animal appearances now update current visibility and remain available to interests without creating individual stored sightings or automatically requesting reasoning; meaningful changes still create evidence. Continued merged-build work shares observer sight setup, reconciles each small memory batch in one PostgreSQL statement, skips impossible maintenance work and isolates advisory-read failures with a bounded backoff.

Acceptance remains open: the final 60-second PostgreSQL sample reached 2.998× with the requested visible populations at both endpoints and no storage error, but retained a 1.461-second cold gap and 367-ms warm maximum. Earlier PostgreSQL runs hit storage timeouts under severe host CPU/memory contention. Targeted memory reconciliation preserved identical stored results with 16→4 statements per 1,000 changed sources. Repeat the maintained full-server fixture on a quiet host, including funded local cognition, natural history growth and browser input. Under PF09/PF12.3, moving sources still cause affected observers to rescan visible membership, and cognition separately evaluates visibility. Prefer a shared dependency-valid visibility query/changed-target path over another unscoped cache. Ordinary known-ID reads and legitimate startup/migration scans need no blanket abstraction.

The requested follow-up review separated the base-world sighting policy’s importance, urgency and reasoning choices, skipped unchanged feature scans, isolated optional diagnostic/profiler failures and removed redundant caption/scene updates. The matched 20-second PostgreSQL samples did not demonstrate an overall speedup: warm update p95/max was 66/92 ms before and 73/323 ms after. Preserve PF00/PF05/PF08/PF09 acceptance; [review evidence](../verification/three-times-scene-performance.md#requested-implementation-review-september-27) records the narrower verified improvements and remaining database/queue work.

The [startup/scale/save continuation](../verification/three-times-scene-performance.md#startup-scale-and-save-latency--september-27) implements shared committed scheduling reads, SQL-free coverage cache hits, narrower memory invalidation, atomic job updates, grouped record writes and scalar-only position/observer snapshots. PF01's alternating 21-observer create/update case now uses 2 statements instead of 42 with identical reload. Sight-episode bindings opt out of map ordinals: one subject leaving view no longer rewrites 3,360 unchanged bindings in the targeted case. PF04/PF08 shared-read and restore/rollback checks passed on SQLite/PostgreSQL. A shared-queue context leak was reproduced and fixed. The normal incompatible development world was explicitly reset by owner request; new-world startup succeeds.

**Known remaining work and reasons:**

- **PF00/PF01/PF05:** removing map-ordinal amplification improved the matched 120-second run from 77/139/483 ms to 70/115/334 ms update gaps (p95/p99/max), sustaining 3.000× without errors. The remaining worst gap overlapped a 327 ms save with multiple SQL waits. Diagnostic `EXPLAIN` samples distinguished database execution from round-trip time but did not reproduce the former 367 ms single-statement tail. Continue database/host attribution under the existing injected-delay qualification. **2026-09-28:** [background saves](../save-and-load.md#background-and-synchronous-world-saves) for simulation progress are implemented ([project](../projects/ordered-async-saves.md)): they are written in snapshot order without holding the mutation queue, with the durable publication boundary unchanged; commands and AI results keep synchronous saves that hold the queue until written ([SB21](../limits/persistence.md#sb21)), and simulation progress that would evict not-yet-durable records is still saved synchronously ([SB20](../limits/persistence.md#sb20)). Correctness, failure and crash drills pass. Matched shared-host scene runs show the remaining queue time in the cognition scene comes from the synchronous saves of commands and AI results (including conversation updates): at 25/100 ms per statement both builds run at 0.08–0.17× ([evidence](../verification/ordered-async-saves.md#matched-scene-runs-pf00-delay-cases)). A stall-free scene under slow storage now needs those moved to background saves with durability-gated publication (PF05, open decision), fewer round trips per save would shorten both kinds ([PF15](#pf15--save-round-trip-batching)), and a quiet-host rerun is needed before acceptance.
- **PF05/HE05:** full-game 130% scale, keyboard/reload and sustained rendered-frame/input checks remain blocked by the browser tool's URL security rejection. CSS now anchors the hidden radio input and excludes it from text-input styling; no actual interaction pass is claimed. Resume these checks once browser access is restored.
- **PF08/PF11:** two minutes with fixture cognition do not establish long-session heap stability, live model quality or hosted capacity. The final 120-second endpoint retained 5,376 awareness entries and about 81 MB collected heap; run the already specified aging/soak qualification rather than extrapolating the short sample.
- **PF14:** the scheduling change below shared only unchanged scheduling facts and coverage counts. Request-wide hydration and fresh validation were subsequently implemented under [PF14](#pf14--shared-cognition-preparation-and-complete-path-cost), with conversation, perspective and history-edit dependencies checked separately from the scheduling cache.

## PF00 — Baseline and attribution

Proposed [EPR00](events-perception-and-reactions.md#epr00--baseline-invariants-and-task-ownership) and [EPR09](events-perception-and-reactions.md#epr09--differential-and-performance-acceptance) consume this profiler and the PF acceptance budgets.

- [x] Provide a reusable bounded native stress runner with saved-world/seed inputs, people/animal counts, crowded/scattered ground-object groups and native-speed headroom. See [usage and limits](performance-profiling.md).
- [ ] Extend profiling only where needed to cover actual timer/debt, persistence and cognition scheduling workloads; native throughput alone is not whole-server capacity.

- [x] Record bounded, monotonic mutation wait, native-step, commit, command durability, projection and SQLite/PostgreSQL statement/lane timings without per-span SQL writes. Record native action acknowledgement and first SSE position separately.
- [x] Add tick wall/native-work/yield, persistence diff/encoding/transaction, CPU/heap, event-loop/GC, busy-callback and requested/accepted/excluded-clock diagnostics; provide an offline native CPU profiler.
- [ ] Complete request-arrival, commit-acknowledgement, SSE-send and browser receipt/render attribution. Preserve bounded telemetry and separate action acceptance from first rendered movement.
- [ ] Reproduce walking, gather, eat, rest/stop, pause/resume, a mature-history view and a first encounter. Compare fresh and preserved mature saves; replay equivalent streams against the baseline and candidate build. Verify outcome codes so a rejected walk is not counted as a successful-action sample.
- [ ] Measure actual PostgreSQL location/RTT, query count, locks, idle queries, event-loop delay, CPU profile, allocations/GC, heap, journal bytes, snapshot latency and view bytes. Use zero-cost provider fixtures and explicit empty credentials/zero spending. Provider-quality acceptance stays separate.
- [ ] Measure the asynchronous PostgreSQL adapter before population growth. Preserve immediate command durability and one world writer. Do not describe the adapter as distributed/scalable persistence; specialized repositories remain gated production work.
- [ ] Capture an initial short trace with at least 30 successful native commands and representative timer work to select the first bottleneck. Before final acceptance, run at least 1,000 native intentions per latency case after warm-up, a 30-minute mixed-load soak, and sampled database delay at 0/25/100 ms per operation. (2026-09-28: the scene profiler now injects per-statement delay and attributes each save to preparation, statement round trips and main-thread time, with a host probe; [shared-host attribution](../verification/ordered-async-saves.md#pf00-save-path-attribution-stage-1). Quiet-host percentiles, the 1,000-intention cases and the soak remain.) Include simulated provider delay, narration due/idle, diagnostics open/closed and periodic checkpoints. Use disposable databases and no paid calls. Keep cold-start/recovery measurements separate.

Attribution exit: stage timings, query count and a short reproducible baseline identify the first intervention. Full exit: larger before/after samples and soak results are recorded in Verification. Fixture/native measurements do not establish live model latency. Broken legacy test assumptions are tracked in TODO; repair affected fixtures before using their assertions as evidence.

## PF01 — Compact atomic history and world writes

Dependencies: PF00. Primary files: `apps/server/src/history.ts`, `store.ts`, `postgres.ts`.

- [x] Add a validated append path that avoids existing-row reads and remove/revoke cascades for genuinely new event IDs. Preserve the existing edit/delete/forget path, duplicate/conflict checks and history backfill.
- [x] Prepare event encodings/perspectives once, bulk write bounded rows per table, and cache schema readiness only after commit. Keep CAS, command results, required history, revocation, accepted mind and job outcomes atomic.
- [ ] Compact remaining metadata/edit-path statements where measurements justify it.
- [x] Group compatible record creates/updates within their table instead of splitting on each observer's operation type; retain strict duplicate creates, parent order and secondary-unique-index ordering. Exercise exact reload and failed duplicate rollback on both adapters.
- [x] Persist key-only sight bindings without insertion-order renumbering; keep disappeared subjects removed and returned subjects distinct. Preserve ordered entities, lists and history; exercise membership changes, checkpoint/restart and rollback on both adapters.
- [ ] Verify 1/10/100-event batches and 1/10/100 audiences increase statements only at configured chunk boundaries. Compare complete persisted/recovered data, not just query counts.
- [ ] Exercise append versus edit/delete, failed transaction, ambiguous COMMIT with original-ID reconciliation, schema backfill, restore and permission revocation. Do not repeat paid calls on recovery.

Exit: ordinary walk meets the SQL budget; append cost depends on new rows; editing/forgetting still removes every dependent private record before success. Report local PostgreSQL latency before/after.

## PF02 — Commit-triggered Narrator and deadline scheduling

Proposed [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) owns the remaining common stimulus-to-ActorWork intake; scheduling qualification remains here.

Dependencies: PF00; coordinate signal metadata with PF01. Primary files: `history.ts`, `narrator.ts`, `http.ts`, `ai-director.ts`, `cognition-maintenance.ts`.

- [x] Return queued-story/next-due information from successful commit/regeneration and wake the existing story-job runner. Use one earliest-deadline timer; preserve causal batching and finite concurrency.
- [x] Recover once at startup, wake on resume, and coalesce commits arriving during the existing runner. Preserve regeneration, cancellation, source revocation and uncertain-work recovery behavior.
- [ ] Qualify rollback, commit-before-notification crash, concurrent claim/provider completion/cleanup, pause, shutdown and uncertain paid completion; queued work survives and uncertain dispatched work never automatically retries. (2026-09-28, save path only: failed background saves, a failed `COMMIT`, SIGKILL during a write and SIGKILL between `COMMIT` and settle, and bounded shutdown are exercised in the [ordered-save evidence](../verification/ordered-async-saves.md); concurrent claim/provider completion, story-job and uncertain paid completion remain.)
- [x] Remove Narrator's per-tick empty claim. Rebuild due state from persisted jobs after restart; no extra queue table or broker.
- [x] Decouple cognition-maintenance scheduling from the awaited simulation timer. Use dirty actors, cached schedule values and due deadlines. Preserve significant events, recurring needs, sleep/day boundaries, cooldowns, pause/speed changes, cancellation and spending limits.

Exit: idle narrator has no claim traffic, eligible committed jobs execute once through the existing attempt policy, and slow maintenance/provider fixtures do not prevent native timer scheduling. Compare background query rates and command tails.

## PF03 — Native CPU and incremental admission

- [x] Remove repeated attribute-definition proxy traversal and dense sight-cache sequential eviction, with matched snapshot replay digests and measured CPU/elapsed comparisons in [Verification](../verification/simulation-and-cognition-audit.md#simulation-and-cognition-audit).

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.

Dependencies: PF00. Primary files: domain `draft.ts`, `events.ts`, `experience.ts`, `kernel.ts`; server `world-service.ts`.

- [x] Remove repeated startup/actor initialization scans and unchanged policy replacement from each commit. Startup, spawn and capability changes retain complete authoritative initialization; broader CPU profiling remains in PF00.
- [x] Make ordinary experience additions proportional to changed actor/source entries; reuse or incrementally maintain indexes instead of materializing all retained experience for each add. Preserve validation, duplicate prevention, forgotten-source and obligation protections.
- [x] Replace repeated commitment scans with source-identity/event/deadline indexes and navigation string-map allocation with cached walkability and numeric breadth-first queues in the original planar slice. Current 3D navigation uses the SW-owned Recast worker; this historical completion is not a claim of an active native lattice/BFS planner.
- [x] Attribute mature-world native cost with a CPU profile and compare the same snapshot with diagnostic input freezing; record runtime evidence without enabling the experiment in gameplay.
- [x] Freeze server-owned snapshots after startup migration, command/editor acceptance and each fixed native step so unchanged branches skip finalization. Keep domain construction mutable until handoff; retain append lineage and serialization.
- [x] Capture post-movement perception scalars once, spatially filter object candidates, use set membership against the prior immutable visibility snapshot, and retain unchanged visibility arrays. Preserve event/audience order and hysteresis; matched replay digests and population timing are in Verification.
- [x] Reuse sorted native participant IDs across the internal steps of one advance, refreshing after nested command transitions; avoid inert-entity work and skip an encounter phase with no eligible observer. The finite no-native-spawn/component-change assumption is explicit; SR12 retains its qualification.
- [x] Assemble permitted actor observations before one final deep copy instead of copying private state and copying the sanitized result again. Returned ownership and scope remain unchanged; SR05 retains its qualification.
- [x] Reduce intermediary entry/tuple arrays in independent domain JSON copying while preserving nested draft support, sparse arrays and safe own `__proto__` data. No new mutable evidence aliasing or admission-time freezing; automated coverage remains SR15.
- [ ] Complete current-format shared-reference, append-proof and source-revocation qualification, with longer growing-history and all-speed workload coverage. Initial freeze cost and short mature-save runtime observations are recorded; they are not a soak/capacity claim.
- [x] Bound each native batch to approximately eight milliseconds, accept only its completed prefix and retain remaining debt. Detect suspension from callback gaps rather than batch duration; preserve one writer and fixed-step order. Speed changes preserve admitted debt. Remeasure sustained command latency under load before adding scheduling machinery.
- [x] Release mutation ownership between bounded batches without changing native transition boundaries, sequences or RNG draws. Commands can be admitted between batches instead of waiting for all accumulated catch-up.
- [x] Superseded fixed-step batching with main’s [elapsed-time integration](../simulation-time.md#native-interval-contract), preserving meaningful deadlines, ordered rates, motion/contact fidelity and actual-prefix debt accounting. Hearing’s append and supply-index optimizations reuse these boundaries. PF13/HE05 retain cold, differential and sustained qualification.
- [ ] Differentially replay movement, survival, changing visibility, death/revival and promises through baseline/candidate kernels at all speeds. Compare events and intermediate outcomes as well as final world/RNG.

Exit: native CPU and event-loop budgets pass with mature tiny-world history; recorded replay differences are zero or explicitly reviewed gameplay changes. Large cold-history separation belongs to PF08.

## PF04 — Optional database isolation

- [x] Eliminate redundant monthly billing-history fetch/parse work before considering another connection: share usage reads until accounting writes or month rollover, while leaving reservation authority uncached. Read-only PostgreSQL and local accounting lifecycle observations are recorded in Verification.

Dependencies: PF01/PF02 and measured remaining contention.

- [ ] Give diagnostics a separate database connection only if production measurements still show gameplay or inference persistence waiting on inspection reads after polling and query fixes.
- [x] Route ordinary single SELECTs to the existing bounded read connection; explicit read transactions retain snapshots, locking reads and all writes retain the sole writer. No extra owner/pool. Broader contention/failure acceptance remains below.
- [ ] Bound query/transaction time and concurrency, preserve privacy/source revision validation across connections, and measure SQL lock contention. Authoritative world writes cannot enter the auxiliary path. Preserve PostgreSQL transaction ownership.
- [ ] Verify an optional-query timeout, diagnostics failure and slow history reader cannot delay or alter world/accounting outcomes beyond the contention budget; reject stale cross-connection results.

Exit: optional load stays within its latency budget, with ownership/revocation tests passing and no uncontrolled pool growth. If the gate is not met, leave this task open and skip it.

## PF05 — Public view and browser responsiveness

Dependencies: PF00; PF02 supplies scoped background notifications.

- [x] Publish explicit action/control outcomes and affected in-memory view fields promptly after commit, coalesced over 50 ms with cooperative slices between viewers (the measured 100-viewer burst justified this window). Keep routine publication independently scheduled and preserve SSE baseline/replay/privacy rules.
- [x] Compare 50 ms native/replication cadence with the 250 ms baseline on cloned small-world saves; adopt 50 ms for improved first-position delivery while preserving fixed-step/RNG order, pause/speed semantics, one-second saves and independent background scheduling.
- [ ] Qualify cadence under browser rendering, long runs and CPU/query budgets; short runtime samples do not establish tail-latency acceptance.
- [x] Remove narrator/history/usage reads from the position/action publication dependency chain. Cache optional sections with scoped revisions and publish their changes independently through compatible patches. Prevent stale asynchronous results from overwriting newer sections.
- [x] Replace visible-chat 1.5-second history polling with scoped change invalidation plus opening/reconnect loads. Preserve pagination watermarks, revocation, selected-person switching, message merging and scroll position. Keep presence liveness and the existing diagnostics cadence.
- [ ] Measure scene updates and React commits. Skip unchanged sections/entities; virtualize only lists with measured rendering cost. Extract pure action eligibility guards only if catalogue/AI preview cost is material, sharing admission logic rather than creating client authority.

Exit: publication/input budgets pass; no history reads for unrelated movement or hidden panels, no leaked scope, broken patch baseline or lost reliable outcome. Server confirmation must remain measurable separately from immediate marker feedback.

## PF06 — Optional diagnostics and bounded buffers

Dependencies: PF00; use PF04 only when its contention gate is met.

- [x] Add bounded diagnostic-write backpressure or batching only if observed pending writes grow during sustained tracing or shutdown flushes become material. The 3× investigation added per-ID coalescing and a 1,000-ID/16-MiB pending bound after measuring redundant writes; sustained overload and finite shutdown qualification remain open.
- [ ] Preserve enqueue-time sanitization/immutability, distinct trace identities, latest terminal snapshots and explicit capture gaps. Batch pending records by age/bytes/count, coalesce superseded versions of the same ID, and keep old versions from overwriting newer persisted values. Accounting receipts are never lossy diagnostics.
- [ ] Bound capture/serialization CPU as well as queue memory; stream large exports and keep checkpoint work outside long SQL transactions. Drain within a finite shutdown policy and report any optional capture loss honestly. (2026-09-28: shutdown now has a finite, reported policy ([SV22](../limits/persistence.md#sv22)) and gameplay loads capture their pre-load checkpoint outside the restore transaction; operational restore now also writes its pre-restore checkpoint before its installation transaction (2026-09-29); diagnostic capture loss at shutdown is not yet counted.)

Exit: sustained fixture tracing cannot grow memory without bound or violate native latency budgets; failures affect diagnostics only. Existing redaction/FIFO/late-billing acceptance stays owned by the relevant TODO/CR checks.

## PF07 — Group queued commands

Dependencies: PF01, PF00 evidence that per-transaction cost still dominates bursts.

- [ ] Evaluate already-queued discrete commands in deterministic order in a bounded candidate batch; preserve per-command receipts and causal intermediate events. Keep immediate flush for a lone idle command and one durable commit in flight.
- [ ] Initially test upper bounds of 10 ms grouping delay, 64 commands and 256 KiB prepared changes, flushing at the first bound. Reject an oversized single command before admission rather than silently splitting its atomic effects; existing permitted larger editor operations need a separate explicit path. Tune only from recorded workloads.
- [ ] Test lost replies, duplicate/conflicting IDs, pickup→craft, repeated consumption, pause/stop barriers, queue saturation and final-item contention. Movement supersession applies only to an explicit unsent-steering contract.

Exit: better burst throughput within single-command latency budgets, finite pending bytes/age, fair admission and identical committed outcomes. No final success before durable commit. Skip if its added coordination buys no measured benefit.

## PF08 — Long-lived worlds, hot state and checkpoints

The approved [history storage plan](../projects/history-storage-efficiency.md)
delivers indexed startup selection, selective event editing and combined
event/observer storage identified in the production-data review. D1/D2 owns the
delivery checklist; [local evidence](../verification/history-storage-efficiency.md#history-storage-efficiency) records query plans, caller/failure checks and disk costs. PF08 retains natural-aging and full-workload qualification.

Dependencies: PF00/PF03 and applicable production-data D1/D2 recovery contracts; D59's accepted 24-hour command policy and its epoch boundary before any receipt expiry.

- [x] Separate unreferenced global events and new epoch-bound gameplay outcomes from per-step state. Retain active memory, obligation/knowledge sources and complete cold history; jobs remain in their existing durable tables.
- [x] Keep inactive memory/awareness/summaries out of ordinary recovery and simulation snapshots; preserve SQL recall, owner editing, consolidation and complete saves. Compare 1,000 versus 100,000 cold sources with the same active world. Consumer review also covers delayed triggers, additive legacy metadata, actor-scoped inspection and reflection across residency expiry; see [native evidence](../verification/data-runtime-hardening.md#history-consumer-review).
- [x] Reduce repeated encounter membership scans, perspective preparation and detached-record finalization; matched dense fixture outcomes remain identical.
- [x] Exercise process death immediately before/after commit, competing SQLite revisions, duplicate actions, PostgreSQL writer fencing/read isolation and interrupted/incomplete migration with disposable native drills.

- [ ] Qualify current-format gameplay receipt recovery and ID/body deduplication. Provider, invention, billing and admin identities remain under their external accounting/authority owners; development compatibility follows the [root policy](../../AGENTS.md#development-save-policy).
- [x] Add local server-issued command epochs and admission expiry, retain complete new gameplay outcomes for 24 hours, then return `expired` before domain evaluation. Persist the next generation/token before pruning. Restore fences fresh admission with a new token; other workflow identities retain their policies.
- [x] Migrate and restore source-preserving cold event snapshots/journals, check row coverage on load, and preserve cold references in owner edits. Prepare fixed-revision snapshot JSON before the transaction; prune only a committed covered journal prefix.
- [x] Qualify local corrupt/incomplete saves, ambiguous process-death boundaries and SQLite/PostgreSQL migration/recovery. Measured main-thread serialization cost justified one bounded worker; [actual evidence](../verification/checkpoints-and-recovery.md#bounded-history-checkpoints-and-recovery) preserves broader platform limits.
- [x] Keep paged history/editor reads and indexed individual cold-event retrieval; recall consolidation never silently deletes global history.
- [x] Bound maintenance preparation/publication to selected chronological sources and aliases; use indexed revision/cursor selection outside the mutation queue, preserving protected barriers, verbatim speech and no automatic retry of unchanged failures. Measure 1,000/100,000 cold sources and saves above 64 MiB on both adapters. The [follow-up review](../verification/checkpoints-and-recovery.md#follow-up-checkpoint-review) also measures byte admission before hydration and reader startup outside the capture barrier.
- [ ] Extend qualification to naturally mature history and rare full-dependency owner edits; these remain explicit slow paths. The synthetic cold-source results do not qualify natural aging or arbitrary active density.
- [ ] Qualify consolidation pressure with active and cold backlog: native time/walking must continue while cleanup can publish further distinct batches within the same game hour. Bounded successive batches, native walking, source/generation rejection, speech/obligation preservation and 10,000 active sources are now exercised in [checkpoint evidence](../verification/checkpoints-and-recovery.md#bounded-history-checkpoints-and-recovery); full natural-pressure/live-model/population acceptance remains open. Failed unchanged batches must not retry automatically, and protected evidence must remain intact.

Exit: same active tiny world at increasing cold-history sizes meets per-step budgets; backup/recovery retains complete permitted history and forgetting/spending state. Command receipt expiry additionally requires the implemented and verified epoch watermark. Other historical deletion remains blocked until its own retention policy is accepted.

[AG07](agent-agency.md#ag07--meaningful-feedback-survival-and-bounded-reconsideration) and [AG12](agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized) connect native continuation and fair cognition admission to measured behavior/cost. Qualify the existing global workflow before increasing concurrency; no population or price target is established by the agency design.

## PF09 — Population work follows relevance

- [ ] Qualify the measured dense acquisition and moving-observer costs from the simulation/cognition audit: the 344-entity cold mixed fixture missed 3×, and 164 crowded entities had only 1.31× native headroom at 1×. Extend EPR02/EPR05 change-scoped work before claiming population capacity; retain real evidence and indivisible-step latency reporting.

The [repertoire foundation run](../verification/invention-foundation.md#repertoire-foundation-runtime-observations) adds current-baseline cold gems/mixed samples. Both miss the requested 3× rate; source-backed graph reads do not resolve that native cost. Retain the existing phase/privacy work and qualify current-tree cold/warmed full-application behavior before new optimization claims.

The [invention performance review](../verification/invention-foundation.md#native-capacity-boundary) reproduced dense first-exposure/event fan-out and missed 3× native capacity on its older spatial baseline. Subsequent [native scaling work](../verification/spatial-scaling-followup.md#spatial-scaling-review-third-pass) already improves audience/experience/participant and geometry paths; remeasure the same full-stack workloads before attributing current capacity. Private acquisition and broader qualification remain open. Preserve actual witnesses, physical effects and native RNG/order; do not meet a benchmark by silently dropping exposures. SR07 in [TODO](TODO.md#spatial-review-regression-todos) retains the integrated regression requirement.

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.

Proposed [EPR02](events-perception-and-reactions.md#epr02--eliminate-redundant-full-world-sensory-scans) owns the specific object/audience scan integration; [EPR10](events-perception-and-reactions.md#epr10--conditional-incremental-spatialdeadline-infrastructure) owns its conditional incremental-index work. PF retains broader population qualification.

Dependencies: PF03/PF08 and PF00 population profile; reuse real-time interest and D6 boundaries.

- [x] Add spatial candidates, outstanding-commitment/deadline indexes, dirty-actor scheduling and cached static geometry where scans dominate. Rebuild indexes on load/restore and validate through the authoritative mutation path.
- [ ] Qualify the change-fed intake owned by [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake). Profile thought and maintenance refresh separately; preserve threshold crossings, source invalidation and interest expiry. A [server scenario](../verification/perception-reaction-intake.md#epr05--one-fair-intake-stage-5) exercises ordering, cursor, speech ownership, sleep deferral and change-fed visibility; dense-crowd refresh profiling remains.
- [x] Replace the world-global autonomous thought interval with fair per-actor eligibility and explicitly bounded provider/context capacity. Keep interactive priority, per-actor serialization, spending reservations, cancellation and result revalidation; one global workflow is bounded but does not establish multi-agent responsiveness. The interval itself was already gone. Since September 28, [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) selects characters by urgency and wait time with aging, and keeps the one shared execution slot. Raising concurrency stays a separate spending decision; multi-agent responsiveness is not established.
- [ ] Qualify dense first-acquisition bursts after the implemented EPR03 observer-private correction. Measure actual observer/source records, external-event audience rows, history lookup and source-admission CPU independently. Do not restore the invalid acquisition witness multiplier or silently suppress legitimate evidence/story introductions. Current large bursts and native finalization can still exceed latency budgets. The 870-entity [burst](../verification/perception-reaction-intake.md#dense-first-exposure-stage-8-pf123pf124sw084a) records about 9,900 genuine private sightings. September 28 removed its per-record commitment, freeze and draft-origin overhead with identical outcomes; GC and status reconciliation remain large, and latency acceptance was not measurable on the loaded host.
- [ ] Profile per-second animal countdown updates and repeated entity sorting before evaluating dormancy/analytic updates; preserve needs crossings, actual event-time witnesses, action ordering and RNG semantics. Include moving observers and dense crowds; indexes cannot discard real audience work.
- [x] Keep existing bounded AI/context execution and one coalesced opportunity per cognitive actor; preserve per-agent spending reservation and mandatory evidence policy.
- [ ] Batch eligible embedding inputs only with measured benefit, without merging private contexts across actors; qualify dense-crowd fairness/backpressure.

Exit: cost follows active changes and relevant neighbors in sparse worlds; dense cases have explicit limits and backpressure. Broader gameplay/AI-quality acceptance remains in ACT/CR/NC.

### PF09 encounter implementation sequence

[Encounter scaling](../encounter-scaling.md) owns the measured triage design; EPR owns private perception-acquisition semantics. These tasks add no new scheduler or public-event authority.

- [ ] **PF09a:** Instrument candidate filtering, exact sense checks, event audience, experience mutation/finalization and history projection separately in cold and warmed fixtures. Preserve counts, seeds, requested/accepted time and bounded counterexamples.
- [ ] **PF09b:** Qualify and extend the existing source-audience reuse, experience membership index and native participant/observation optimizations against cold acquisition and full application fixed-step workloads. Do not recreate the delivered indexes. Add a wider batch path only if a new measured bottleneck justifies it; preserve actual public witnesses, ownership and ordering. PF03 and SW retain the implemented optimizations; SR08–SR15 retain their existing regression coverage.
- [ ] **PF09c:** Implement the accepted EPR private acquisition boundary for ordinary first-noticing, rather than broadcasting each observer's perception to every other actor. Treat this as an explicitly qualified semantic correction, not claim identical old event/awareness digests. Keep real speech/actions and configured public occurrences separately witnessed.
- [ ] **PF09d:** Qualify large legitimate audiences and isolated graph/scenario work concurrently with native play. Bound work without exposing half-transitions or silently dropping required effects. Adopt resumable preparation/worker execution only if the simpler fixes cannot meet a measured workload.
- [ ] **PF09e:** Record cold peak stall, warmed throughput, memory and event/awareness growth across population/density/speed. Keep deployment target sizes explicit; do not infer scale readiness from small tool-call latency or remove the first-exposure spike from reports.

## PF10 — Workers and movement prediction

Dependencies: PF03/PF05; measured residual event-loop CPU or unavoidable confirmation RTT.

- [ ] If necessary, give a worker long-lived simulation ownership or offload a measured bounded path/serialization task. Send versioned compact messages, not full snapshots every frame. Revalidate results and define crash/recovery and ownership fencing.
- [ ] Implement local movement prediction/reconciliation only through the real-time design's existing version/permission/receipt contract. Never use prediction to authorize reach, inventory or damage. Benchmark browser frame work and correction frequency.

Exit: lower event-loop/render latency after message-copy overhead, unchanged authoritative results, tested stale-result/worker-failure recovery. No worker merely wrapping already asynchronous database/provider I/O.

## PF11 — Scale qualification and continuous regression

Dependencies: immediate budgets passing; coordinate D5/D6 and R12 rather than duplicate their rollout.

- [ ] Publish reproducible profiles independently varying entities, active actors, observers, players, history and event rate. Include approximately 12/1,200/12,000 entities; 2/200/2,000 cognitively capable actors; and 100/1,000/10,000 events per real minute. These are experiment axes, not promises that every combination passes or that all NPCs call a model per event.
- [ ] Include 1/10/100 simulated clients, sparse geography and a single crowded hotspot, 1×/8× speed, long history, slow consumers, storage stalls and optional inspection/AI fixture load. Record achieved speed, p95/p99 commands, bytes, CPU/heap, queue age and recovery. Add real clients only under the multiplayer implementation gate.
- [ ] Add stable cost/scaling regression checks to CI and run noisy hardware-sensitive latency/soak checks on a named reference host. Gate per-event query amplification and idle polling directly; periodically qualify mature-save performance.
- [ ] Before sectors, replicas or a durable external journal, demonstrate the saturated resource and satisfy the existing production/real-time migration contracts. Re-run privacy, conserved-resource and failure tests at the new boundary.

Exit: a published measured capacity envelope and a justified next bottleneck. No unsupported 100×, 1,000× or 10,000× capacity claim.

## Spatial-provider review integration

SW04/SW05/SW08/SW10 and SW17–SW19 own indexed geometry, Recast worker preparation, bounded immutable sight reuse, camera-facing presentation and shadow/depth work. The remaining cold-navigation and dense-first-exposure measurements are tracked in [SW scaling next steps](spatial-world.md#scaling-next-steps), with EPR02/EPR10 retaining audience/intake changes. Keep those task bodies in SW/EPR; [SR01–SR23](TODO.md#spatial-review-regression-todos) records the automated coverage deferred by the owner. PF population qualification is not complete merely because an isolated provider or a corrected evidence workload is faster. The combined [spatial review](../verification/mixed-spatial-review.md) includes real SQLite commits and software-rendered frames. It exposes remaining full-step/finalization and rendering costs; it is not hardware-GPU capacity evidence. Measure grass/resource/shadow instancing and material/texture atlas reuse before adding another renderer abstraction; preserve per-instance alpha, lighting, virtual depth and authorized reveal. A small shader update duration does not measure the complete GPU frame.

### A further 90% end-to-end reduction

Treat this as an attribution target, not a result of multiplying microbenchmark speedups. PF00 must separate queue/native/commit/projection/SSE/render spans on the same scenario. Reducing one fraction of latency by 90% cannot reduce the whole by 90% unless it dominates. Use lazy spatial work and participant reuse already delivered; next target the measured dominant remaining layer through PF01/PF05/PF08/PF09 and EPR02/EPR03 rather than adding another cache speculatively. Keep first acquisition, dense no-route search, mature history, ordinary movement and full-stack sustained load separate. Do not change visibility, auditory evidence, durability or simulation time to meet a number.

### Cognition review stress follow-up

- [ ] Under PF00/PF03, qualify cold geometry/encounter/finalization bursts in the existing gems and mixed scenarios: the [cognition review measurements](../verification/cognition-context.md#cognition-context-and-action-capacity) remain below requested 3× headroom. Compare equivalent sequential runs before choosing a targeted optimization; do not add a worker/queue based on these profiles alone.

- [ ] Qualify clustered sleeping-actor workloads under PF00/PF03: [sleep runtime evidence](../verification/attributes-and-actor-state.md#declarative-actor-sleep) measured 100 sleepers below 3× capacity. Attribute native draft/update and observer costs before introducing sleeping-actor dormancy; energy, hunger, wake events and perception must retain their semantics.

- [ ] Follow up on [generic status-effect stress evidence](../verification/attributes-and-actor-state.md#generic-status-effects): immutable rule traversal removed the measured status-runtime bottleneck, but dense native scenes remain below full cold 3× capacity. Attribute remaining costs before adding applicability indexes, queues or dormancy.

- [ ] Profile remaining full Intelligence history latency after the parent/time index and compact projection; current live reads still take about 870ms median under simulation. Follow-off root peeks are inexpensive. Measure remaining query/projection work before introducing caches or coordination; see [runtime evidence](../verification/creator-tools-and-diagnostics.md#intelligence-panel-readability-and-runtime-verification).

## Limits growth review inputs

The [limits growth-path review](../limits/README.md#growth-path-review-coverage) records source-inspected missing work bounds at `af1eb02`; it is not new benchmark evidence. [C18](limits-audit.md#c18) feeds PF03/PF09 and EPR02/EPR05 dense native work and hot evidence; [C17](limits-audit.md#c17) feeds PF08/CR exact/lexical recall, repeated coverage counts and unbounded mandatory/conversation preparation; completed C19 is recorded under [NW11](../limits/native-work.md#nw11) and PF01/PF07 queue admission. Read the inventory’s actual upstream protections before introducing another limit.

PF08’s mature-world and explicit-owner-edit qualification includes [MH06/MH07](../limits/memory.md#mh06), and existing CR private-note work includes [KG01](../limits/memory.md#kg01). Separate automatic memory growth from extreme authored collections. Serialized/read lanes and output LIMIT clauses are not evidence of bounded queued or pre-selection work. Existing acceptance remains open; no extra duplicate task checklist is introduced here.

## Immediate gameplay limits follow-through

The [approved implementation](../projects/immediate-gameplay-limits.md) delivers queue depth/age admission (C19), coordinated capacity, coalesced fair view publication, change-fed encounter reuse, private native checkpoints, resident awareness eviction, pre-hydration memory admission and indexed optional lexical selection. [Evidence](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits) records unchanged mixed outcomes, the valid dense workload, 100 synthetic player connections/commands and both database adapters. Completed C19 stays in [NW11](../limits/native-work.md#nw11), not a duplicate todo.

PF03/PF09/EPR02/EPR05 still own real first-exposure fan-out and long individual finalization. PF08 still owns personal-memory array growth, cold count/vector/broad-text cost, observation construction before context admission and natural aging. PF04/PF05/PF11/D5 still own the approximately 11.5-second final 100-player speech burst and sustained full-release acceptance. These measured residuals remain open; 3× and the full 100/100/100/1000 workload are not claimed. The 50 ms publication coalescing window deliberately trades a small idle delay for far fewer redundant projections under contention; it supersedes the earlier unconditional zero-delay preference in PF05.

## PF12 — Eight-times spatial and sensory execution

[The runtime budget and algorithm direction](../performance.md#eight-times-spatial-and-sensory-budget) is canonical. This section sequences existing PF/SW/EPR owners, not duplicate implementations. Evidence: [spatial rebase](../verification/spatial-rebase-eightx.md).

- [x] **PF12.1** Rebase spatial delivery onto current main while retaining status effects, item handling, base-world ownership, observer identity, follow camera and in-place saves. Initialize collision in configuration/profiling composition scripts; report only actually advanced simulation as native throughput.
- [x] **PF12.2** Run actual short 8x server and native workloads with the real base ratio, report dense failure honestly, and implement conservative threshold rejection for the current attenuation-only acoustic query. No whole-game speedup follows from that microbenchmark.
- [ ] **PF12.3 / PF09 / EPR02–03** Scalar visibility reuse, spatially filtered exposure changes and dirty-region object-cache invalidation are delivered. Complete dense acceptance and finer target-only recomputation when an affected observer must rescan. Preserve episode identity, source-scoped names, capability/geometry invalidation, ordered acquisition and complete output; do not retain draft entities. September 28 [dense measurements](../verification/perception-reaction-intake.md#dense-first-exposure-stage-8-pf123pf124sw084a): in a 276-entity crowd the sight cache absorbs 97% of rescan tests. Target-only recomputation is deferred until rescans dominate a profile. Per-record burst overhead was reduced with identical outcomes; dense acceptance remains open.
- [ ] **PF12.4 / PF09 / EPR02–10** Receiver-volume candidates and explicit stable-flight-phase audience reuse are delivered for current sight/hearing. Complete acoustic transfer reuse and dense qualification. Not attempted in the September 28 perception-intake work, which changed no hearing code. Qualify varied hearing extents, stacked floors, simultaneous moving sources/listeners, exact emission origins, all real audiences and marginal thresholds. Reuse existing spatial query primitives.
- [ ] **PF12.5 / PF03 / PF08** Remove measured status applicability, historical finalization and serialization amplification. Retain routine-progress durability and the accepted elapsed start/rate/end contract. Finite applicability/rate prediction, registered history-array sealing and perception-only inter-slice snapshots are delivered. Immutable array copying/prefix proof remain linear; coupled-law, dense finalization and serialization qualification remain open.
- [ ] **PF12.6 / SW17** Qualify direct/common-profile route reuse, static segment certificates and relevant-tile invalidation before changing navigation preparation. Keep dynamic collision and knowledge-dependent traversal outside static proofs; measure cold waits and shared queue age.
- [ ] **PF12.7 / PF05 / SW18** Coalesce replaceable pose publication at a real-time rate without delaying command/authorization/history boundaries; profile React and renderer independently. Evaluate shadow, foliage and resource instancing in spatial chunks on a named physical GPU.
- [ ] **PF12.8 / PF00 / PF11** Repeat full-stack 8x with the named mixed scene, surfaces/flyers/lights and mature history; record actual progress, busy/unadmitted time, debt, navigation waits, command tails and retained resources. Do not claim success from requested iterations, empty/blocked updates, excluded technical time or rendering-only metrics.
- [ ] **PF12.9 / PF10** Only if optimized work still needs isolation, qualify a long-lived simulation owner worker. Document ordering, persistence/recovery and message ownership before moving it; never add a second writable world or a worker per actor.

Dense 8x is not complete. The implemented PF12.3–PF12.5 follow-through is measured in the [integration record](../verification/spatial-cadence-main-integration.md#performance-follow-through); continue their remaining dense/history qualification, PF13.11 regional rates and PF12.7 visible frame cost. No new density or geometry limits were raised by this rebase.

## Perception/evidence and burst delivery

The native action integration retains main's regional scalar/object exposure caches, elapsed cadence, navigation workers and dependency fences. It adds private acquisition batches, outward-feature invalidation, body-sized contact candidates, exact immutable history preparation and bounded SQL construction. SQLite isolation now preserves the independent read-only WAL snapshot path and transaction publication hooks. [Architecture](../architecture.md#private-perception-and-evidence-batches) owns behavior; [current evidence](../verification/native-action-integration.md) separates integration checks from historical reports.

PF00/PF03/PF08/PF10/PF11 remain responsible for real-server latency, growing history, dense recipients, checkpoint competition and production capacity. [DP-R01–DP-R10](action-regressions.md#dense-persistence-regression-coverage) retain failure/coverage requirements. A worker or shorter build is not acceptance. Local disk exhaustion blocked that integration’s fresh PostgreSQL fixture; the September 27 runs below completed on disposable PostgreSQL databases, while capacity acceptance remains open.

## September 27 hearing continuation

PF04/PF05/PF06/PF08/PF09: implemented reduced routine sighting retention, lower social-onset reasoning, 100 ms/64-ID diagnostic batching, leading 50 ms publication windows, skipping empty background saves, and routine buffering of computed navigation results. The owner authorized the [behavior changes](../memory-architecture.md#encounters-sensory-detail-and-reminder-continuity). Hearing's history panel now shares scoped request handling; exact listener evidence remains unchanged. [Evidence](../verification/three-times-scene-performance.md#hearing-review-continuation-september-27).

The requested stall-free 3× scene remains **unaccepted**, not closed: ordinary updates improved, but slow database saves still hold the world mutation queue. (2026-09-28: simulation progress now uses [background saves](../save-and-load.md#background-and-synchronous-world-saves) that no longer hold it; see the [project](../projects/ordered-async-saves.md) and its evidence. Commands and AI results still use synchronous saves that hold it.) Host load reached 74 on 10 logical CPUs; a later save took 2.54 s. Next isolate storage/host latency on a quiet machine, then qualify the existing ordered-save boundary against PF00's delay cases. If asynchronous world persistence is needed, preserve one authoritative world, bounded pending snapshots, receipt ordering, atomic failure behavior and history release; simply releasing the mutation queue around the current commit would overwrite newer state. Do not hide stalls by dropping audible recipients or claiming requested speed equals achieved throughput.

## PF14 — Shared cognition preparation and complete-path cost

Implemented and locally qualified on 2026-09-27 as a follow-up to [NC14–NC17](narration-and-conversations.md#compaction-delivery-and-evidence), implementing the consistent preparation boundary already tracked in [CR03/CR04](cognition-redesign.md#cr03--compact-english-context). Depends on the delivered conversation owner and PF00 attribution tools, not completion of broader population acceptance. The [compaction microbenchmark](../verification/conversation-compaction.md#conversation-compaction-review) measures seven preparation reads plus four metadata validations; it excludes surrounding cognition work and is not a complete-request SQL budget. That inspection identified repeated scope reads, overlapping recall/conversation hydration, and covered speech discarded only after retrieval/rendering. The [implementation plan](../projects/postgresql-cognition-preparation.md) and [matched complete-path evidence](../verification/postgresql-cognition-preparation.md#postgresql-only-storage-and-shared-preparation) now cover request-owned scope/body reuse, early optional exclusion and shared fresh validation. Native race/lifecycle checks preserve required evidence and privacy. The 350-turn warm caller hydrates 65 bodies instead of 367; conversation metadata still needs fresh reads, and broader hosted/soak/model-quality acceptance remains separate.

- [x] **PF14.1 — Attribute the complete path.** Trace actual `AiDirector` and reflection consumers from admitted trigger through preparation, attention/routing, action preparation, generation and publication. Separate local CPU, database/lane wait, scheduling and provider wait; count executed SQL including transaction boundaries, hydrated rows/bytes, repeated rendering, prompt bytes and compactor calls. Start with existing bounded diagnostics and zero-cost providers, without a new profiling framework.
- [x] **PF14.2 — Share request preparation.** Reuse one actor/generation scope and source snapshot across trigger evidence, recall and conversation projection. Retain admitted hydrated records with source revisions and fetch only missing bodies. Exclude conversation-covered speech from optional recall before hydration/rendering, including duplicate groups, while preserving independently required triggers, commitments and corrections. Bounded optional recall is not the complete conversation; retain exact conversation membership and byte admission. Keep compaction policy in its existing owner and storage permission checks in the repository.
- [x] **PF14.3 — Avoid redundant freshness work.** Share validation of overlapping sources and skip repeat reads only when revision tracking covers every relevant dependency: restore generation, conversation membership, source edits/deletions, corrections/forgetting and perspective. Preserve bounded race handling, ordinary-append tolerance, checks after asynchronous work and atomic publication. Do not substitute actor-local revisions for global/event dependencies they do not track.
- [x] **PF14.4 — Qualify the result and remaining growth.** Compare the complete path before/after on the same PostgreSQL inputs: short conversations, warm summaries, cold/restore rebuilds, histories exceeding optional recall capacity, concurrent appends/edits and increasing retained history. Report sampled latency distributions, allocations/heap, SQL and hydration costs, prompt bytes and unchanged admitted outcomes; keep provider latency/quality separate. Include repeated compaction, cache invalidation/rebuild frequency, derived-row growth and explicit cold-limit failures under [LA236](../limits/narration.md#la236). Attribute remaining metadata scan/planner cost before choosing indexes or incremental validation; do not raise limits or add queues/caches merely to improve a microbenchmark.

Exit: duplicated preparation and unchanged-source validation are reduced with matched complete-path evidence, preserved privacy/evidence/budget semantics and passing native race/lifecycle scenarios. Record any remaining dominant cost and measurement limits. [NC12](narration-and-conversations.md#nc12--remaining-compaction-acceptance) retains behavioral and regression acceptance; PF11/D5 retain hosted/population qualification.

Local qualification limits: samples cover 5/150/350-turn inputs, ten repeated warm replies, restore and a 1,300-turn explicit cold failure. Summary storage remains one row per actor/conversation in the repeated run. Process CPU, SQL, hydrated bytes and sampled heap are recorded; allocation totals, peak heap, stable long-session tails and hosted contention are not established. Those broader PF00/PF11/NC12 gates remain open.

## PF15 — Save round-trip batching

**Proposed 2026-09-29; not approved for implementation.** Question: should a save's SQL statements reach PostgreSQL in a few round trips instead of one per statement? Every save currently makes 17–23 round trips on average (44 at most); on a slow or remote database each save costs about that many round-trip times, and synchronous saves hold the world update line for all of it. Behavior and acceptance: [feature spec](../projects/save-round-trip-batching-feature-spec.md). Mechanism, options and limits: [technical design](../projects/save-round-trip-batching-tech-design.md). A 2026-09-27 multi-statement text attempt was rejected ([runtime performance](../performance.md)); this proposal keeps bound parameters and is gated on real round-trip time.

Depends on: PF00 profiler attribution (delivered). Coordinate with `origin/codex/history-storage-efficiency`, which also edits `world-records.ts`. Independent of PF05 (moving commands and AI results to background saves); the two combine.

- [ ] **PF15.1 — Decision gate and trial.** Measure the round-trip time of the database the game will actually use. Classify every statement of a background save and a command save by whether its result is needed. On a disposable database, try combined statements (data-modifying CTEs): parent and child rows in one statement, re-parenting before a delete, new and changed rows of one table together, the same row twice, a failed check, a unique violation, the statement time limit on a group, parse/plan time of a 64-statement group, and round trips and save times at 0/5/25 ms injected delay. Record results and the go/no-go decision; include the pipelining-driver option only if a driver change is on the table.
- [ ] **PF15.2 — Start and time limit in one round trip.** Send `BEGIN` and `SET LOCAL statement_timeout` together for write transactions.
- [ ] **PF15.3 — Adapter write groups.** Deferred writes, flush before reads and `COMMIT`, explicit barriers, checked statements, group bounds, round-trip metrics and the off switch, as designed.
- [ ] **PF15.4 — Save writers use groups.** Revision advance, history inserts and total check, memory source index and record writes; a barrier before record deletes; memory index upkeep stays standalone after a flush.
- [ ] **PF15.5 — Rest of the transaction (conditional).** Memory index upkeep and other write transactions, only if PF15.4 measurements show they matter.
- [ ] **PF15.6 — Qualification and default.** Equivalence with the setting on and off (row hashes, durable revisions), the failure and crash drills plus in-group failures, matched ABBA scene runs at 0/25/100 ms and on a quiet host; update LA174/LA175, [save/load](../save-and-load.md#background-and-synchronous-world-saves) and [Architecture](../architecture.md); decide the default.

Exit: a typical background save and command save use at most 4 round trips; database contents are identical with the setting on and off; failure outcomes match today's drills; the 25 ms PF00 case shows at least a 40% shorter median synchronous save in matched runs; the default is decided and documented. If PF15.1 shows the target database's round trips are too cheap to matter, record that and close PF15 without implementing.

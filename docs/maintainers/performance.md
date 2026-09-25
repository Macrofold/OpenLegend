# Performance implementation tracker

## Spatial measurements

Cross-link [SW06/SW14](spatial-world.md) for spatial readiness and measurements rather than adding another worker framework here. Retain the implemented static bounds index; qualify larger actor/geometry workloads before adding navmesh workers, tiled rebuilding or a crowd solver. Current graph/shape caches and camera-only updates must retain zero provider cost.

This is the sole tracker for runtime performance optimization. [Runtime performance design](../performance.md) owns the approach; [Architecture](../architecture.md#performance-critical-path) owns implementation facts and [Verification](../verification.md#performance-investigation) owns evidence. Checked items identify delivered implementation or explicitly named runtime observations. Unchecked acceptance and regression items remain open; implementation is not scale qualification.

## Delivery status

PF00/PF01/PF02/PF03/PF05/PF08/PF09 now include delivered work below. Remaining measurement, failure coverage and legacy compatibility work stay unchecked. PF04/PF06/PF07/PF10 remain conditional without evidence justifying their extra mechanisms. PF11 is explicitly deferred.

This pass stops before multiplayer admission, per-player replication, the unattended-world toggle and verification with 100 agents, 100 players and thousands of animals. The local host's gameplay epoch mechanism is independent of future multiplayer controller admission. Native animals retain full simulation fidelity; dormancy and analytic updates remain gated on semantic equivalence.

## Order and stop rule

Run PF00 as a short baseline pass, then take the highest measured cost per unit of implementation effort. The initial order below reflects the known query amplification and polling, not a measured ranking of live latency. After each task, repeat the same relevant workload, report before/after percentiles and costs, and rerank. Once the small-world budgets pass with headroom, stop adding mechanisms; retain later tasks as gated scale work.

PF00's short attribution milestone unblocks the immediate fixes. Its larger percentile/soak qualification can follow those fixes; do not build a general benchmarking platform before removing the observed query amplification.

Dependencies require the relevant interface or measurement, not final certification of an entire stage. If PF03 attributes remaining CPU cost to cold history, bring PF08 forward; do not require the CPU budget to pass before removing its measured cause.

PF05's immediate publication change comes before larger CPU/isolation work because the debounce adds avoidable latency even when the server is otherwise fast. Its movement-cadence experiment still depends on PF03. Stable task IDs identify scope; the Order column controls initial execution priority.

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

PF03 snapshot freezing and bounded catch-up are implemented; [recorded profiling](../verification.md#mature-world-tick-profiling) includes mature-save before/after runtime measurements. The next priority is extended qualification of these boundaries and PF08 retained-history growth. PF04/PF07/PF10 remain gated on residual measured cost.

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
- [ ] Capture an initial short trace with at least 30 successful native commands and representative timer work to select the first bottleneck. Before final acceptance, run at least 1,000 native intentions per latency case after warm-up, a 30-minute mixed-load soak, and sampled database delay at 0/25/100 ms per operation. Include simulated provider delay, narration due/idle, diagnostics open/closed and periodic checkpoints. Use disposable databases and no paid calls. Keep cold-start/recovery measurements separate.

Attribution exit: stage timings, query count and a short reproducible baseline identify the first intervention. Full exit: larger before/after samples and soak results are recorded in Verification. Fixture/native measurements do not establish live model latency. Broken legacy test assumptions are tracked in TODO; repair affected fixtures before using their assertions as evidence.

## PF01 — Compact atomic history and world writes

Dependencies: PF00. Primary files: `apps/server/src/history.ts`, `store.ts`, `postgres.ts`.

- [x] Add a validated append path that avoids existing-row reads and remove/revoke cascades for genuinely new event IDs. Preserve the existing edit/delete/forget path, duplicate/conflict checks and history backfill.
- [x] Prepare event encodings/perspectives once, bulk write bounded rows per table, and cache schema readiness only after commit. Keep CAS, command results, required history, revocation, accepted mind and job outcomes atomic.
- [ ] Compact remaining metadata/edit-path statements where measurements justify it.
- [ ] Verify 1/10/100-event batches and 1/10/100 audiences increase statements only at configured chunk boundaries. Compare complete persisted/recovered data, not just query counts.
- [ ] Exercise append versus edit/delete, failed transaction, ambiguous COMMIT with original-ID reconciliation, schema backfill, restore and permission revocation. Do not repeat paid calls on recovery.

Exit: ordinary walk meets the SQL budget; append cost depends on new rows; editing/forgetting still removes every dependent private record before success. Report local PostgreSQL latency before/after.

## PF02 — Commit-triggered Narrator and deadline scheduling

Proposed [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake) owns the remaining common stimulus-to-ActorWork intake; scheduling qualification remains here.

Dependencies: PF00; coordinate signal metadata with PF01. Primary files: `history.ts`, `narrator.ts`, `http.ts`, `ai-director.ts`, `cognition-maintenance.ts`.

- [x] Return queued-story/next-due information from successful commit/regeneration and wake the existing story-job runner. Use one earliest-deadline timer; preserve causal batching and finite concurrency.
- [x] Recover once at startup, wake on resume, and coalesce commits arriving during the existing runner. Preserve regeneration, cancellation, source revocation and uncertain-work recovery behavior.
- [ ] Qualify rollback, commit-before-notification crash, concurrent claim/provider completion/cleanup, pause, shutdown and uncertain paid completion; queued work survives and uncertain dispatched work never automatically retries.
- [x] Remove Narrator's per-tick empty claim. Rebuild due state from persisted jobs after restart; no extra queue table or broker.
- [x] Decouple cognition-maintenance scheduling from the awaited simulation timer. Use dirty actors, cached schedule values and due deadlines. Preserve significant events, recurring needs, sleep/day boundaries, explicit maintenance deadlines, pause/speed changes, cancellation and spending limits.

Exit: idle narrator has no claim traffic, eligible committed jobs execute once through the existing attempt policy, and slow maintenance/provider fixtures do not prevent native timer scheduling. Compare background query rates and command tails.

## PF03 — Native CPU and incremental admission

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.

Dependencies: PF00. Primary files: domain `draft.ts`, `events.ts`, `experience.ts`, `kernel.ts`; server `world-service.ts`.

- [x] Remove repeated startup/actor initialization scans and unchanged policy replacement from each commit. Startup, spawn and capability changes retain complete authoritative initialization; broader CPU profiling remains in PF00.
- [x] Make ordinary experience additions proportional to changed actor/source entries; reuse or incrementally maintain indexes instead of materializing all retained experience for each add. Preserve validation, duplicate prevention, forgotten-source and obligation protections.
- [x] Replace repeated commitment scans with source-identity/event/deadline indexes and navigation string-map allocation with cached walkability and numeric breadth-first queues in the original planar slice. Current 3D navigation uses the SW-owned layered A\* provider; this historical completion is not a claim of current planar BFS.
- [x] Attribute mature-world native cost with a CPU profile and compare the same snapshot with diagnostic input freezing; record runtime evidence without enabling the experiment in gameplay.
- [x] Freeze server-owned snapshots after startup migration, command/editor acceptance and each fixed native step so unchanged branches skip finalization. Keep domain construction mutable until handoff; retain append lineage and serialization.
- [x] Capture post-movement perception scalars once, spatially filter object candidates, use set membership against the prior immutable visibility snapshot, and retain unchanged visibility arrays. Preserve event/audience order and hysteresis; matched replay digests and population timing are in Verification.
- [x] Reuse sorted native participant IDs across the internal steps of one advance, refreshing after nested command transitions; avoid inert-entity work and skip an encounter phase with no eligible observer. The finite no-native-spawn/component-change assumption is explicit; SR12 retains its qualification.
- [x] Assemble permitted actor observations before one final deep copy instead of copying private state and copying the sanitized result again. Returned ownership and scope remain unchanged; SR05 retains its qualification.
- [x] Reduce intermediary entry/tuple arrays in independent domain JSON copying while preserving nested draft support, sparse arrays and safe own `__proto__` data. No new mutable evidence aliasing or admission-time freezing; automated coverage remains SR15.
- [ ] Complete legacy migration/shared-reference, append-proof and source-revocation qualification, with longer growing-history and all-speed workload coverage. Initial freeze cost and short mature-save runtime observations are recorded; they are not a soak/capacity claim.
- [x] Bound each native batch to approximately eight milliseconds, accept only its completed prefix and retain remaining debt. Detect suspension from callback gaps rather than batch duration; preserve one writer and fixed-step order. Speed changes preserve admitted debt. Remeasure sustained command latency under load before adding scheduling machinery.
- [x] Release mutation ownership between bounded batches without changing native transition boundaries, sequences or RNG draws. Commands can be admitted between batches instead of waiting for all accumulated catch-up.
- [ ] If needed, finalize several fixed steps together after proving equivalence for perception, commitments, conversations and timer-gap/absence semantics; do not substitute the existing multi-second call.
- [ ] Differentially replay movement, survival, changing visibility, death/revival and promises through baseline/candidate kernels at all speeds. Compare events and intermediate outcomes as well as final world/RNG.

Exit: native CPU and event-loop budgets pass with mature tiny-world history; recorded replay differences are zero or explicitly reviewed gameplay changes. Large cold-history separation belongs to PF08.

## PF04 — Optional database isolation

Dependencies: PF01/PF02 and measured remaining contention.

- [ ] Give diagnostics a separate database connection only if production measurements still show gameplay or inference persistence waiting on inspection reads after polling and query fixes.
- [ ] Generalize that one bounded auxiliary lane only to appropriate history reads, diagnostics and independent job bookkeeping. Keep one world-writer/advisory owner. No second `PostgresDatabase` instance that acquires the same ownership lock; define connection purpose explicitly.
- [ ] Bound query/transaction time and concurrency, preserve privacy/source revision validation across connections, and measure SQL lock contention. Authoritative world writes cannot enter the auxiliary path. Keep SQLite serialization explicit.
- [ ] Verify an optional-query timeout, diagnostics failure and slow history reader cannot delay or alter world/accounting outcomes beyond the contention budget; reject stale cross-connection results.

Exit: optional load stays within its latency budget, with ownership/revocation tests passing and no uncontrolled pool growth. If the gate is not met, leave this task open and skip it.

## PF05 — Public view and browser responsiveness

Dependencies: PF00; PF02 supplies scoped background notifications.

- [x] Publish explicit action/control outcomes and affected in-memory view fields promptly after commit, coalesced per event-loop turn. Keep routine publication independently scheduled and preserve SSE baseline/replay/privacy rules.
- [x] Compare 50 ms native/replication cadence with the 250 ms baseline on cloned small-world saves; adopt 50 ms for improved first-position delivery while preserving fixed-step/RNG order, pause/speed semantics, one-second saves and independent background scheduling.
- [ ] Qualify cadence under browser rendering, long runs and CPU/query budgets; short runtime samples do not establish tail-latency acceptance.
- [x] Remove narrator/history/usage reads from the position/action publication dependency chain. Cache optional sections with scoped revisions and publish their changes independently through compatible patches. Prevent stale asynchronous results from overwriting newer sections.
- [x] Replace visible-chat 1.5-second history polling with scoped change invalidation plus opening/reconnect loads. Preserve pagination watermarks, revocation, selected-person switching, message merging and scroll position. Keep presence liveness and the existing diagnostics cadence.
- [ ] Measure scene updates and React commits. Skip unchanged sections/entities; virtualize only lists with measured rendering cost. Extract pure action eligibility guards only if catalogue/AI preview cost is material, sharing admission logic rather than creating client authority.

Exit: publication/input budgets pass; no history reads for unrelated movement or hidden panels, no leaked scope, broken patch baseline or lost reliable outcome. Server confirmation must remain measurable separately from immediate marker feedback.

## PF06 — Optional diagnostics and bounded buffers

Dependencies: PF00; use PF04 only when its contention gate is met.

- [ ] Add bounded diagnostic-write backpressure or batching only if observed pending writes grow during sustained tracing or shutdown flushes become material. The current implementation relies on asynchronous ordered writes and the database lane rather than adding another batching system preemptively.
- [ ] Preserve enqueue-time sanitization/immutability, distinct trace identities, latest terminal snapshots and explicit capture gaps. Batch pending records by age/bytes/count, coalesce superseded versions of the same ID, and keep old versions from overwriting newer persisted values. Accounting receipts are never lossy diagnostics.
- [ ] Bound capture/serialization CPU as well as queue memory; stream large exports and keep checkpoint work outside long SQL transactions. Drain within a finite shutdown policy and report any optional capture loss honestly.

Exit: sustained fixture tracing cannot grow memory without bound or violate native latency budgets; failures affect diagnostics only. Existing redaction/FIFO/late-billing acceptance stays owned by the relevant TODO/CR checks.

## PF07 — Group queued commands

Dependencies: PF01, PF00 evidence that per-transaction cost still dominates bursts.

- [ ] Evaluate already-queued discrete commands in deterministic order in a bounded candidate batch; preserve per-command receipts and causal intermediate events. Keep immediate flush for a lone idle command and one durable commit in flight.
- [ ] Initially test upper bounds of 10 ms grouping delay, 64 commands and 256 KiB prepared changes, flushing at the first bound. Reject an oversized single command before admission rather than silently splitting its atomic effects; existing permitted larger editor operations need a separate explicit path. Tune only from recorded workloads.
- [ ] Test lost replies, duplicate/conflicting IDs, pickup→craft, repeated consumption, pause/stop barriers, queue saturation and final-item contention. Movement supersession applies only to an explicit unsent-steering contract.

Exit: better burst throughput within single-command latency budgets, finite pending bytes/age, fair admission and identical committed outcomes. No final success before durable commit. Skip if its added coordination buys no measured benefit.

## PF08 — Long-lived worlds, hot state and checkpoints

Dependencies: PF00/PF03 and applicable production-data D1/D2 recovery contracts; D59's accepted 24-hour command policy and its epoch boundary before any receipt expiry.

- [x] Separate unreferenced global events and new epoch-bound gameplay outcomes from per-step state. Retain active memory, obligation/knowledge sources and complete cold history; jobs remain in their existing durable tables.
- [ ] Migrate unbounded legacy gameplay receipts without losing old ID/body deduplication. Do not expire legacy, provider, invention, billing or admin identities through the new gameplay policy.
- [x] Add local server-issued command epochs and admission expiry, retain complete new gameplay outcomes for 24 hours, then return `expired` before domain evaluation. Persist the next generation/token before pruning. Restore fences fresh admission with a new token; other workflow identities retain their policies.
- [x] Migrate and restore source-preserving cold event snapshots/journals, check row coverage on load, and preserve cold references in owner edits. Prepare fixed-revision snapshot JSON before the transaction; prune only a committed covered journal prefix.
- [ ] Qualify corrupt/missing archive data, ambiguous commits and PostgreSQL migration/recovery. Move serialization off-thread only if measured CPU budgets still require it.
- [x] Keep paged history/editor reads and indexed individual cold-event retrieval; recall consolidation never silently deletes global history.
- [ ] Measure naturally mature history growth and rare full-dependency owner-save memory/latency before replacing that explicit slow path.
- [ ] Verify backlog backpressure stops simulation growth while allowing cleanup commits and further distinct cleanup batches within the same game hour. Failed unchanged batches must not retry automatically; a backlog consisting entirely of recent or protected evidence needs operator resolution. Profile fixed-step cloning with large retained histories before raising population or speed limits.

Exit: same active tiny world at increasing cold-history sizes meets per-step budgets; backup/recovery retains complete permitted history and forgetting/spending state. Command receipt expiry additionally requires the implemented and verified epoch watermark. Other historical deletion remains blocked until its own retention policy is accepted.

[AG07](agent-agency.md#ag07--meaningful-feedback-survival-and-bounded-reconsideration) and [AG12](agent-agency.md#ag12--behavioral-value-and-cost-separately-authorized) connect native continuation and fair cognition admission to measured behavior/cost. Qualify the existing global workflow before increasing concurrency; no population or price target is established by the agency design.

## PF09 — Population work follows relevance

Coordinate module dependencies and aggregate admission with [EWF08](extensible-world-foundation.md#ewf08--declared-dependencies-aggregate-budgets-and-containment); PF retains implementation and qualification.

Proposed [EPR02](events-perception-and-reactions.md#epr02--eliminate-redundant-full-world-sensory-scans) owns the specific object/audience scan integration; [EPR10](events-perception-and-reactions.md#epr10--conditional-incremental-spatialdeadline-infrastructure) owns its conditional incremental-index work. PF retains broader population qualification.

Dependencies: PF03/PF08 and PF00 population profile; reuse real-time interest and D6 boundaries.

- [x] Add spatial candidates, outstanding-commitment/deadline indexes, dirty-actor scheduling and cached static geometry where scans dominate. Rebuild indexes on load/restore and validate through the authoritative mutation path.
- [ ] Qualify the change-fed intake owned by [EPR05](events-perception-and-reactions.md#epr05--change-fed-actorwork-and-one-reaction-intake). Profile thought and maintenance refresh separately; preserve threshold crossings, source invalidation and interest expiry.
- [ ] Replace the world-global autonomous thought interval with fair per-actor eligibility and explicitly bounded provider/context capacity. Keep interactive priority, per-actor serialization, spending reservations, cancellation and result revalidation; one global workflow is bounded but does not establish multi-agent responsiveness.
- [ ] Bound dense first-encounter bursts while preserving actual witnesses and semantic evidence. Measure event count, audience rows and source-admission CPU independently; indexes alone cannot remove genuine witness fan-out. Do not silently suppress encounters or change narrative significance.
- [ ] Profile per-second animal countdown updates and repeated entity sorting before evaluating dormancy/analytic updates; preserve needs crossings, actual event-time witnesses, action ordering and RNG semantics. Include moving observers and dense crowds; indexes cannot discard real audience work.
- [x] Keep existing bounded AI/context execution and one coalesced opportunity per cognitive actor; preserve per-agent spending reservation and mandatory evidence policy.
- [ ] Batch eligible embedding inputs only with measured benefit, without merging private contexts across actors; qualify dense-crowd fairness/backpressure.

Exit: cost follows active changes and relevant neighbors in sparse worlds; dense cases have explicit limits and backpressure. Broader gameplay/AI-quality acceptance remains in ACT/CR/NC.

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

SW04/SW05/SW08/SW10 now own indexed static geometry, height-local graph construction, bounded immutable sight reuse and dirty renderer work. The remaining cold-navigation and dense-first-exposure measurements are tracked in [SW scaling next steps](spatial-world.md#scaling-next-steps), with EPR02/EPR10 retaining audience/intake changes. Keep those task bodies in SW/EPR; [SR01–SR12](TODO.md#spatial-review-regression-todos) records the automated coverage deferred by the owner. PF population qualification is not complete merely because the finite native provider is faster.

### A further 90% end-to-end reduction

Treat this as an attribution target, not a result of multiplying microbenchmark speedups. PF00 must separate queue/native/commit/projection/SSE/render spans on the same scenario. Reducing one fraction of latency by 90% cannot reduce the whole by 90% unless it dominates. Use lazy spatial work and participant reuse already delivered; next target the measured dominant remaining layer through PF01/PF05/PF08/PF09 and EPR02/EPR03 rather than adding another cache speculatively. Keep first acquisition, dense no-route search, mature history, ordinary movement and full-stack sustained load separate. Do not change visibility, auditory evidence, durability or simulation time to meet a number.

### Cognition review stress follow-up

- [ ] Under PF00/PF03, qualify cold geometry/encounter/finalization bursts in the existing gems and mixed scenarios: the [cognition review measurements](../verification.md#cognition-context-and-action-capacity) remain below requested 3× headroom. Compare equivalent sequential runs before choosing a targeted optimization; do not add a worker/queue based on these profiles alone.

- [ ] Qualify clustered sleeping-actor workloads under PF00/PF03: [sleep runtime evidence](../verification.md#declarative-actor-sleep) measured 100 sleepers below 3× capacity. Attribute native draft/update and observer costs before introducing sleeping-actor dormancy; energy, hunger, wake events and perception must retain their semantics.

- [ ] Follow up on [generic status-effect stress evidence](../verification.md#generic-status-effects): immutable rule traversal removed the measured status-runtime bottleneck, but dense native scenes remain below full cold 3× capacity. Attribute remaining costs before adding applicability indexes, queues or dormancy.

- [ ] Profile remaining full Intelligence history latency after the parent/time index and compact projection; current live reads still take about 870ms median under simulation. Follow-off root peeks are inexpensive. Measure remaining query/projection work before introducing caches or coordination; see [runtime evidence](../verification.md#intelligence-panel-readability-and-runtime-verification).

## Action capability review observations

- [x] Remove the action panel's independent two-second polling and reuse bounded player state patches. Grounding reuses its request observation, scopes explicit targets before truncation, and reuses identical within-response interpretations without duplicating native invocation identities.
- [ ] Qualify genuine dense acquisition and downstream storage before a population-scale claim. Accidental observer broadcast amplification is fixed; record matched baseline/current measurements separately from steady-state percentiles. Preserve EPR's audience/knowledge semantics and existing deterministic event/RNG invariants rather than dropping exposures or silently batching away elapsed work. See [action review evidence](../verification.md#action-capability-review).

## Perception/evidence and burst delivery

- [x] Remove private-acquisition audience amplification and batch through the existing experience owner; freeze owned record copies at insertion instead of materializing detached retained-history snapshots.
- [x] Read live perception scalars without whole-roster `current` copying; reuse living/object exposures independently and skip unchanged acquisition/episode reconstruction.
- [x] Preserve generic status-effect behavior while pruning inactive actor-only automatic conditions on non-actors; retain deterministic cooperative checkpoints through status phases.
- [x] Preserve main's current-evidence coalescing and diagnostic-independent ActorWork; do not restore fixed cognition cooldowns or a paid backlog-draining policy.
- [x] Record matched rebased-baseline/final native profiles plus real SQLite/HTTP/SSE workloads with a separate client and continuous presence. These are bounded observations, not population qualification; see [verification](../verification.md#rebased-action-and-perception-performance).
- [ ] Investigate the remaining dense first-commit cost through PF00/PF01: source/awareness construction, immutable state finalization, history encoding and SQLite transaction work must be attributed separately. Preserve individual evidence identity, privacy, revocation and atomicity. Do not yield a shared SQLite transaction to readers that could observe partial writes.
- [ ] Repeat full-server measurements with at least 1,000 successful commands, long mature history, 30-minute soaks, PostgreSQL, browser rendering and deterministic cognition/maintenance fixtures. Short 15-second phases have noisy tails and no live-model load.
- [ ] Address multi-second synchronous work interacting with the existing callback-gap suspension heuristic before claiming dense-world clock fidelity. Do not infer a new absence policy from CPU guesses or hide excluded time; remove blocking or qualify independent liveness evidence under PF10.
- [ ] Qualify the remaining per-mind/source signature walks and active-evidence array copy-on-write cost before introducing regional indexes or paged state. No witness dropping, changed perception rules, or guessed capacity promises.

### Residual capture and dense-scene gate

The earlier scalar-capture timeout investigation is superseded by the completed matched warm/cold capture measurements and preserved native digests. Source capture no longer calls `current` on the entire entity roster. The full-patch-elimination experiment was reverted: modest inconsistent benefit did not justify a retained-event prefix scan. Remaining dense-state/storage work stays open above; moving work to a worker alone does not reduce legitimate output volume.

## Dense persistence delivery

The execution contract remains [compact transactional persistence](../performance.md#compact-transactional-persistence). These items refine PF01/PF03/PF10; they do not complete population qualification.

- [x] DP01 — Replace per-witness awareness/forgetting searches with commit-local indexes; preserve append/edit/forget/revocation ownership. Separate history projection, prepared writes and SQLite transaction-boundary spans.
- [x] DP02 — Bound history row preparation and encoding buffers; shorten the open-transaction CPU path without publishing a partial world or bypassing edit/revocation handling.
- [x] DP03 — Remove redundant parsing of the native private acquisition template through the shared event owner. Retain independent transition-return copies; further allocation/state representation changes remain measured PF03/PF08 work.
- [ ] DP04 — Qualify residual blocking and introduce database/CPU isolation only at PF10's measured gate. Do not create a second writer or acknowledge uncommitted actions.
- [ ] DP05 — Correct measured overload being misclassified as suspension using explicit attribution, without permitting catch-up after real suspension.
- [ ] DP06 — Record matched native/history/full-server measurements and recovery exercises, including mature history and bounded high-command-count work. Long soaks, PostgreSQL, browser and live cognition remain separate qualification.

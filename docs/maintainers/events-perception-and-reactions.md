# Events, perception, and reactions — implementation tracker

## Spatial integration dependencies

Use [SW04/SW08/SW09](spatial-world.md) for geometry, height-aware senses and camera exposure. Retain EPR scope, hysteresis, observer detail, coalescing and privacy gates here. Current coarse intelligible-only sound is not the full auditory-contact contract; do not broaden its exact-word audience to simulate a muffled unidentified sound.

**Status:** a native implementation slice is delivered below; unchecked broader contracts and qualification remain open. Implementation is not population or live-model acceptance. [Design](../events-perception-and-reactions.md) owns the contract; [research](../../archive/02-research/engine-perception-and-event-architectures.md) owns external evidence and the pinned source audit.

This tracker owns the new stimulus/perception/reaction integration. PF retains general performance qualification, CR retains cognition/recall behavior, NC retains conversations/story, and SL retains save/load. Cross-reference their work; do not recreate completed actor, Narrator, history, or save systems.

[AG07](agent-agency.md#ag07--meaningful-feedback-survival-and-bounded-reconsideration) adds agency causes to EPR01/EPR05 intake. EPR owns common scope, episode identity, coalescing and cursor mechanics; AG owns operational goal/plan continuation and native-response adequacy. Basic AG01–AG04 state/admission work does not wait for all EPR performance gates.

Attribute concerns now have a native private event/awareness path, saved hysteresis and band-fed ActorWork invalidation. This is a first EPR01/EPR04/EPR05 integration, not complete scope/episode/reminder delivery; see [Architecture](../architecture.md#extensible-attribute-foundation).

## Read first and establish the baseline

Read `AGENTS.md`, `docs/architecture.md`, `docs/events-perception-and-reactions.md`, `docs/performance.md`, `docs/save-and-load.md`, `docs/memory-architecture.md`, and the existing PF, CR, NC, and SL trackers. Use `docs/maintainers/README.md` for current owners.

Inspect these current code areas before implementation:

| Area                               | Files / symbols                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Native needs, movement, encounters | `packages/domain/src/kernel.ts`: `nativeSurvival`, `advanceWorld`, `observeActor`                                |
| Sensing and spatial candidates     | `packages/domain/src/spatial.ts`: `spatialCandidates`, `nearbyEntities`; `perception.ts`                         |
| Event and experience authority     | `packages/domain/src/events.ts`: `emit`, `finish`; `experience.ts`: `mutateExperience`; `types.ts`               |
| Actor capabilities                 | `packages/domain/src/living.ts` and current body/actor mutations                                                 |
| Reaction scheduling                | `apps/server/src/actor-work.ts`; `ai-director.ts`: `considerThought`, interactive admission, urgent supersession |
| Interests and context              | `apps/server/src/interests.ts`, `decision-context.ts`, `response-context.ts`, `recall.ts`                        |
| Acceptance, persistence, restore   | `apps/server/src/world-service.ts`, `history.ts`, `store.ts`, `game-saves.ts`                                    |
| Existing consumers                 | `cognition-maintenance.ts`, `narrator.ts`, `view.ts`, `intelligence-log.ts`                                      |
| Test and profiling entrypoints     | Current `package.json`, existing domain/server tests, PF00 profiling tools                                       |

Do not rely on line numbers from an earlier audit. The research pins a reference commit; implementation must inspect the current branch and preserve unrelated changes.

## Scope and execution order

1. EPR00: short baseline and correctness inventory.
2. EPR01: typed scope and intake contracts.
3. EPR02: behavior-preserving spatial scan fixes.
4. EPR03 and EPR04: private perception acquisitions and internal thresholds.
5. EPR05: change-fed reaction intake and cursors.
6. EPR06 and EPR07: ongoing stimuli and existing consumer integration.
7. EPR08 and EPR09: complete restore, failure, and performance qualification.
8. EPR10: advanced indexing only if its measured gate is met.

Run relevant tests as each slice lands. EPR08 save semantics must be considered during EPR01, not designed after adding new state. EPR00 is not a requirement to finish a large benchmarking platform before fixing a confirmed scan.

**Non-goals:** a new engine/ECS, global broker, per-object queues, arbitrary executable subscriptions, automatic paid retries, legacy-save compatibility, all-world event sourcing, physics LOD, new population promises, or a broad rewrite of cognition.

## EPR00 — Baseline, invariants, and task ownership

**Dependencies:** none. Coordinate with PF00/PF09.

- [ ] Record the current commit and locate the actual implementations and completed work. Confirm the active no-legacy-support policy; use disposable current-format saves for experiments.
- [ ] Trace one directed speech request, one living-actor encounter, one ordinary-object acquisition, one need-protection episode, one reflection wakeup, and one story-selector decision. Separate physical occurrence, evidence, wakeup, model dispatch, and effect admission.
- [ ] Add bounded counters to existing profiling: full entity traversals, spatial builds, query candidates, exact sense tests, event-audience candidates, actor input scans, retained experiences inspected, accepted/deferred opportunities, and queue age. No per-counter SQL writes.
- [ ] Record current numerical thresholds and their distinct policy roles. Preserve existing survival, sleep, model gating, cooldown, and urgent-single-refresh behavior unless a later task explicitly changes the documented semantic boundary.
- [ ] Record the current save/restore invalidation hooks and authority-generation identity. Find existing startup/cursor recovery rather than inventing another durable queue.
- [ ] Resolve tracker overlap: PF09 links to EPR02/EPR05/EPR10 for this subsystem; PF02 links to EPR05 for remaining trigger intake. Do not duplicate detailed task bodies or alter existing completed states.

**Exit:** a short reproducible trace identifies actual scans, a current-policy inventory exists in the relevant owner, and every planned code change has an owner. No benchmark or full-suite success may be claimed without execution.

## EPR01 — Typed stimulus scope and actor intake

Coordinate EWF01 host metadata through [EWF](extensible-world-foundation.md); existing native adapters suffice without full EWF qualification.

**Dependencies:** EPR00. Design §§2–4, 9–11.

- [ ] Add the smallest typed extension to existing event/experience records for external sensory, owner-private internal, and system-only sources. Do not add a parallel world-event table. A small domain module such as `stimuli.ts` is appropriate only if it makes ownership clearer than extending existing modules.
- [ ] Define typed actor-intake metadata: actor, authority generation, source/episode, stable order, reason, applicable policy revision, simulation/wall deadline kind, and disposition. Reuse existing response/job identities where applicable.
- [ ] Require scope to be assigned by trusted native/server code. Reject arbitrary model/client changes to audience, internal owner, policy, or priority authority.
- [ ] Keep payload projection separate from record identity. Owner-private internal payloads cannot pass through the current generic spatial-audience branch.
- [ ] Classify new fields as saved authority, deterministic derived state, or process resources. Update the save manifest/current format only when needed; add no old-format reader or migration.
- [ ] Preserve native consequences in the existing ordered transition. Define which later consumers receive after-commit IDs rather than callbacks capable of mutating world state immediately.

**Tests:** scope cannot be forged; system-only signals never produce awareness; private records remain absent from another actor, ordinary client, and story-selector input; accepted IDs survive same-version save/load.

**Exit:** external and internal sources can express the same intake metadata without sharing an unsafe audience or retention policy.

## EPR02 — Eliminate redundant full-world sensory scans

**Dependencies:** EPR01 contract sufficient; does not require new private-event behavior. Coordinate with PF09, not a second spatial implementation.

- [ ] Qualify the implemented scalar spatial candidate pass, unchanged visibility-array identity and observer-private encounter publication within the fixed-position encounter phase. General external-event candidate reuse, event-time invalidation, broader acquisition deltas and differential acceptance remain open; do not repeat the old scan rewrite. New automated coverage belongs to SR10 in [maintainer TODO](TODO.md#spatial-review-regression-todos).
- [ ] Restrict external-event audience discovery to relevant listener candidates, then apply the exact existing hearing/sight, capability, life, and sleep rules. Preserve self handling deliberately.
- [ ] Do not repeatedly call `nearbyEntities` on a mutable draft: its current implementation rebuilds. Introduce explicit phase-valid query context or equivalent reuse, with a safe rebuild/fallback when validity cannot be proved.
- [ ] Invalidate candidate geometry after every relevant movement, teleport, spawn, removal, or sense-range change. An event's audience must use positions at that event's occurrence, not the end of a multi-step batch.
- [ ] Preserve deterministic candidate/recipient ordering, existing sense formulas, domain transition boundaries, and RNG use. Do not replace `advanceWorld(1)` with a multi-second call as part of this optimization.
- [ ] Record rebuild and candidate counts. Retain current grid structure initially; do not add a BVH, worker, or persistent reverse graph in this task.

**Tests:** current-schema naive-query oracle versus optimized queries for random seeded positions, boundaries, obstacles where applicable, movement during a step, source removal after emission, sleepers, and ordinary/native animals. Compare audiences and event order, not only final position. Add a deliberately invalid index case that fails safely or rebuilds.

**Exit:** the common object pass no longer performs one full-world scan per observer, and stable-geometry event bursts reuse candidate work without altering sensory results. Record any event-time boundary that still requires a rebuild.

## EPR03 — Actor-private perception acquisition and exposure deltas

**Dependencies:** EPR01–EPR02. This task includes intentional semantics, so distinguish it from the behavior-preserving optimization above.

- [x] Separate encounter acquisition from outwardly observable actions: living-actor and object encounters use the existing private event/experience mutation entrypoint, retaining observed modality without broadcasting around the observer.
- [ ] Use current versus prior exposure to produce entry/exit/meaningful-feature deltas. Retain living-actor encounter opportunities, current ordinary-object baseline behavior, and supported recognition uncertainty.
- [ ] Keep live exposure, last-seen evidence, and encounter-episode hysteresis distinct. Linger must not provide current hidden updates or extend action reach.
- [ ] Add invalidation for stationary observers seeing moved sources, movement within a cell, source feature changes, sense/capability changes, and removal. Do not depend only on observer movement.
- [ ] Reappraise currently exposed candidates when relevant actor goals, needs, knowledge, or accepted mind change. Do not require an exit/re-entry to discover new relevance.
- [ ] Establish new-world initialization separately from same-version restore rebaselining. Restore must not synthesize fresh encounters for already-active relationships.

**Tests:** A already sees the sword while B arrives; A does not receive a duplicate entry. C sees A but cannot see the sword; C must not acquire the sword through A's private acquisition. Source becomes bright without movement; old observers can get updated evidence. Actor becomes interested in an already-visible tree. Boundary jitter does not repeatedly dispatch. Losing sight retains historical facts but not live updates.

**Exit:** acquisition and outward action have distinct evidence semantics, and changes other than entry are handled without scanning or rethinking everything.

## EPR04 — Private internal threshold events and native protection

Coordinate EWF02 typed state through [EWF](extensible-world-foundation.md); existing native adapters suffice without full EWF qualification.

**Dependencies:** EPR01. Can proceed alongside EPR03.

- [ ] Centralize named threshold policies and their owning state updates; retain separate roles for eating, food seeking, rest, action interruption, and semantic protection. Do not replace them all with the user's illustrative health-20 threshold.
- [ ] Emit owner-private crossing/escalation/recovery records from authoritative needs/body updates. Use sparse per-policy episode/latch state; no event per tiny numeric decrement.
- [ ] Provide a recovery margin/hysteresis contract. Preserve production defaults where already defined; leave unselected reminder/margin policies configurable and use explicit test fixtures to exercise them.
- [ ] Keep native protection at its current deterministic boundary and prevent duplicate responses. Do not route critical survival through Jev, optional queues, credentials, or paid budget.
- [ ] Cover all meaningful native writers, including eating/healing, damage, god-stat overrides, and body-effect changes—not only hunger decay in `advanceWorld`.
- [ ] Respect sleep and cognitive capability: an internal physical change can require native handling without manufacturing a conscious memory for a sleeping or non-memory actor. Use current waking rules; do not add automatic wake behavior silently.
- [ ] Persist or reproduce the state that prevents duplicate crossings and preserves due reminders through same-version save/load.

**Tests:** each band entry fires once, recovery/re-entry behaves deterministically, cross-and-recover within a batch retains required events, no credentials still permits protection, observer B cannot read actor A's internal event, outward symptoms require a separate actual effect/event, and god overrides use the same detector without bypassing reconciliation.

**Exit:** internal changes use the common stimulus contract while native survival remains at least as responsive and no more expensive in paid calls.

## EPR05 — Change-fed ActorWork and one reaction intake

Coordinate EWF05 sense evidence through [EWF](extensible-world-foundation.md); existing native adapters suffice without full EWF qualification.

**Dependencies:** EPR03–EPR04; coordinate PF02/PF09 and CR10.

- [ ] Extend the existing `ActorWork`, not a second scheduler. Feed precise accepted changes into actor-specific dirty reasons and due state.
- [x] Remove general `telemetryRevision` from cognitive invalidation after replacing any genuinely required dependencies. Opening diagnostics, changing unrelated UI state, or finishing unrelated logging must not rescan everyone's perception.
- [x] Avoid recomputing every actor's nearby visibility before checking per-actor eligibility. Cheap dirty/deadline state selects candidates; only sensory changes cause sensory recomputation.
- [x] Replace full retained-experience reconstruction for trigger selection with bounded new-awareness/typed-reason consumption. Use existing durable order/cursors; full recall remains available for actual context assembly.
- [ ] Adapt direct speech, autonomous evidence, private thresholds, exposure changes, and reminders into one intake. Preserve interactive priority and ensure one directed turn does not also create duplicate autonomous admission for the same response.
- [ ] Preserve fairness, current global concurrency, cancellation, and the explicitly bounded urgent context-refresh policy. Do not introduce automatic provider-failure retries or unlimited supersession loops.
- [ ] Keep attempted-opportunity and consumed-evidence state distinct. A coalesced or deferred item is not completed evidence.
- [x] Make dirty-state acknowledgement generation-aware: a wakeup arriving while processing must remain pending after that run finishes. A stale run cannot clear newer dirty reasons.
- [ ] Hold paid wakeups until their required input evidence is durably available. Reuse after-commit signaling and startup reconciliation; do not add a new broker.

**Tests:** idle steady world produces no repeated visibility/history scans beyond explicitly due work; unrelated actor changes stay scoped; new autonomous evidence is eligible without an actor cooldown; new wake during completion is not lost; commit-before-notification crash recovers; uncommitted rollback schedules no paid work; explicit speech has one admitted response; no model credentials never block native work.

**Exit:** expensive trigger discovery follows meaningful changes and deadlines rather than UI telemetry, all actors, and retained experience collections on every poll.

## EPR06 — Persistent stimuli and bounded actor-local relevance

**Dependencies:** EPR03–EPR05; use CR attention rather than a new LLM pipeline.

- [ ] Cache only safe shared descriptor work, keyed by relevant source/definition/detail versions. Keep recognition and private appraisal actor-specific.
- [ ] Separate physical salience, contextual relevance, novelty, urgency, and story significance in typed policy use. Do not reuse a story-editor field as generic cognition admission.
- [ ] Represent ongoing exposure as active stimulus state. Feed a bounded permitted current description into later contexts while applicable, without recording it as a new experience each tick.
- [ ] Support onset, meaningful escalation, recovery, and configurable due-review policies. Preserve existing production thresholds/cadence until changed explicitly; no automatic mandatory paid hourly thought.
- [ ] Reuse bounded native candidate construction and existing Jev attention. A failed optional helper cannot expose hidden data or disable mandatory native protection.
- [ ] Define deterministic grouping/overflow behavior for many persistent cues under existing context and work budgets. Do not allocate a queue on every world object.

**Tests:** bright source remains represented in later context without per-tick model calls; source stopping or becoming hidden removes live context; goals/recognition changes reappraise already-visible objects; hidden legendary metadata gives no knowledge; many cues stay bounded; reminder pause/speed/restore uses the correct clock.

**Exit:** actors can remain aware of compelling ongoing conditions without repeated novelty, unlimited context, or repeated paid decisions.

## EPR07 — Named consumer integration without a universal engine bus

**Dependencies:** EPR05–EPR06.

- [ ] Use a small typed dispatch mapping for reaction intake and existing optional consumers. Connections are world-scoped and explicitly released/rebuilt on shutdown/restore.
- [ ] Keep awareness, native social consequences, commitments, and required invalidation in the authoritative transaction. Do not convert them into best-effort post-commit callbacks.
- [ ] Forward only appropriate committed IDs to reflection scheduling and the existing story selector. Preserve its own eligibility rules, private source policy, and durable job queue.
- [ ] Keep cognition importance independent from story eligibility. Ordinary encounters or internal thresholds do not become Narrator jobs merely by entering this framework.
- [ ] Keep UI/SSE and diagnostics on existing projection paths. A diagnostic update must not recursively become a cognitive stimulus.
- [ ] Route any later action requested by a consumer through normal admission. Bound causal chains; no handler can recursively mutate the world or grant new mechanics.

**Tests:** no reentrant event storm; no duplicate Narrator job for one cause; no story from a forbidden internal event; no extra trigger caused by viewing diagnostics; failed optional consumer does not roll back a committed action or corrupt accounting.

**Exit:** multiple systems reuse the notification boundary while retaining their existing authority, privacy, and durability contracts.

## EPR08 — Save/load, generation fencing, and overload

**Dependencies:** begin design with EPR01; complete after EPR05–EPR07. Coordinate SL and PF, retaining their ownership.

- [ ] Register semantic episode/latch/deadline state in current-format save capture where it affects continuation. Rebuild only truly derived spatial/ready indexes.
- [ ] Fence old callbacks and pending work by current restore authority generation even when world ID and entity IDs recur. Do not use a rotating command-retry token as an unexplained substitute.
- [ ] Restore paused, rebuild a correct baseline without new paid calls or fake entries, and preserve current forgetting/access/accounting authority.
- [ ] Bound pending metadata by count/bytes and processing by the existing performance budgets. Coalesce repeated wakeups while retaining distinct authoritative evidence in existing durable records.
- [ ] On overflow, retain unconsumed cursors/backlog and expose actual coverage/deferred counts; never advance past lost evidence or block native emergency behavior behind optional work.
- [ ] Define shutdown treatment of optional notifications separately from authoritative commits and paid attempts. Do not add legacy readers or migration fixtures under the active development policy.

**Tests:** same-version save/restore mid-exposure, mid-threshold episode, and with pending due work; old result after restore; queue saturation; slow store; failure during commit; privacy deletion followed by load; zero replayed paid work; no new-world initialization hooks called during rebaseline.

**Exit:** the framework survives ordinary failure and same-version restore without changing native continuation, revealing an abandoned timeline, or inventing completion.

## EPR09 — Differential and performance acceptance

**Dependencies:** each prior slice's focused tests; final pass after EPR08.

- [ ] Run current-schema differential tests for behavior-preserving optimizations using naive test-only sensing oracles. Compare audience, ordering, native effects, time, and RNG, not just final visible output.
- [ ] For intentional private-acquisition/internal-event semantics, assert explicit expected behavior rather than demanding equivalence to the old unsafe scope. Identify those intentional differences clearly.
- [ ] Run the baseline matrix below with providers disabled and record counters plus timing distributions. Use existing PF00 profiler, native/command budgets, and environment reporting.
- [ ] Repair affected stale tests without removing their meaningful privacy, cancellation, ordering, or accounting assertions. Report unrelated existing failures separately.
- [ ] Run applicable static/full checks and relevant browser smoke tests. Do not claim live reasoning quality from native or synthetic execution.
- [ ] Update actual Architecture/Implementation status only for delivered behavior; put measured evidence in Verification. Keep pending workload qualification and deferred tasks open.

### Baseline matrix

Begin with two observers and hundreds of objects so the user's scenario has a concrete test. Larger cases are proposed qualification workloads, not population claims or mandatory production load tests.

| Case                                   | Variable isolated                       | Expected result                                                          |
| -------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------ |
| Static tree + sword, two actors        | First entry versus steady exposure      | One logical acquisition per actor/episode; no recurring paid thought     |
| B approaches while A stays             | Observer-specific novelty               | Only B receives the new entry                                            |
| Moving source, stationary observers    | Source-side invalidation                | New/changed exposure is detected                                         |
| Movement within a grid cell            | Exact geometry despite same bin         | Range crossings are detected                                             |
| Many distant objects, fixed nearby set | World footprint versus local candidates | No per-observer full-world scan; report any remaining index rebuild cost |
| Many colocated observers/sources       | True dense fan-out                      | Bounded optional reasoning; honest pair/candidate cost                   |
| Only needs change                      | Spatial versus internal dependency      | Private threshold work without unnecessary spatial rebuilding            |
| Only goals/recognition change          | Relevance without movement              | Relevant current objects reconsidered, no global scan                    |
| Long retained history, one new event   | Trigger cursor efficiency               | No full retained-experience reconstruction just to select the trigger    |
| Many sounds in one stable phase        | Event-time listener reuse               | Shared candidate work with exact per-event audiences                     |
| Hidden object, visible observer        | Private acquisition versus broadcast    | No third-party knowledge leak                                            |
| Diagnostics open/closed                | Non-semantic telemetry                  | No extra perception or paid admission from inspection                    |
| Pause/speed/restore                    | Clock and generation                    | No fabricated elapsed simulation or encounters                           |

Record: seed, commit, runtime/build, hardware, database topology, actor/object counts, distribution, movement rate, emitted/acquired events, candidate and index counts, heap/allocations, native CPU, achieved simulation speed/debt, queue age, and command latency. Use the existing PF target budgets rather than inventing a competing target table.

Initial attribution can be short. Larger tail-percentile or soak claims require the sample sizes and conditions already defined under PF00. No pass can rely on dropping accepted events, ignoring unseen native simulation, or silently reducing simulation speed/fidelity.

**Exit:** results demonstrate the removed scaling multipliers, correct privacy and continuation, and remaining bottlenecks. If the small-world budget passes, stop before EPR10.

## EPR10 — Conditional incremental spatial/deadline infrastructure

**Dependencies:** EPR09 identifies index rebuilds or ticket scanning as a material remaining cost. PF09/PF11 retain population qualification.

- [ ] Record the specific trigger and expected metric before implementation. Leave this task open and skip it when the gate is absent.
- [ ] Maintain spatial membership by spawn/remove/move and sense-relevant revisions, separate from general immutable entity-container changes. Update old and new neighborhoods, including within-cell exact-query dirtiness.
- [ ] Add reverse observer relationships only if routing source-feature changes is otherwise costly; cap/rebuild them by current generation and source lifetime.
- [ ] Add a deadline heap only when due-ticket scans dominate; retain a distinct clock domain and deterministic same-time tie-breaking.
- [ ] Re-run the same correctness and workload matrix, including cache invalidation failure, restore, crowded hotspots, and total index memory.

**Exit:** measured benefit exceeds maintenance/complexity cost, with unchanged native semantics and explicit retained limits. Workers, GPU sensing, distributed brokers, dormant regions, and analytic simulation remain outside this tracker unless separately approved through existing owners.

## Completion report

Report the actual commit, completed EPR IDs, touched canonical docs, native/fixture checks, unrun live checks, measured before/after counters and timings, unresolved product policies, and deferred gates. Do not label a proposed system implemented because the documents were added.

The coarse-contact slice adds saved private onset/detail/end episodes, receiver-aware default vision/hearing adapters and `felt`/`internal` awareness modalities through the existing intake path. This is partial EPR01/EPR04 integration, not the generalized episode, reaction-disposition, timer or change-fed scheduling service. [Current scope](../architecture.md#registered-senses-and-coarse-contact) and [native evidence](../verification.md#extensible-attribute-runtime) retain those distinctions; the existing task exit criteria remain open.

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

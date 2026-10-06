# Encounter, awareness and authoring workload scaling

**Status: accepted investigation and optimization design.** PF09 owns performance delivery, EPR owns exposure semantics/intake, and SW owns spatial queries. This document defines remaining workload and semantic qualification, not a second implementation of the indexes already recorded in [Architecture](architecture.md) and [PF03](maintainers/performance.md#pf03--native-cpu-and-incremental-admission). [The earlier spatial review](verification/spatial-scaling-followup.md#spatial-scaling-review-third-pass) retains its historical native evidence; [perception/intake verification](verification/perception-reaction-intake.md) records subsequent EPR, PW08 and NP02 delivery at their stated revisions and workloads. The focused [EPR tracker](maintainers/events-perception-and-reactions.md) owns remaining intake qualification; [maintainer TODO](maintainers/TODO.md) retains cross-cutting deferred automated coverage.

## Product-scalability boundary — future semantics versus current optimization

The [product-scalability suite](product-scalability/README.md) adds a distinct design track: which interactions and perceptual detail the world promises at large population. [Attention and scenes](product-scalability/attention-and-scenes.md) and [capacity and economics](product-scalability/capacity-and-economics.md) own those product scenarios; [PS04/PS06](maintainers/product-scalability.md) and [the policy inventory](limits/product-scalability.md) track their future integration. They do not replace the current witness-preserving optimization requirements below.

A future authored sensory policy can make competing voices an indistinct aggregate while retaining a focused speaker, or a distant crowd a perceived group with a few distinguished individuals. That changes what is acquired under an explicit world rule. It is not permission to collapse already-understood speech, remove actual damage, infer hidden group membership, or delete required current evidence because a server is busy. Reduce unnecessary source preparation before paid per-object attention; preserve physical existence and effects independently of cognitive focus.

Qualification must distinguish behavior-preserving optimization from deliberately changed coarse/attention semantics. The first retains equivalent supported outcomes; the second needs source/permission integrity, coherent transitions, player-understandable differences, and exploit/distribution tests. A generic summary that hides lost evidence is not acceptable evidence of improved scaling.

Local capacity follows actual coupling and permitted activity, not merely a count inside a cell. Concerts, markets, and unrestricted combat need separate measured envelopes. Converging crowds and effects crossing cell boundaries remain coupled even when execution is partitioned. Admit new players, summons, machinery, and broad effects only within supported aggregate work; do not accept their consequences and later skip them. Visible queues or open-field congestion boundaries are preferable to an inconsistent simulation, with safe arrival and party/resident/reconnect fairness specified before release.

## 1. Evidence versus hypotheses

The mixed native stress scenario historically created many events and awareness rows during its cold opening. The earlier [invention review](verification/invention-foundation.md#invention-extensibility-review) used an older spatial/domain baseline and failed its requested 3x throughput. Later native optimizations and their separate workloads are recorded under the spatial reviews. Do not present the older multi-second stalls as a measurement of the current tree, compare different workloads as a speedup, or infer full-stack crowd capacity from isolated improvements.

The native implementation already reuses compatible source audiences within a phase, maintains mutation-owner experience ID membership, reuses participant IDs where membership cannot change, and sanitizes observations before one isolated copy. NP02 also updates sensory source indexes from complete warm phase changes, selects observers near old/new positions, and retains conservative cold, unknown-write, overflow and policy rebuilds. Affected observers still rescan relevant visible membership; this is not constant work for every world. Preserve those delivered paths and their invalidation/ownership limits. Remaining investigation concerns legitimate audience delivery, history/retention, cold geometry/search, admitted elapsed-time and publication boundaries, and persisted projection under load. An older hotspot is not evidence that repaired code needs replacing again.

The existing [EPR contract](events-perception-and-reactions.md#perception-acquisition-is-normally-private) already distinguishes private acquisition from public occurrences. An actor noticing a static object should not automatically become a public event about noticing, fanned out to every bystander. The initial native private-record correction is delivered under EPR03; broader episode and initialization/restore qualification remains open. It does not permit erasing genuine witnesses from actual speech/actions.

## 2. Measure the whole cold transition

Add bounded aggregate counters/timers for candidate construction, exact sense/geometry checks, private acquisitions, actual external occurrences, audience selection, perspective construction, experience lookup/append, draft finalization and history projection. Do not log private payloads or introduce one SQL span per witness.

Run cold and warmed versions of existing gems/mixed scenarios with saved seed, population, layouts, simulation speed, step count, host/runtime and configuration. Retain CPU profile, largest indivisible step, accepted simulated time, event/audience counts, allocations/heap and final semantic digest. Report initial setup/index creation separately, but never hide the opening stall by excluding it from the cold result.

## 3. Qualify and correct semantic over-fan-out

The native encounter recorder already writes private evidence to its awake observer rather than broadcasting that noticing to bystanders. Living memory-bearing people produce supported arrival, departure and outward-detail records; ordinary animals/objects retain their separately configured membership/onset behavior. The shared reaction intake also has typed exposure, condition, evidence, state, speech and reminder causes. Qualify the remaining EPR03 episode/restore cases and EPR05 durable-input hold instead of rebuilding this initial boundary or adding a second scheduler. Action/invention-result integration retains its AG07 owner. Keep source identity, modality, permitted detail and time intact. An actual visible reaction, utterance or interaction remains a distinct external occurrence with its own event-time audience; computing another actor's perception never grants bystander awareness.

The delivered private-record change intentionally differs from the old broadcast baseline. Any further accepted semantic change must be qualified against EPR's intended scope, not against an obsolete digest. Preserve actual external events, physical outcomes, knowledge boundaries and saved-RNG order. Retained historical records are not retroactively rewritten. Any incompatible development-format interpretation follows the existing no-legacy policy.

## 4. Then make necessary work approximately linear

Retain the existing phase-local source-audience reuse for compatible encounter events. Extend reuse to other external-event workloads only after identifying redundant work, followed by exact event-time checks. Key reuse by relevant observer, geometry, sense and source revisions. Do not reuse a visibility cache through movement, occlusion or disclosure changes that invalidate it. Private events bypass spatial audience discovery.

Reuse the existing mutation-owner membership index for awareness additions. Do not rebuild it in a scheduler or create a parallel append implementation. A wider bounded batch path is conditional on new measurements identifying remaining repeated work; preserve encounter/source order and validate every addition. Existing receipts, forgetting/revocation and actor identity rules remain in the single semantic mutation owner. Do not add an uncoordinated fast writer in the scheduler.

An actually observed event and its permitted audience are irreducible data. Share immutable source information and retain only necessary per-observer projection, but do not collapse distinct observations into generic summaries to save CPU. Target work proportional to candidates plus actual delivered observations, rather than source events multiplied by a fresh whole-population scan and retained-history search each time.

## 5. Atomicity before cooperative scheduling

First remove redundant work; only then consider cooperative batching. Required awareness, commitments, state changes and invalidations stay atomic with the owning transition. Yielding within a partially mutated world must not expose mixed state or let a command observe half an encounter step.

If an indivisible step remains too expensive, prepare bounded read-only chunks against a stable revision and commit only a complete valid transition, or move that pure preparation to a worker after measurement. Revalidate before commit. Neither a worker nor extra threads removes true fan-out or permits time/RNG reordering. An explicit capacity/debt policy is preferable to silently dropping simulation time.

Optional cognition/narration requests may coalesce through existing per-actor intake and deadlines. That is different from discarding mandatory evidence. Prioritize player interaction while preserving fairness and known native emergency behavior; do not let authoring or art jobs monopolize the world writer.

## 6. Agent and graph workload isolation

Graph indexing follows source-definition changes, not native ticks. Large impact/scenario jobs run outside the mutation lane with bounded CPU/memory/concurrency and durable progress. They do not copy a complete world for each tool call. Exact current dependency and authority checks remain short at publication.

For broader asynchronous graph/scenario analysis, the initial isolation target is one expensive worker/job per local world unless measurement justifies more. This is not a claim that a universal analysis-worker service is delivered: the finite current analysis and larger remaining budgets stay with [INV-13](maintainers/inventions-and-world-evolution.md#inv-13--episode-budgets-and-installed-cost-enforcement) and [invention budgets](invention-budgets.md). Read tools should page records and avoid whole-registry reserialization on every model turn. A larger agent allowance does not authorize unlimited native work. Preserve responsiveness beside an admitted authoring session within its installed spending limit.

## 7. Qualification and stop rule

Prove receiver-local privacy and actual witness preservation, stable native outcomes for optimization-only changes, controlled differences for the EPR semantic correction, save/restart, and no hidden paid work. Capture both cold stall and warmed throughput. Expand populations and history gradually, stopping at the measured bottleneck.

Do not add distributed event brokers, analytic animal simulation, a replacement ECS, or GPU perception merely because a small profile is slow. Escalate only after phase-level evidence identifies the remaining cost. Exact supported population/density/speed release targets remain open. Re-run the same cold and warmed application workloads on the current tree before deciding whether a remaining native bottleneck requires more engineering. Select further work from concrete remaining EPR episode, durability and full-stack workload gaps, not the superseded claim that private noticing and change-fed intake are wholly unimplemented. Product priority still follows the playable-game-first owner; a valid optimization target is not automatically the next feature.

## Maintained records

- Implementation: [Existing subsystem work](maintainers/performance.md); future product integration in [PS01–PS08](maintainers/product-scalability.md).
- Limits and constraints: [Native-work inventory](limits/native-work.md); proposed product choices in [PS-L01–PS-L18](limits/product-scalability.md).
- Related design: [Product-scalability suite](product-scalability/README.md) retains strategic scope without replacing current execution.

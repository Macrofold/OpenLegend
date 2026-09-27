# Encounter, awareness and authoring workload scaling

**Status: accepted investigation and optimization design.** PF09 owns performance delivery, EPR owns exposure semantics/intake, and SW owns spatial queries. This document defines remaining workload and semantic qualification, not a second implementation of the indexes already recorded in [Architecture](architecture.md) and [PF03](maintainers/performance.md#pf03--native-cpu-and-incremental-admission). [Verification](verification.md#spatial-scaling-review-third-pass) retains the latest upstream native evidence; [maintainer TODO](maintainers/TODO.md) owns deferred automated coverage.

## 1. Evidence versus hypotheses

The mixed native stress scenario historically created many events and awareness rows during its cold opening. The earlier [invention review](verification.md#invention-extensibility-review) used an older spatial/domain baseline and failed its requested 3x throughput. Later native optimizations and their separate workloads are recorded under the spatial reviews. Do not present the older multi-second stalls as a measurement of the current tree, compare different workloads as a speedup, or infer full-stack crowd capacity from isolated improvements.

The current native implementation already reuses encounter audiences per source within a fixed phase, maintains mutation-owner experience ID membership for additions, reuses native participant IDs where their membership cannot change, and sanitizes observations before one isolated copy. Preserve these paths and their explicit invalidation/ownership limits. Remaining investigation concerns the actual cost of legitimate audience delivery, ongoing history/retention work, cold geometry/search, application-level fixed-step boundaries and persisted projection under load. A descriptive hotspot from an older profile is not evidence that its fixed code still needs replacement.

The existing [EPR contract](events-perception-and-reactions.md#perception-acquisition-is-normally-private) already distinguishes private acquisition from public occurrences. An actor noticing a static object should not automatically become a public event about noticing, fanned out to every bystander. This semantic correction is part of EPR delivery, not permission to erase genuine witnesses from actual speech/actions.

## 2. Measure the whole cold transition

Add bounded aggregate counters/timers for candidate construction, exact sense/geometry checks, private acquisitions, actual external occurrences, audience selection, perspective construction, experience lookup/append, draft finalization and history projection. Do not log private payloads or introduce one SQL span per witness.

Run cold and warmed versions of existing gems/mixed scenarios with saved seed, population, layouts, simulation speed, step count, host/runtime and configuration. Retain CPU profile, largest indivisible step, accepted simulated time, event/audience counts, allocations/heap and final semantic digest. Report initial setup/index creation separately, but never hide the opening stall by excluding it from the cold result.

## 3. Qualify and correct semantic over-fan-out

Implement the accepted EPR private acquisition boundary for receiver-local entry/detail/recognition changes; its general intake is still pending. Do not infer that an end-to-end acquisition interface is already delivered merely because individual private feedback events exist. Retain its source identity, modality, permitted detail and time. An actual visible reaction, utterance or interaction remains a distinct external occurrence with its own event-time audience. Do not synthesize bystander awareness merely because the server computed somebody else's perception.

This can change the event model intentionally; qualify it against EPR's accepted scope rather than insist on preserving an incorrect baseline digest. Preserve actual external events, physical outcomes, knowledge boundaries and saved-RNG order. Retained historical records are not retroactively rewritten. Any incompatible development-format interpretation follows the existing no-legacy policy.

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

Initially allow one expensive native analysis worker/job per local world unless measurement justifies more. Read tools page records and avoid whole-registry reserialization on every model turn. A larger agent allowance does not authorize unlimited native work. Preserve responsiveness while a $5 session runs beside ordinary gameplay.

## 7. Qualification and stop rule

Prove receiver-local privacy and actual witness preservation, stable native outcomes for optimization-only changes, controlled differences for the EPR semantic correction, save/restart, and no hidden paid work. Capture both cold stall and warmed throughput. Expand populations and history gradually, stopping at the measured bottleneck.

Do not add distributed event brokers, analytic animal simulation, a replacement ECS, or GPU perception merely because a small profile is slow. Escalate only after phase-level evidence identifies the remaining cost. Exact supported population/density/speed release targets remain open. Re-run the same cold and warmed application workloads on the current tree before deciding whether a remaining native bottleneck requires more engineering. The still-open private-acquisition semantic requirement and unqualified full-stack workloads justify the next focused slice independently of obsolete timings.

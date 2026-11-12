# Native runtime foundations: useful work without repeated preparation

| Status | Current progress | Last updated |
| --- | --- | --- |
| Not started | Implementation recipes include dispatch safety and cognition-preserving comparisons; isolated experiments and adoption remain unperformed. | 2026-11-12 |

[Technical design](native-runtime-foundations-tech-design.md) · [Source and repertoire reconciliation](native-runtime-foundations-evidence-and-repertoire.md)

## 1. Purpose and scope

Make the current small game responsive while preserving an affordable route to a much larger persistent world. The desired return is useful invention, independent people, readable danger, cooperation and consequences worth returning to—not a count of idle entities. The [first-playable priorities](../repertoires/gameplay-priorities.md) remain the product scope.

This design refines the existing resident Rust architecture. It does not replace it, reopen its completed stages, implement another authoritative world in TypeScript or make distributed infrastructure a prerequisite. It specifies four finite implementation experiments and the boundaries that current and future consumers must preserve. It deliberately does not commission every possible optimization identified by the research.

The source baseline is `Macrofold/OpenLegend`, `codex/native-simulation-proof`, `d9544ae5d017e697bfcfe2a38c71bb8569ad14f6`. That commit integrates the research; its runtime is the preceding `d1211430d65390957baf5b0094d2cf2057950f8f` runtime. The active implementation can advance independently. The [evidence record](native-runtime-foundations-evidence-and-repertoire.md) separates inspected code, the implementation owner's additional report, hypotheses and remaining measurements.

## 2. What is already being delivered

[NSC](../maintainers/native-simulation-core.md) remains the sole owner of the current proof, reconnect/busy repairs, its prepared cost-attribution workload and the recurring transient-capacity failures. NSC01 is complete on this baseline; NSC02/NSC03 are not successfully complete. A research checklist cannot reset their status.

Retain outgoing-payload-only encoding, one definition preparation per attempt, narrow movement reads, moved attention before-images, scoped read cuts, deterministic continuation and actual allocation custody. Their respective component passes do not establish full operating qualification. In particular, the reported 19.9% improvement belongs to completed conditional Native pairs, not the complete failed campaign or a proven Rust-versus-TypeScript advantage.

History rebuilding, attention candidate rebuilding, unnecessary preparation, shared-value export, accounting/encoding passes, wrapper churn, SQL and duplicate tabs are already in the owner's profiling scope. Do not create duplicate tasks, run another diagnostic programme or invent the ranking. The current 128 MiB profile is an experimental host allowance, not a population limit or a universal engine constant.

## 3. Player and world journeys

### A. A person can act while another person thinks

At the supported opening, a player moves, stops and talks while NPC replies are pending and native animals continue their actual reactions. Controls, current permitted views and ordinary saves remain usable. Optional model preparation must not pin unrelated full-world representations. A failed or canceled reply does not duplicate speech, erase accepted progress or release memory still owned by the transport.

The performance work preserves the same meaningful encounter. It does not improve a result by canceling the second conversation, skipping animal activity, reducing evidence, slowing the world or excluding failed runs. The actual cognition request and admitted reply effects must retain their meaning; fixed provider replies qualify deterministic continuity, not autonomous model quality.

### B. Two windows are not two copies of the world

Two eligible connections viewing the same embodied character can reuse identical captured facts within one accepted cut. They retain independent control tokens, connection state, transport buffers, reconnect baselines and final permission checks. Closing or blocking one window does not retire another window's valid data. A different observer does not acquire that character's private perspective. New accepted progress ends reuse rather than dressing old facts as a newer view.

The proposed reuse is below the complete player view. It grants no simultaneous-control feature and changes no account or multiplayer policy.

### C. A larger gathering still contains particular people

More participants should create possibilities for individual interaction rather than replace people with interchangeable crowd props. A player can approach a person, receive a real response and later encounter a consequence. Native reactions, actual hearing, identity uncertainty and ongoing actions keep their owners.

The present design adds no crowd fidelity switch, pushing law, automatic grouping of minds or population cap. Read-only parallel preparation may serve one crowded scene as well as dispersed activity. Physical crowding and geographical cells do not prove that all effects or audiences are independent.

### D. The world remains itself on return

Saving and reloading preserve actual current-format identities, accepted effects, remaining action progress, independent detail times and correction/forgetting. Independently evolving copies of a seed share immutable resources, not mutable consequences. A quiet place need not be rendered or repeatedly copied, but it cannot silently stop owed activity merely because nobody is looking.

Complete physical-region unloading is outside this implementation slice. Current cold-history support is not relabeled as that capability. The technical design specifies the access boundary that prevents future residency work from being confused with nonexistence.

## 4. Selected work

**J — One JSON shape preflight.** Combine two existing read-only shape traversals used by native JSON preparation. Preserve the exact size calculation, standard serializer, reservations and outgoing-only encoding. This is an isolated CPU experiment, not a new codec.

**S — One scratch owner for a synchronous encoding operation.** Compare reusing one explicitly resizable temporary reservation with constructing separate native wrapper objects for sequential measurement and serialization workspaces. Outputs and their consumers keep independent ownership. This is an isolated lifetime/CPU experiment, not a general arena, a higher allowance or permission to stop accounting for live headers.

**P — Equivalent-connection capture reuse.** Compare one actual immutable player capture for a bounded same-cut group of compatible periodic publications with independent captures. Build and authorize each complete view separately. This is an isolated multiplayer preparation experiment, not global view caching or shared personal knowledge; duplicate-tab savings do not establish distinct-player capacity.

**R — Ordered read-only rate preparation.** Complete a concrete NSC03/E2 candidate on the existing host pool. First serialize outer same-world bridge calls before they enter that pool (R0); then compare parallel status-rate selections (R1). This prevents a waiting worker from taking another call that blocks on its own world's held lock. Waiting requests keep existing admission and memory custody without occupying a compute worker. Results, reductions, mutations, random draws and identities retain native order. No parallel actor mutation or second scheduler service is introduced.

All four are conditional because their complete benefit is unmeasured. J, S and P activate only when current attribution establishes material relevant cost. R runs under NSC03/E2's existing prerequisites, with R0 measured separately before R1. A documented rejection or not-applicable result is valid; an unmeasured implementation is not adoption. The [technical sequence](native-runtime-foundations-tech-design.md#7-experiment-sequence-and-adoption) makes each condition executable rather than leaving implementation choices implicit.

## 5. Foundation contracts to preserve now

**Existence, residency, activity and publication are different.** Internal calculation may assume a complete supported execution scope; every field access need not gain a new tri-state lookup. Loading/query boundaries must distinguish missing resident data from a proved absent entity, and prepare required data before entering mutation. Do not add a generic storage abstraction to all native operations.

**One mutation owner and actual lifetimes remain controlling.** Reuse immutable calculations and products; do not share a mutable candidate, replace its exact input cut, or retire an allocation merely because one reader finished. Dependent operation failure leaves existing rollback and accepted-output ownership intact.

**Order, precision and source meaning survive the port.** Keep current double-precision authoritative coordinates, world units, stable logical identities, native slot generations, exact source references, original sampling phase and saved randomness. A cell or process address is not durable identity. Body/query geometry supplies candidate facts, not character knowledge.

**Work must remain attributable and bounded.** Extend existing counters and finite admission, not per-actor tracing or a universal dependency graph. Distinguish actual CPU/RSS from reservation bounds. Required effects, optional cognition and replaceable presentation cannot be discarded under one generic overload policy.

These contracts are preservation requirements for affected consumers, not assertions that they are currently absent. The technical design names already-satisfied coverage and later extraction triggers.

## 6. What this design does not add

No legacy readers, old-save migrations, second database, world snapshot per observer, actor thread, cell-specific pool, universal ECS, global view cache, new model route, automatic paid retry, artificial gameplay room, independently advancing regional clock or cross-machine authority protocol is introduced. Current NSC05–NSC07 and PD11–PD12 retain their later conditional scopes.

No complete physical-region streaming, new world-seed overlay engine or broad crowd-behavior design is claimed. Those need actual consumers and supported family closures. Their research questions remain discoverable without being smuggled into the current proof.

## 7. Acceptance and delivery

A candidate must preserve equivalent actual work and useful player behavior through ordinary callers, not merely identical small helper outputs. Correctness, responsiveness, resource stability, complete operating cost and human enjoyment are separate evidence. No measured population capacity follows from this document.

Proceed one independent change at a time. Reuse current NSC attribution and valid correctness evidence. Each candidate and any prerequisite refactor require an isolated before/after with actual consumer correctness and complete native/Node/database/network cost; preserve failed results. Include [the cognition-boundary comparison](native-runtime-foundations-tech-design.md#72-required-correctness), rather than infer response safety from unchanged final positions. Remove an unsuccessful mechanism and its otherwise unused machinery. Do not retain a permanent experimental switch or both implementations for compatibility.

No unresolved product choice is needed to implement these experiments. Activation and adoption remain measured decisions. New pushing rules, lower-fidelity cognition, unattended-service promises or population-admission offers require their existing design owners; they are not unanswered prerequisites for this work.

## Maintained records

- Implementation and design status: [NRF work](../maintainers/native-runtime-foundations.md).
- Exact mechanisms, steps and comparisons: [technical design](native-runtime-foundations-tech-design.md).
- Numerical and behavioral restrictions: [NRF constraints](../limits/native-runtime-foundations.md).
- Existing proof and actual evidence: [NSC delivery](../maintainers/native-simulation-core.md) and its linked coverage inventory.
- Research disposition: [MMORPG foundation handoff](../maintainers/decisions/mmorpg-engine-foundations.md).

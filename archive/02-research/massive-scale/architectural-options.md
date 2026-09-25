# Architectural options worth considering beyond a conventional MMO stack

[Research index](README.md) · **Exploratory proposals**, not accepted mechanics or implementation requirements. Each option names what it could improve and what it could break. Start with the simplest current implementation until its trigger is real.

## 1. An agent as durable identity plus scheduled opportunities

Instead of equating a character with a permanently running process, represent its identity, accepted mind, native plan and deadlines durably. A shared scheduler activates the necessary bounded computation. Native routines continue without generative inference; a full harness is acquired only for the admitted task that needs it.

This can preserve individual continuity while reducing idle overhead. It requires well-defined wake conditions, no missed protected appointments, bounded hydration and an answer to offline-world progression. Grouped execution in AgentSociety and virtual identities in Orleans are relevant precedents, not implementations to copy wholesale. [S21](sources.md#s21), [S05](sources.md#s05)

**Trigger:** idle resources or per-agent process/connections dominate. **Prototype:** many durable characters, few active decisions, followed by a controlled wake burst. Compare identity and promises before/after dormancy.

## 2. An interaction graph that guides placement

Treat region boundaries as a hypothesis about low coupling. Collect counts of cross-region sensory, physical, process and transaction edges. Use those measurements to decide whether to split a world, move an interacting group together or retain one larger owner.

A connected vehicle, rope, bridge or conversation may be more meaningful than an arbitrary rectangular tile as an ownership unit. The implementation should not physically repartition on every changing edge; placement churn can cost more than it saves. Stable regions with explicit exceptions may be sufficient.

**Trigger:** one world's compute is limiting after local optimization. **Prototype:** offline analysis of interaction traces, then a two-owner system with the same logical identities. Measure total coordination bytes and latency, not only CPU balance.

## 3. A shared occurrence with many private acquisitions

Store common source content once, while retaining actor-specific acquisition, detail, interpretation and permission. This avoids duplicating a speech payload for every witness without pretending every witness learned the same thing.

An efficient design could group only truly identical disclosed detail classes while keeping acquisition identity and later correction/forgetting individual. A shared source pointer must not permit an actor to fetch undisclosed portions. The current EPR/memory separation is the right semantic owner; this is a physical-layout experiment, not a new memory system.

**Trigger:** source payload duplication or history ingestion dominates. **Prototype:** one shout with many different listener outcomes, then independently forget/correct subsets and verify archive/search/restore behavior.

## 4. Private small-corpus retrieval inside a huge global store

A global memory service can route to a bounded actor/world partition, retrieve eligible candidates exactly, and combine separately permitted public knowledge. Large total volume does not require every query to traverse a billion-vector approximate graph.

This makes corpus skew important: a famous merchant may legitimately know far more than an isolated animal. Provide a measured expansion path for large eligible corpora without forcing every small one through the same expensive index. Filter-aware and mutable-index research offer candidates when needed. [S27](sources.md#s27), [S63](sources.md#s63), [S64](sources.md#s64), [S65](sources.md#s65)

**Trigger:** measured search latency, candidate construction or storage maintenance. **Prototype:** fixed per-actor history with increasing global population, then fixed population with increasingly large private histories. Those are different scaling curves.

## 5. Cost-aware admission for invented laws

Extend the existing admitted-mechanic contract with an inspectable cost/dependency envelope: scope, active instances, candidate queries, event descendants, recurrence, external work and state growth. Charge or account for the expansion of work, not merely the request that started it.

A future analysis tool could estimate whether two individually bounded rules form an amplifying loop. This need not be a complete theorem prover. Start with declared effects, bounded reach, cycle checks and conservative limits inside trusted families. A new unbounded physics domain remains separate engineering work.

**Trigger:** creators can compose mechanics whose combined work is difficult to predict. **Prototype:** adversarial pairs of harmless-looking rules, including recursive messages and triggers that create more triggers. Keep rejection understandable and operational, not a false claim about fictional physics.

## 6. Exact scheduled processes before simulation level of detail

For suitable supported rules, store current value, last integrated simulation time, inputs and the next discontinuity. Evaluate an exact transition when a relevant cause changes or the deadline arrives. This can remove repeated work without discarding individual state.

Only apply it where equivalence is established. A linear reservoir with known flow is unlike a chaotic contact system or a process whose intermediate events are observable. When several sources change the rate, split integration at their actual causal times rather than applying the final rate to the whole interval.

**Trigger:** large numbers of simple periodic processes dominate. **Prototype:** compare against current fixed-step semantics across pause, speed change, threshold crossing, cancellation and restore. Do not bypass the existing per-step contract without that proof.

## 7. Explicit fidelity tiers for deliberately abstract mechanics

A different option is intentionally representing remote populations or ecological fields at lower detail. Keep the aggregate's authoritative state and a documented mapping to more detailed entities; track conserved quantities and uncertainty. This is a changed model, not an exact optimization.

The hard part is re-entry: a named person's prior history, an existing ownership claim or a witnessed structure cannot be resampled arbitrarily when a player returns. Protected individuals/processes may need to stay detailed while anonymous background quantities are aggregated. Specialized large-agent studies show why this can be efficient, not that it meets OpenLegend's intended continuity. [S23](sources.md#s23), [S62](sources.md#s62)

**Trigger:** accepted game design permits abstraction and exact individual simulation is too costly. **Prototype:** repeatedly cross the detailed/abstract boundary and intervene at its edge. Detect duplicated resources, inconsistent histories and exploitable observer-dependent outcomes.

## 8. Predictive warming without unauthorized prediction

Use permitted destinations, party travel and public event schedules to warm likely destination geometry/assets and reserve compute before arrival. Do not prefetch private history into an unauthorized client's cache or commit the actor's future merely because the predictor expects travel.

Server-side preparation can be canceled or reused within bounded caches. Client asset prefetch is limited by disclosure and bandwidth. A surprise teleport or popular creator event still needs a cold fallback and admission policy.

**Trigger:** cold joins or travel dominate latency. **Prototype:** compare correct and incorrect predictions, including a secret destination. Count wasted preparation and evictions as well as faster arrivals.

## 9. A separate event audience for remote participation

A major celebration could have embodied local participants and explicitly authorized remote viewers. Remote participation might use public narration, a stage broadcast or delayed summaries rather than duplicating every local body interaction.

This can reduce required interaction density, but it is a product change. A remote viewer's human knowledge and their character's knowledge may diverge. Define whether they can affect the event, hear private speech or gain in-world evidence. Do not quietly turn excess players into spectators after promising a shared physical scene.

**Trigger:** a specific event needs a much larger audience than its tested interactive density. **Prototype:** verify disclosure, interaction rights, latency and participant understanding—not only broadcast throughput.

## 10. Failure simulation as a permanent architectural advantage

Keep a narrow adapter layer for time, randomness, persistence outcomes, message delivery and provider results. A deterministic harness can replay rare races around owner transfer, save restoration or delayed generation. Production APIs should not depend on simulator-specific shortcuts.

FoundationDB is an unusually useful precedent, including its explicit limits around performance and external dependencies. [S57](sources.md#s57)

**Trigger:** begin with the first meaningful asynchronous/shared-state slice, expanding the harness alongside complexity. **Prototype:** the same small game scenario under many bounded fault schedules. Preserve actual browser/database integration tests because a correct simulated contract can still differ from reality.

## Choosing among these options

Favor options that preserve existing meaning while removing unnecessary work. Keep behavior-changing alternatives explicit and reversible where possible. A technology that makes a narrow workload fast is inspiration, not evidence that the entire world should be remodeled around it.

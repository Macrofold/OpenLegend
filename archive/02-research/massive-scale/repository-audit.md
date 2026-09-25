# Repository audit: the foundation you actually have

[Research index](README.md) · Static review at `3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238`, not a benchmark or exhaustive security audit.

## Product interpretation

OpenLegend is not merely an MMO with a chat interface. Its expensive and distinctive feature is a causally coherent world in which people and agents can perceive, remember, converse, pursue goals, invent permitted mechanics, and interact with physical resources. The browser depicts that world; an authoritative domain determines consequences. Private knowledge, invented beliefs, native obligations, and objective state are not interchangeable.

The accepted [simulation-complexity direction](../..//03-design-proposals/simulation-scope-and-complexity.md) favors finite, reusable laws and the simplest representation that preserves meaningful choices. Open-ended expression does not mean every imaginable physical relation must be simulated. This distinction is one of the most valuable existing scaling decisions.

## Observed implementation versus intended destination

| Area | Observed at the baseline | Scaling implication, not an assertion of failure |
|---|---|---|
| Authority | `WorldService` holds one `SavedWorld` and serializes mutation through a promise tail. Its initialization loads `local-player`. | A useful single-writer integrity boundary. More API replicas cannot safely mutate the same world without ownership routing and fencing. |
| Human control | `WorldState.identity` identifies one controlled entity; service history and presence use that perspective. | Several tabs or sockets are not independent multiplayer identities. Introduce account/session/controller bindings before public multiplayer. |
| Hot state | `WorldState` contains entity/item dictionaries, memories, events, minds, definitions, root sequence and RNG state. | This API can evolve, but keeping every historical record resident or requiring a root-wide operation forever would impose a per-world ceiling. Structural sharing and incremental persistence mean this is not proof of a full copy on every command. |
| Persistence | Current architecture documents PostgreSQL/local persistence, incremental journals, checkpoints, receipts, durable history and job records. D0–D6 remain open. | The normalized production model is a target, not a completed database migration. Keep source-preserving migration and failure tests on the critical path. |
| Durability | Explicit `commit` calls storage before replacing committed state; routine progression can be accepted in memory and flushed separately. Storage errors pause authority. | Define durable acknowledgment versus displayed routine progress. A crash window for movement must not silently become a crash window for ownership or payments. |
| Networking | Browser `applyGamePatch` checks base/revision; requests carry a generation; current architectural transport is HTTP commands plus SSE. | Good stale-update seams. Multiplayer needs recipient-scoped baselines, disclosure and resynchronization—not merely a switch to WebSockets. |
| Presence and time | Service pause behavior considers visibility, connections and manual pause at world scope. | Appropriate local-product behavior does not define a persistent shared-world policy. One player's hidden tab must not accidentally pause other players. |
| Recall | `VectorStore` stores vectors in PostgreSQL and joins allowed source IDs and revisions before exact cosine ranking. | Scope-first retrieval is an asset. Large candidate-ID payloads, corpus growth, and filtered query latency need measurement before changing algorithms. |
| Save/restore | Restore reapplies a forgetting ledger, validates historical event counts, and creates new epochs/timeline/generation. | Preserve these protections when worlds move or fork. A save does not authorize rolling back real payment effects or reusing stale external jobs. |
| Spatial model | Entity position and spatial state are separate from `appearance`; spatial specifications own geometry and navigation. | Retain renderer-independent coordinates, bodies and stable references. A scene graph is not a durable authoritative schema. |
| Agent execution | Existing design separates native continuation/protection, attention, immediate generated decisions and background reflection. | Concurrency belongs in bounded compute workers; accepted effects still enter the world authority. A million agents need not mean a million always-running processes. |
| Perception | EPR distinguishes external occurrences, private acquisition, active stimuli, reaction opportunities and wake signals. | Preserve one scoped evidence path; do not manufacture global broadcasts or one mandatory paid call per stimulus. EPR is itself marked proposed in places. |

### Code anchors

These immutable links identify the inspected implementation, rather than whatever a future `main` happens to contain:

- [World shape and event/memory records](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/packages/domain/src/types.ts).
- [WorldService: state, mutation serialization, commit, presence and restore](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/apps/server/src/world-service.ts#L176-L610).
- [Exact scoped vector store](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/apps/server/src/vector-store.ts).
- [Client patch and generation handling](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/apps/client/src/api.ts).

The review read these focused code paths and the relevant sections of the larger architecture, performance, memory, production-data, delivery, and perception specifications. It did not execute the game or read every line of every subsystem. Findings about uninspected paths are framed as questions or specification requirements, not invented code defects.

## Existing target contracts worth protecting

The [production data model](../../07-technical-architecture/production-data-model.md) and [delivery/scale strategy](../../07-technical-architecture/data-delivery-and-scale.md) already separate logical responsibilities, stable identity, current state, historical evidence, projections, asynchronous work, and eventual physical placement. Their staged expansion favors whole-world movement before splitting a hot world. This is aligned with the architecture proposed here.

Preserve composite world-scoped identity, immutable content pins, explicit time/version conventions, transaction receipts, scoped queries, module lifecycle validation and source-preserving import. Do not introduce a new unrelated memory store or event bus because a research paper uses one. The useful lesson from another system is usually a boundary or algorithm, not its exact product list.

The [performance contract](../../../docs/performance.md) protects meaning while bounding work. In particular, budget exhaustion is not evidence that a person could not hear or reach something. An optimized broad phase can reject impossible candidates; an arbitrary audience cap changes the game. This matters more than the choice of spatial tree.

## The most consequential pressure points

**Single-player assumptions leak across boundaries.** Before two independently authenticated humans control actors in the same world, enumerate every use of the default profile, controlled actor, presence, pause, history cursor, editor authority and save timeline. This is a correctness and privacy task before it is a scale task.

**A logical world should not force whole-world residency.** Root dictionaries are reasonable today. New subsystem APIs should request a bounded entity set, affected region, due work or permitted history range. Avoid adding mandatory whole-history reads or full-world scans to routine commands. The target is an explicit working set, not an immediate ECS rewrite.

**One RNG and sequence are convenient but constrain future independent execution.** Preserve existing deterministic ordering now. Later partitioning needs a reviewed scheme for owner-local ordering, causal transfer and randomness streams or recorded resolved outcomes. Changing draw order casually can change gameplay. Do not promise bit-identical distributed replay from a seed alone.

**The current time multiplier amplifies every per-simulation-time cost.** The inspected performance contract describes 1× as 60 simulated seconds per real second. A rule invoked once per simulated minute can therefore run once per real second. That multiplier affects thought triggers, memory ingestion, maintenance and ecological processes as well as physics; see [capacity arithmetic](capacity-model.md).

**Data delivery can become the bottleneck after simulation is optimized.** Per-observer projection, serialization, history filtering, cursor repair and cold loads need their own measurements. A native stress result does not include the complete browser, database or inference system.

**A richer invention can expand the interaction graph.** A mechanic that reads every actor, modifies distant weather, or recursively schedules effects can defeat locality even when its own function is fast. Work, reach and dependency envelopes belong at admission, not only at infrastructure provisioning.

## Ownership map for subsequent work

| Research recommendation | Existing owner to consult before implementation |
|---|---|
| IDs, persisted records, importer, atomic writes, outbox, history and scale rollout | [D0–D6](../../../docs/maintainers/production-data.md) |
| Cadence, hot paths, headroom and scalable workload evidence | [Performance tracker](../../../docs/maintainers/performance.md) |
| Geometry, body queries, spatial versioning and navigation | [Spatial tracker](../../../docs/maintainers/spatial-world.md) |
| Recall, reflection, continuation, cognition scope | [Cognition tracker](../../../docs/maintainers/cognition-redesign.md) and [memory specification](../../../docs/memory-architecture.md) |
| Stimulus acquisition and reactions | [EPR tracker](../../../docs/maintainers/events-perception-and-reactions.md) |
| Durable conversations and story projections | [Narration/conversation tracker](../../../docs/maintainers/narration-and-conversations.md) |
| Checkpoint semantics and player restoration | [Save/load tracker](../../../docs/maintainers/save-and-load.md) |
| Admitted world modules and lifecycle | [Extensible-world foundation](../../../docs/maintainers/extensible-world-foundation.md) |

The research does not mark any of these gates complete. It explains why they matter at larger scale and which experiments should inform their completion.

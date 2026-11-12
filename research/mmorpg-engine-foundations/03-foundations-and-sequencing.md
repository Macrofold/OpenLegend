# Engine foundations and sequencing

[Collection](README.md) · [Sources](sources.md) · [Needs-design briefs](../../docs/maintainers/decisions/mmorpg-engine-foundations.md)

## The selection rule

Build a foundation now when a wrong assumption would spread through native storage, public contracts, persisted identities or every mechanic. Build a larger mechanism soon when a real playable milestone consumes it. Defer machinery whose absence can be addressed behind an already sound boundary.

The recommendation is not to pause the small-world proof until a complete MMO engine exists. Make the proof exercise the seams that would otherwise become expensive to change, while retaining its bounded feature scope. Most recommendations below extend existing owners. None establishes that the current implementation lacks every listed property.

## 1. Scoped access and partial residency

**Preserve the seam now; deliver larger streaming soon.** Persistent existence, live residency and active processing are different states. A distant object may exist durably without an allocated native slot. A resident object may require no recurring work. A person with a pending commitment may require a deadline even without a human nearby.

Avoid making a fully hydrated world graph the implicit argument to every operation. The native core can remain the single authority while exposing bounded owner/query access and explicit outcomes for unavailable, incomplete or not-resident inputs. Absence from a resident table must not mean that the entity never existed, a container is empty, or a remembered claim is false.

Extend the existing dependency/query-result and cold-history conventions rather than adding a second repository abstraction everywhere. Separate command preparation that may require storage from the short authoritative acceptance path. Recheck relevant dependencies after preparation; do not hold the world's mutation lane while reading an arbitrary amount of cold state.

Design activation/deactivation around real obligations: ongoing action continuation, scheduled events, references, required evidence, unsaved changes, physical dependencies and pending external jobs. Cache eviction alone cannot decide whether an authoritative activity may stop. Long-lived views must not silently pin the whole world.

A minimal consuming slice is two separated places in one world: one can leave residency, a supported deadline or arrival can reactivate it, and saved continuation remains correct without loading all history. Do not require distributed machines to prove this property.

## 2. Explicit influence, dependencies and wakeups

**Extend current declarations during the port.** Every recurring family needs an understandable account of the state it reads, state it may change, geographical or nonlocal influence, wakeups, deadlines and continuation. This is not a demand for a universal runtime dependency graph or a new language.

Reuse existing typed query families, semantic changes, native operation declarations and world-installed definitions. Unknown dependencies retain a conservative execution path. That path must be observable: a frequently used global fallback can erase the intended locality while remaining functionally correct.

A local action can have nonlocal consequences: an obligation, a shared resource, an attached object, a message or a long-range effect. Treat those dependencies according to their semantics. Do not convert a distant dependency into an arbitrary spatial radius or assume that every system fits one cell.

A global clock does not require every entity to be touched at every globally selected boundary. Preserve exact ordering and the supported elapsed-integration contract while scheduling only relevant due work. Conversely, skipping unchanged input is unsafe when time itself crosses a relevant deadline. Measure whether one unusually fine boundary forces repeated world-wide bookkeeping.

The future design should make a new mechanic's cost visible at its extension point: what can it wake, what input size can it examine, what output can it create, and what happens if its supported budget cannot be met? An installation-time contract is more useful than discovering an unrestricted global scan after many mechanics depend on it.

## 3. Data locality and a bounded parallel execution surface

**Already selected; protect it across the complete lifecycle.** Compact native arrays or records reduce representation overhead only if callers avoid reconstructing object graphs, cloning large inputs or contending on a universal lock. Keep process-local handles out of durable and public identity. Keep optional, cold and variable-sized records out of every hot physical row.

Count allocation, undo records, captures, output encoding, memory copies, cache invalidation and host waiting alongside kernel arithmetic. The native design's complete proof is essential: moving CPU from Node into Rust is not a speedup unless useful equal work becomes cheaper or more responsive end to end.

Use one bounded native compute pool per host as selected. Coordinate other CPU consumers so nested libraries, navigation workers and independent worlds do not each assume all cores are exclusively theirs. Tiny tasks remain inline. Task granularity, scratch allocation and coherent input reuse must earn their costs.

Factorio's reported memory-bandwidth limitation is a useful warning that independent work can still fail to scale across more cores [S06]. Profile bytes moved and shared-cache behavior when adding threads does not help. NUMA-aware placement, SIMD, GPU offload and special allocators remain measured options, not prerequisite frameworks.

Preserve deterministic effect ordering, randomness and allocation as required by the existing design. Per-worker RNG or iteration order must not make load placement change the world. Any future deterministic stream decomposition is a separate semantic change, not an incidental optimization. State precisely whether reproducibility is required within one build/hardware class or across platforms; do not promise cross-platform floating-point equivalence without evidence.

## 4. Bounded products and complete backpressure

**Specify at native/API boundaries now.** A bounded job count does not bound memory when one capture or result can contain a huge crowd or lifetime history. Bound bytes, work, age and retention as well as count, using existing admission and storage owners.

Give each consumer product a named release/lifetime owner. A slow player stream, model call, debug reader or save attempt must not retain an unlimited succession of immutable cuts. Measure simultaneous in-flight captures and their references, not just current authoritative state.

Classify outputs by meaning. Newest compatible visual state may replace unsent visual state. A reliable action outcome, source revocation, protected receipt or admitted financial attempt cannot be dropped as equivalent. Batches may coalesce current values while preserving the ordered events and evidence needed by actual consumers.

Apply pressure before expensive preparation when possible. If native work cannot reserve its required bounded output, refuse or defer before acceptance according to the existing contract. Do not accept progress and discover afterward that there is no capacity to preserve mandatory evidence. Optional backlog does not automatically justify pausing physical play; actual storage failure retains its explicit authority stop.

Fairness must cover world, participant and work class. A busy world or many cheap-looking requests must not monopolize all preparation, database connections or provider slots. Retain capacity for unresolved underlying external work when a local timeout does not prove cancellation. Reconnect and retry bursts must not multiply uncertain effects [S16, S17].

## 5. Recipient-first delivery and client budgets

**Prepare the contract now; optimize the consumed multiplayer path soon.** Select eligible recipient scopes and changed subjects before formatting rich descriptions or serializing a complete view. Reuse compatible objective and relevance preparation, but preserve the personal projection step. Do not choose a networking algorithm that requires rebuilding one entire world representation per connected person.

Separate physical simulation, evidence recording, publication and rendering rates. The renderer can interpolate presentation while the authoritative world keeps its own exact rules. Lower display detail is not authority to erase a required observation, change an acknowledged attack, or disclose a currently unknown identity.

A connection needs a bounded initial baseline, a compatible delta sequence, an explicit resynchronization path and revocation/currentness checks. Late join and reconnect are first-class workloads, not exceptional full-world dumps. Losing a replaceable delta may require a bounded reset; it must not silently replay a command.

Keep transport-independent meaning for commands, acknowledgments, reliable effects and replaceable state. No immediate switch from the current transport to UDP, WebTransport or a binary protocol is selected. Measure serialization, socket buffering, head-of-line delay and browser consumption before choosing the replacement.

Server scale is not client playability. Thousands of server-side characters need not imply thousands of fully detailed rigs, labels, audio streams and unique textures on one browser frame. The future presentation design needs bounded asset/animation/audio work and progressive detail while preserving authoritative identities and meaningful target selection. This is a contract to investigate with existing client owners, not a renderer migration.

## 6. Large-coordinate and mutable-geography contracts

**Resolve representations before they spread through Rust.** Vast land and sea make precision, frames and spatial invalidation architectural questions. JavaScript numbers, Rust fields, physics/nav libraries, database codecs and GPU buffers may use different precision. An unnoticed conversion to single precision can make the native port constrain the world long before CPU capacity is exhausted [S13].

Specify units, expected extent, required local accuracy, coordinate frames and conversion error. Evaluate high-precision authoritative positions and local-frame computation where appropriate; do not prescribe a single layout without testing the actual consumers. A cell address is not an entity identity. A floating-point location is not a safe persistent object key.

Terrain, construction and navigation need independently addressable pieces and local invalidation. Loading a region must not rebuild the entire world's navigation or invalidate every observer because one wall changed. The relevant minimum seam is stable geometry ownership, scoped revision/dependency information and partial query outcomes, not a complete procedural terrain engine.

Streaming visual content and streaming authoritative state are distinct concerns [S12]. A server may need an area active for NPC work without a camera there. A client may need distant terrain presentation without full-detail simulation. Use separate consumers rather than forcing all of them onto one chunk lifetime.

## 7. Stable identity, seed materialization and delayed work

**Preserve existing identities; make new multi-world assumptions explicit now.** Logical entity identity must survive movement, native slot reuse, process replacement and routing changes. References must distinguish otherwise similar entities in different seed copies. Current world membership, origin namespace and persistent identity are not necessarily the same field; future supported travel must not accidentally turn movement into a new person.

Separate domain identity from timeline/life generations, definition pins and operational custody generations. A stale model result may remain valid after a routing-only move but become invalid after a relevant source correction or timeline replacement. An address or machine name must not decide that distinction.

Lazy world materialization introduces a less obvious risk: exploration order must not accidentally choose unrelated geography, consume the wrong shared RNG sequence or assign aliases. A seed alone is insufficient provenance if generator code or installed laws change. Design exact seed/definition/generator pinning and identity allocation for the selected materialized family. Do not silently change existing RNG semantics in the native comparison.

Share immutable definitions and resources, never mutable state between world copies. A seed deletion or mutation needs an explicit representation so an omitted row does not resurrect the original object on next load. This is current-format design, not a request for old-save compatibility.

## 8. Mature history and complete-cost observability

**Retain existing incremental storage; qualify it soon.** Active state, personal evidence, durable history, indexes and backups have different growth rates. A six-minute fresh opening cannot establish that the same active town remains affordable after months. Queries, corrections, deletion and restoration must not require reading all lifetime history.

Measure logical bytes and physical database work, including indexes, WAL, maintenance and checkpoints [S14, S15]. Include the native encoder, TypeScript writer and host acceptance lane. A new fast core can expose the next serial bottleneck rather than eliminate it.

Use existing profiling/work-counter owners to distinguish selected candidates, actual useful work, conservative fallbacks, captures, changed rows, actual recipients, queue age and rejected work. Avoid a high-cardinality telemetry record for every actor every frame. Source-bound, bounded attribution is sufficient for the initial proof; a new observability platform is not required.

## What should remain deferred

Do not build independently committing regional databases, cross-datacentre lockstep, a service per mechanic, a generic actor runtime, a new durable event bus, a universal ECS, speculative rollback or adaptive migration before a consuming measured need. The accepted NSC stages already provide a route to distribution.

Geographical machine placement can wait; locality, identity and bounded products cannot be retrofitted cheaply after every caller assumes a complete in-memory world. Preserve those seams while delivering the smaller pipeline. That is the distinction between avoiding a future rewrite and prematurely constructing a massive service.

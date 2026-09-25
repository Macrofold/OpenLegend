# NOW: foundations that preserve the ability to scale

[Research index](../README.md) · Proposed priorities, not a parallel implementation tracker. Coordinate with [D0–D2](../../../../docs/maintainers/production-data.md) and the existing subsystem owners.

## Build the seams, not the eventual infrastructure

The goal today is not to make a prototype serve a million clients. It is to prevent assumptions from spreading that would require rewriting every feature later. The highest-leverage changes are contracts, data boundaries and tests that remain useful on one process.

### 1. Identity must survive movement, restoration and multiple humans

Keep account identity, authenticated session, controlled actor, world, timeline, ownership epoch, entity revision and observer-scoped display reference distinct. A sector or machine is a location, not an entity's identity. Use the existing production conventions rather than inventing another ID format in this report.

A command should resolve its actor from authorized control, not trust an arbitrary client `actorId`. World membership alone does not confer god/editor privileges. A player may control different actors in different worlds, while an NPC may become player-controlled without losing its history. A reconnect is not a new character; a fork is not the same world lineage.

**Small proving slice:** two accounts in one world, each with a private memory and different knowledge of the same person. Reconnect one, revoke one controller, and replay an old request. No cross-control, cross-memory disclosure or duplicate effect should occur. This exposes more foundational risk than opening a thousand idle sockets.

### 2. Keep one authoritative owner for a mutable aggregate

Retain the single-world writer initially. Route all consequential state changes through it, including admitted AI proposals and editor effects. Separate logical subsystem APIs, but do not distribute each component across a network.

Design the eventual owner check into commit boundaries: expected ownership generation plus a compare-and-set/transactional rejection of stale authority. Initially one owner can satisfy it. Later, leases alone are insufficient: a paused or partitioned former owner may wake after its lease expires. Storage must reject its writes under the old generation. This is a proposed extension of existing generation/receipt protections, not a claim that it is implemented.

The historical Orleans paper is useful for lifecycle abstraction, but explicitly leaves persistence policy to applications and discusses eventual single activation under failures. Its actor identity is not proof of economically safe single-writer execution. [S05](../sources.md#s05)

### 3. Make state access bounded and attributable

A new system should state which entities/components it reads, which authority owns the writes, which revision invalidates its cache, and what bounds its work. Prefer `dueProcesses`, `nearbyCandidates`, `changedActors` and paged actor history to handing every plugin the entire world. These can be ordinary in-process interfaces today.

Separate immutable definitions from mutable instances. A million copies of a recipe should not require a million independently mutable definition documents. Conversely, two containers using one definition must not accidentally share mutable fuel or inventory.

Do not replace the model with universal entity-attribute-value storage merely for extensibility. Normalize identities, ownership, references, quantities, time, permissions and hot query keys; use versioned structured payloads for bounded, less frequently queried module-specific data. Existing schema owners already establish much of this direction.

### 4. Separate current state, durable history and derived data

The active simulation needs current bodies, processes, reservations, relevant commitments and bounded evidence—not every historical transcript or vector. Keep an immutable or versioned source boundary for memories and generated derivatives. Search indexes, narration, thumbnails and analytics are rebuildable projections, not alternative truth stores.

A history append must not require rewriting an ever-growing actor biography or whole-world blob. A query cursor must not become slower merely because unrelated worlds have aged. Establish the access patterns before selecting a distributed database.

**Small proving slice:** make one world's history 100 times older while keeping its live population and active actions fixed. Measure command cost, working-set memory, commit bytes and history-page cost separately. Linear growth in a deliberately requested export is fine; linear growth in moving one character is a warning.

### 5. Treat knowledge as an authorization boundary

Preserve what each observer legitimately acquired at event time, with source, detail, time and revision. Current visibility cannot retroactively grant earlier speech. A belief can be wrong without corrupting world truth. A summarizer cannot convert hearsay into a witnessed fact.

Scope recall before relevance ranking. Filter current permissions again before publishing a delayed result. Cache keys need observer/evidence policy and source revisions where these affect disclosure. A shared cache may reuse public geometry calculations without reusing one character's private interpretation.

**Small proving slice:** actor A hears a whisper, actor B does not, and a door later opens. Run search, reflection, narrator, save/restore and reconnect. None should teach B the historical whisper. This is also an information-leak regression corpus.

### 6. Make async work a proposal with a lifecycle

Record a stable operation identity, relevant input versions, ownership generation, deadline, allowed scope and budget reservation outside model prose. Execute expensive inference outside the writer's transaction. On return, the authority validates whether the proposed effect is still applicable.

A model thought against a living target does not remain actionable after the target dies or migrates. Some stale historical evidence is still legitimate; stale mechanical permission is not. Reject or rebind only through an explicit rule, never a name-match guess.

Receipt and state mutation must be atomic at their owning boundary. A timeout is an unknown outcome, not proof that nothing happened. Retrying a request with a new ID can duplicate a charge or effect. [S35](../sources.md#s35)

### 7. Admit mechanical complexity, not just schema validity

Each reusable mechanic needs a bounded input set, interaction reach, output/fanout envelope, timer behavior, resource accounting, supported state transitions, save/migration semantics and an owner. Declarative configuration may be safe inside a known envelope; arbitrary generated code is a different trust class.

A syntactically valid rule that says “on every movement, ask every person what they think” is a scalability and spending attack. Refuse or defer such admission with a clear operational explanation. Do not convert a budget limit into a fictional claim that the action violates physics.

### 8. Protect time semantics before adding more periodic systems

Keep simulation time, real deadlines, logical event order and client presentation clocks separate. Specify units at boundaries. An interest subscription, model timeout, subscription bill and physical hunger change do not share one universal clock.

For every recurring rule, ask whether it must evaluate each native step, can schedule an exact next crossing, or proposes an approximation that changes semantics. Only the last category requires a gameplay compromise. Do not replace a stable one-second transition with a large elapsed-time call without differential evidence. [Simulation/time chapter](../domains/simulation-time.md)

### 9. Design a recipient-specific protocol now

Retain the current revision and generation checks. Introduce explicit session/observer scope around projections before multiplying connections. Keep reliable committed events separate from replaceable render state. Bound pending bytes, catch-up windows and resnapshot work.

Changing SSE to WebSocket does not solve disclosure, authorization, ordering, reconnect storms or work amplification. Stable network contracts make that transport decision reversible. [Browser/networking chapter](../domains/browser-networking.md)

### 10. Install a workload and invariant harness

Record useful costs per action, observer, active body, changed region, memory ingestion and generated decision—not only CPU percentage. Include density, world age, cold cache, simulated speed and client device. Run small failure and privacy cases in ordinary development; reserve expensive scale qualification for dedicated environments.

At least one regression should exercise two competing actors consuming the final resource, one stale AI response, one repeated request, one restore with an erasure overlay, and one listener crossing a boundary. These protect architecture more directly than a large synthetic object count.

## Do not build now merely because the final game is large

Do not introduce Kubernetes, a global database, Kafka, a separate vector service, an actor process per NPC, cross-region active-active simulation, arbitrary distributed transactions, or a new ECS solely to signal seriousness. Choose them when a measured requirement outweighs integration and operational costs.

Do not prematurely commit to a hard population number, silent time dilation, instancing, reduced cognition fidelity, or spectator-only crowds. Those options can be valuable but alter the product promise. The [decision questions](../decision-questions.md) identify which assumptions need explicit approval before implementation.

## What success now looks like

One simple world can still run in one process, with the same native rules. Yet two authenticated players cannot impersonate each other; historical growth does not inflate unrelated commands; derived recall cannot leak private evidence; stale work cannot mutate a restored world; and every new mechanic has a finite cost contract. That is a foundation that can grow without pretending to be a completed global service.

# Engine perception, events, and reaction scheduling

**Status:** research and architectural recommendation, not an accepted product change or implementation result.

**Repository evidence:** `Macrofold/OpenLegend` at commit `03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd`. Public engine documentation was reviewed alongside that snapshot. Code inspection establishes control flow and potential scaling costs; this research did not execute OpenLegend, run a new benchmark, or verify live model behavior. Engine descriptions below concern the cited interfaces, not every game made with an engine.

**Reading map:** this document owns external research and the repository audit. [Events, perception, and reactions](../../docs/events-perception-and-reactions.md) owns the proposed contract; the [EPR tracker](../../docs/maintainers/events-perception-and-reactions.md) owns proposed implementation work. Current implementation and measurements remain in the existing Architecture and Verification documents.

## 1. Recommendation

Build a **small shared stimulus-and-reaction framework**, not a universal message bus through which every engine operation must pass.

The useful unification is: external observations, private internal changes, explicit speech, relevant state changes, and due reminders have common identity, scope, episode, and scheduling contracts. They can enter one actor-specific intake without using the same detector, retention policy, urgency, or executor.

Keep native continuous simulation in ordered, efficient loops. Use spatial indexes to find possible observers, exact sensory rules to establish evidence, observation deltas to avoid repeated work, and dirty/deadline scheduling to decide when another decision is useful. Reuse the current cognition, history, Narrator, persistence, and save/load machinery.

The strongest reason to make this change now is **repeated native detection work plus inconsistent trigger boundaries**, not a lack of an event library. Adding a broker or an event class without removing those scans would add machinery while preserving the bottleneck.

## 2. What current engines actually do

### Unreal: perception changes feed decisions; neither replaces sensing

Unreal's AI Perception separates stimulus sources, senses, and listeners. It exposes perception-update callbacks, stimulus age/strength, sight acquisition versus loss radii, and independently configured hearing and damage senses. This is a close precedent for a common stimulus interface with different detectors and receiver rules. It is not evidence that geometry becomes free or that one object's importance can replace receiver-specific perception. [UE1]

Unreal's Behavior Trees are explicitly event-driven: relevant Blackboard changes can cause observers and priority changes rather than a full tree reconsideration every frame. Services can still run periodically. The lesson is to update useful decision state when relevant facts change while retaining clocks and ongoing action execution—not to eliminate every tick. A Blackboard holds current decision facts; it is not automatically a durable memory/history service. [UE2]

The `UAISense_Sight` API itself calls sight queries an n-squared problem and describes separating in-range from out-of-range queries to reduce sorting. Its visibility routine accounts for line-of-sight work, including asynchronous requests. Even a mature perception system still manages observer–target pairs and query budgets. [UE3]

Unreal's Significance Manager evaluates registered objects relative to viewpoints, then lets game code use the resulting importance. Epic explicitly notes that the manager alone does not improve performance. Its resource-allocation significance should not be confused with an individual character recognizing a legendary object or finding it emotionally meaningful. [UE4]

MassEntity adds a different tool: data-only fragments, archetype-based storage, batched processors, and deferred structural changes. It illustrates that high-volume simulation is also a data-layout and bulk-processing problem. It does not imply that OpenLegend should migrate to Unreal or replace its current domain with a new ECS. [UE5]

StateTree combines hierarchical state-machine structure with behavior-tree selection. It is an alternative for organizing behavior once relevant state is available, not a replacement for spatial detection, authoritative facts, or paid-work admission. OpenLegend does not need a new behavior-tree editor to improve its trigger infrastructure. [UE6]

### Unity: shared candidate data, change filters, and batched work

CullingGroup accepts shared bounding-sphere data and reports visibility/distance-band changes. This resembles the proposed enter/exit/distance-tier notifications. Important limits: a group uses one camera/reference point; visibility uses camera frustum and static occlusion rather than arbitrary NPC senses or dynamic occluders; results update during camera culling. Share common source data, but retain independent viewpoints and know which snapshot the result describes. Rendering visibility is not a sufficient server-authoritative knowledge rule for OpenLegend. [UN1]

Unity Physics accelerates collision queries with a broad-phase bounding-volume hierarchy. Broad phase finds candidates; precise tests determine hits. Its documentation also describes when the query world's broad phase is updated and the additional synchronization option. OpenLegend should apply the same separation: cheap spatial candidates, exact sense rules, and an explicit temporal boundary. Do not use an old spatial snapshot to decide who heard a short-lived event. [UN2]

Unity Entities change filters operate at chunk granularity. A chunk can be considered changed because a system obtained write access, even if individual values did not change. Such filters reduce work but are not semantic events like “health crossed a critical threshold.” This is relevant to OpenLegend's immutable-object identity checks: a broad container changing can invalidate much more than the particular sensory or cognitive fact that matters. [UN3]

Entity command buffers record structural operations for later playback. They solve safe mutation timing, not observation or historical awareness. Keep requests for mutation separate from notifications that an accepted mutation happened. [UN4]

### Godot: overlap notifications and general signals

Godot's Area2D provides body/area enter and exit signals, collision masks, and monitoring. Overlap lists update on physics steps rather than immediately after arbitrary movement. These are useful precedents for monitored spatial relationships; overlap alone does not establish line of sight, recognition, or what an actor can know. Godot's signals also provide general decoupled notifications, but the detection system must still do the work that produces them. [GO1] [GO2]

### Bevy: do not confuse observable events with buffered messages

Bevy 0.17 explicitly separated `Event`/observers from buffered `Message` readers/writers. It also made event trigger behavior more type-specific, including entity-targeted events. The useful lesson is semantic clarity: synchronous notification, buffered processing, and targeted delivery are different contracts. A single vaguely named “event queue” conceals consequential differences in order, timing, and ownership. This is a versioned design example, not a claim that 0.17 is Bevy's latest release. [BE1]

### O3DE: a real example of engine-wide pub/sub

O3DE documents both EBus and `AZ::Event`. EBus decouples many sources and listeners through buses; `AZ::Event` is tied to particular component instances. This validates that shared messaging infrastructure is a legitimate engine pattern. It does not establish that routing all data through a global bus is the fastest option, or that bus subscribers should automatically receive private simulation facts. For OpenLegend, explicit world/actor addressing and typed consumers are more important than a global singleton. [O3D1]

### Flecs: an important counterexample to “reactive is always faster”

Flecs, an ECS library rather than a full game engine, distinguishes periodically processed systems from event observers. Its manual warns against structural changes made just to trigger observers and notes that systems can be more efficient and predictable. Observer matching and callback dispatch have costs. For dense, frequently changing numeric state, a compact loop may outperform thousands of individual notifications. Use change notifications to avoid unnecessary expensive reconsideration, not to replace simple arithmetic with event overhead. [FL1]

### Factorio: change the work representation, not just the dispatch mechanism

Wube's historical belt optimization grouped transport lines and represented item spacing rather than updating every absolute item position individually. Its historical pathfinding work first measured excessive short requests, reduced unnecessary requests, and only then considered more sophisticated algorithms. These examples support reducing repeated work and using domain-specific invariants; they are not demonstrations that a universal event bus produces simulation scale. The reported game-specific improvements must not be reused as OpenLegend speedup estimates. [FA1] [FA2]

### PlayCanvas: useful presentation events, not the missing authority layer

PlayCanvas exposes an `EventHandler` interface for registering, firing, and removing listeners. OpenLegend already uses PlayCanvas for rendering. Its event utility does not supply actor-private evidence, deterministic world transactions, or durable cognition admission. Keep engine UI/render notifications outside the pure simulation authority rather than importing the renderer as a domain dependency. [PC1]

## 3. Architectural options and when they fit

This comparison is a synthesis of the preceding sources and OpenLegend's requirements, not a benchmark ranking.

| Approach | Useful for | Main limitation | Recommendation |
|---|---|---|---|
| Fixed-step systems and bulk loops | Needs, movement, physical effects, predictable ordering | Scanning inactive or unrelated data wastes work | Keep; narrow candidates and improve data access |
| Direct typed calls | Required validation and tightly coupled atomic state transitions | Too many unrelated callers can bypass invariants | Keep authoritative entrypoints and explicit order |
| Observer/pub-sub notifications | Independent consumers of meaningful changes | Fan-out, reentrancy, hidden ordering, accidental data disclosure | Use typed, scoped, named consumers |
| Buffered messages / after-commit wakeups | Decoupling optional work from transactions | Lost wakeups, overload, stale payloads | Use existing durable records plus recoverable signals |
| Dirty sets and deadline scheduling | Reconsider only affected actors; periodic obligations | Missing invalidation causes missed behavior | Extend ActorWork; test mutation coverage |
| Spatial grid / BVH / interest management | Reduce candidate pairs for sensing and replication | Dense hotspots still produce many real pairs | Reuse the grid now; incrementally maintain only when useful |
| Behavior tree / state machine / utility policy | Select actions from current beliefs and facts | Does not discover those facts or make LLM work free | Retain current decision machinery initially |
| Dormancy / analytic advancement / simulation LOD | Distant or inactive populations at large scale | Can change outcomes, RNG, deadlines, and what witnesses perceive | Defer behind explicit equivalence/product gates |

## 4. Current OpenLegend: what already exists

The inspected main branch is substantially beyond the earlier prototype. The current status document records unified living actors, durable conversations and Narrator delivery, selective story admission, indexed/cold history, dirty/deadline work tickets, bounded native batches, frozen snapshots, and manual current-format saves. These are foundations to preserve, not implementation work to schedule again. [R1]

The latest commits cover current-format manual saves (`03ae5fb`), snapshot-freezing and throughput work (`8a143b6`), runtime review edge cases (`1ff60e3`), and durable performance foundations (`3d35232`). Commit summaries are context; the findings below come from source inspection. [R2]

The active repository policy explicitly prohibits new legacy-save migration/backward-compatibility work until the owner lifts that restriction. Same-version integrity, explicit incompatibility rejection, current accounting, privacy, and coherent restore remain mandatory. [R3] [R4]

### Shared foundations

- `events.ts::emit` already centralizes external event construction, audience assignment, awareness insertion, and several domain consequences. `mutateExperience` is the shared semantic experience boundary. [R5]
- `AiDirector` already shares routing/execution machinery for immediate and autonomous responses; it uses `ActorWork` and cached scheduling state. It also contains a bounded urgent response-supersession mechanism. [R6] [R7]
- Spatial candidate queries exist. Current observation projection can read recent actor awareness rather than scanning global history. [R8] [R9]
- Existing performance documentation already calls for dirty actors, after-commit work, finite budgets, and indexed population queries. The proposed EPR work should complete specific missing trigger/perception contracts, not establish a competing performance architecture. [R10] [R11]

### Remaining hotspots and correctness boundaries

| Finding | Evidence | Consequence |
|---|---|---|
| Object encounter detection still scans every entity for each observing actor | `kernel.ts::advanceWorld`, ordinary-object projection | Approximately observers × world entities per projection, even when few objects are nearby |
| Each `emit` scans the entity collection to compute an audience | `events.ts::emit` | Many encounter emissions can multiply the first scan; low importance does not avoid this cost |
| Mutable-draft spatial queries rebuild their index | `spatial.ts::nearbyEntities` | Calling this repeatedly inside event emission is not a sufficient optimization |
| Immutable spatial cache uses the entire `world.entities` object as key | `spatial.ts` | Unrelated entity-state changes can invalidate a spatial index even without movement |
| Actor tickets compute inputs by scanning eligible minds | `actor-work.ts::refresh` | Dirty tickets are partly poll-and-compare, not wholly change-fed |
| Visibility is computed before individual cooldown checks | `ai-director.ts::considerThought` | A 45-second model cooldown does not eliminate preliminary perception work |
| `telemetryRevision` participates in actor input comparisons | Same function | Diagnostic/UI activity may cause broad reinspection; this is a candidate for a targeted invalidation test |
| New significant evidence is selected by rebuilding/filtering retained experiences | Same function | The watermark limits logical consumption, but not necessarily traversal of older records |
| Interest matching filters the visible list and preserves all matches | `interests.ts::interestMatches` | Measure visible-list scanning and actual matching work independently |
| Survival is a separate native path with its own numerical checks | `kernel.ts::nativeSurvival` and director urgency gates | Threshold ownership and private event production need a common contract; different thresholds can have legitimate distinct meanings |

Evidence for these rows is in [R5]–[R9], [R12], and [R13]. These are structural observations, not measured attribution of wall-clock time.

A further correctness test is warranted: current object acquisitions emit an `encounter` with the observer as its source and use generic spatial audience assignment. A third actor near that observer could potentially receive an acquisition description without independently perceiving the referenced object. This is an **inference from the code path, not a verified leak**. Test three actors/objects with deliberately different visibility; separate private observation acquisition from outwardly observable behavior. [R5] [R9]

### Complexity model

Let `N` be observing actors, `E` world entities, `K_a` spatial candidates near actor `a`, `Q` emitted events, and `P` the number of actual observer–source relationships.

The identified naive pieces contain work proportional to `N × E` and `Q × E`. Indexed sensing can replace much of this with index maintenance plus `sum(K_a)` candidate checks and actual recipient delivery. The current grid also sorts query candidates for stable ordering; that cost must be measured, not assumed constant. [R8]

Dense scenes remain expensive: if every actor truly perceives every source, `P` is itself `N × E`. No pub/sub API removes the need to represent distinct actor perspectives. Spatial filtering helps sparse worlds; in crowded hotspots, appropriate shared source computation, bounded optional reasoning, and explicit overload policy matter more.

## 5. Evaluating the sword proposal

### What to keep

Shared source descriptions and sensory profiles should be versioned and reusable. Current-versus-previous perceived sets are a sound way to identify entries and exits. Persisting an exposure episode avoids treating an unchanged source as a fresh discovery every tick.

### What to change

A union of everything perceived by anyone is useful for shared descriptor preparation or presentation work. It should not be the central cognition queue, and it must not determine which objects are simulated.

For a tree and sword visible to two actors, there are four legitimate perception relationships. Evaluating a scalar “importance” only twice instead of four times is unlikely to be the valuable saving. Avoid repeated spatial scans, repeated prose construction, irrelevant history retrieval, and repeated model dispatch. Those are the meaningful multipliers.

A sword does not have one universal cognitive significance. Separate:

- physical salience: visible brightness, contrast, motion, sound;
- recognition: what this observer can identify;
- contextual relevance: goals, memories, capabilities, needs;
- novelty: new source, changed source, newly understood source;
- urgency: how quickly a response matters;
- narrative significance: whether a player's story selector should narrate it.

A hidden `legendary=true` tag must not tell a character that an indistinct object is legendary. Share safe source-level facts; keep recognition and appraisal private to each observer.

### Entry is not the only reason to reconsider

If A already sees the sword and B arrives, only B has a new entry. If the sword begins glowing, both may acquire new evidence. If A later learns its identity or develops a relevant goal, A can reconsider without a spatial entry. If it leaves sight, last-seen memory must not receive its new live state.

Set differencing detects changes; **hysteresis is the additional rule that prevents repeated transitions around a boundary**. A linger radius or debounce can stabilize an encounter episode, but must not silently grant live visibility beyond the actual current sense rule.

### Persistent attention is not persistent paid inference

A glaring light should remain an active current stimulus. It can affect every later context while exposure remains valid. Generate decisions on onset, meaningful escalation, relevant action failure, or a configured due reminder—not on every tick merely because the light exists. Native physical effects continue independently. A paid-model outage must not disable known protection.

## 6. Internal events and broader engine reuse

An internal threshold crossing is a real actor-local occurrence. It deserves the same identity, timing, cause, and admission discipline as external evidence, but a different audience: normally the owner only. Visible symptoms are separate external evidence. “My health became critical” is not equivalent to everyone nearby knowing an exact health value.

Keep numerical integration and native protection deterministic. Emit meaningful transitions from the owning state system, not a message for every tiny decrement. A threshold detector can record entry, escalation, recovery, and due continuation. Native survival acts immediately; optional reasoning consumes the same scoped evidence later.

This substrate can also serve commitments, achievements, dynamic tool availability, UI invalidation, and story candidate production. It should not force numeric physics, accounting, rendering, private thought, and optional diagnostics into identical queues or retention rules. In particular, the current selective Narrator intentionally does not treat generic cognition importance or ordinary encounters as story admission. Preserve that separation. [R1]

## 7. What should happen now versus later

**Now:** preserve the existing engine; fix phase-correct spatial candidate reuse, distinguish private observations from broadcast events, add typed internal stimuli, and replace broad trigger polling with precise dirty notifications plus due work. Stabilize the existing native/model execution boundary and profile the same workloads before and after.

**Next, when measured:** maintain spatial membership incrementally, add reverse observer dependencies for changed sources, improve fair scheduling in dense scenes, and use a deadline heap if scanning due tickets is a demonstrated cost.

**Not an initial requirement:** a broker, per-object queues, a new ECS, GPU perception, all-engine event sourcing, arbitrary subscription scripts, parallel world authorities, or lower-fidelity offscreen simulation. Each addresses a different problem and requires separate evidence.

## 8. Sources

### Engine and game primary sources

- [UE1 — Epic: AI Perception](https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine).
- [UE2 — Epic: Behavior Tree overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview).
- [UE3 — Epic: UAISense_Sight](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UAISense_Sight).
- [UE4 — Epic: Significance Manager](https://dev.epicgames.com/documentation/en-us/unreal-engine/significance-manager-in-unreal-engine).
- [UE5 — Epic: MassEntity overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-entity-in-unreal-engine).
- [UE6 — Epic: StateTree](https://dev.epicgames.com/documentation/en-us/unreal-engine/state-tree-in-unreal-engine).
- [UN1 — Unity: CullingGroup](https://docs.unity3d.com/Manual/CullingGroupAPI.html).
- [UN2 — Unity Physics 1.4: Collision queries](https://docs.unity3d.com/Packages/com.unity.physics@1.4/manual/collision-queries.html).
- [UN3 — Unity Entities 1.4: IJobChunk and change filtering](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/iterating-data-ijobchunk-implement.html).
- [UN4 — Unity Entities 1.4: Entity command buffers](https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/systems-entity-command-buffers.html).
- [GO1 — Godot: Area2D](https://docs.godotengine.org/en/stable/classes/class_area2d.html).
- [GO2 — Godot: Signals](https://docs.godotengine.org/en/stable/getting_started/step_by_step/signals.html).
- [BE1 — Bevy 0.17: Events versus Messages](https://bevy.org/news/bevy-0-17/#events-vs-messages).
- [O3D1 — O3DE: Event Bus system](https://docs.o3de.org/docs/user-guide/programming/messaging/ebus/).
- [FL1 — Flecs: Observers manual](https://www.flecs.dev/flecs/ObserversManual.html).
- [FA1 — Wube: Factorio Friday Facts 176, belt optimization](https://factorio.com/blog/post/fff-176).
- [FA2 — Wube: Factorio Friday Facts 117, pathfinding optimization](https://factorio.com/blog/post/fff-117).
- [PC1 — PlayCanvas: EventHandler](https://api.playcanvas.com/engine/classes/EventHandler.html).

### Pinned repository evidence

All links below pin the reviewed revision; they are audit evidence, not alternative current-status owners.

[R1]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/archive/05-project/implementation-status.md
[R2]: https://github.com/Macrofold/OpenLegend/commits/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd
[R3]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/AGENTS.md
[R4]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/docs/save-and-load.md
[R5]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/packages/domain/src/events.ts
[R6]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/apps/server/src/ai-director.ts#L1169-L1410
[R7]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/apps/server/src/actor-work.ts
[R8]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/packages/domain/src/spatial.ts
[R9]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/packages/domain/src/kernel.ts#L845-L1055
[R10]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/docs/performance.md
[R11]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/docs/maintainers/performance.md
[R12]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/apps/server/src/interests.ts
[R13]: https://github.com/Macrofold/OpenLegend/blob/03ae5fb7a5ac25bcda39e6dbde274be1c9a942bd/packages/domain/src/kernel.ts#L780-L843

[UE1]: https://dev.epicgames.com/documentation/en-us/unreal-engine/ai-perception-in-unreal-engine
[UE2]: https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview
[UE3]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UAISense_Sight
[UE4]: https://dev.epicgames.com/documentation/en-us/unreal-engine/significance-manager-in-unreal-engine
[UE5]: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-mass-entity-in-unreal-engine
[UE6]: https://dev.epicgames.com/documentation/en-us/unreal-engine/state-tree-in-unreal-engine
[UN1]: https://docs.unity3d.com/Manual/CullingGroupAPI.html
[UN2]: https://docs.unity3d.com/Packages/com.unity.physics@1.4/manual/collision-queries.html
[UN3]: https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/iterating-data-ijobchunk-implement.html
[UN4]: https://docs.unity3d.com/Packages/com.unity.entities@1.4/manual/systems-entity-command-buffers.html
[GO1]: https://docs.godotengine.org/en/stable/classes/class_area2d.html
[GO2]: https://docs.godotengine.org/en/stable/getting_started/step_by_step/signals.html
[BE1]: https://bevy.org/news/bevy-0-17/#events-vs-messages
[O3D1]: https://docs.o3de.org/docs/user-guide/programming/messaging/ebus/
[FL1]: https://www.flecs.dev/flecs/ObserversManual.html
[FA1]: https://factorio.com/blog/post/fff-176
[FA2]: https://factorio.com/blog/post/fff-117
[PC1]: https://api.playcanvas.com/engine/classes/EventHandler.html

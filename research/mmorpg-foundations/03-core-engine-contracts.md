# Core engine contracts worth protecting now

These are research recommendations and preservation checks, not a replacement implementation specification. The [native technical design](../../docs/projects/native-simulation-core-tech-design.md) remains the owner of the selected native architecture. The aim is to keep future mechanisms replaceable without hiding current correctness behind a generic abstraction.

## 1. Separate identities that have different lifetimes

A reusable seed definition, a particular lived world, a spatial space within that world, a character or object, an accepted timeline, a process-local handle, a machine owner, and a client connection are different things. Collapsing them is convenient in a tiny prototype and expensive once they enter saved references and every API.

The practical invariant is not that every internal function takes a huge context object. It is that every authority boundary resolves the full identity it needs. A compact native slot is valid only inside its runtime/generation. An entity ID is interpreted inside its world. A provider job belongs to the world, actor and semantic evidence it was admitted against—not to whichever machine originally sent it. A connection authenticates a present participant; it does not define the world's existence.

Existing allocation, restore and NSC custody rules already cover important pieces. The additional design preparation is a cross-consumer audit, especially two worlds created from the same seed with equal local IDs. Include caches, SQL keys/joins, prepared observations, asset references, command receipts, navigation results, debug tools and reconnect tokens. Do not prescribe globally unique random IDs everywhere merely to avoid checking scope. Stable world-qualified identity and cheap local handles can coexist.

A migration changes operational custody. A restore may change the authority/timeline generation. A new world created from a seed is neither operation. A seed update is not permission to rewrite worlds already living against older pins. These distinctions should be fixed before more consumers copy the wrong identifier.

## 2. Keep state ownership semantic and access purpose-specific

One mutation owner per operation or quantity remains the right foundation. A transfer involving two inventories is not made correct by giving each field a separate lock. Its conserved quantity and once-only outcome still need one semantic operation. Likewise, a native result that has not passed host-current authorization remains private candidate state.

The resident representation should serve actual recurring access patterns: compact frequently accessed fields, stable handles, sparse optional records, explicit variable-length ownership and reusable bounded scratch. It need not start with a universal ECS, an archetype migration system, code generation for every possible world law or unsafe zero-copy buffers. Rust's type system helps express ownership; it does not choose an efficient data layout or make a giant lock scalable.

External consumers should ask for the facts their purpose needs, with explicit scope, coverage, source cut and disclosure. They should not reacquire a generic `WorldState` to run old helpers over everything. This is already central to NSC. The extension to preserve is that a purpose-scoped read can eventually prepare physically cold data without redefining every caller as a complete in-memory traversal.

The smallest current implementation may answer from resident records and report complete coverage. The interface should still distinguish missing data from an authoritative negative. That is a contract, not a demand to implement remote loading before a consumer exists.

## 3. Make dependency and influence information part of supported capability design

A region index only helps if an operation's actual influence can be bounded. Local collision, a long projectile, shared stock, a household relationship and a global authored law have different dependency shapes. Spatial distance alone cannot determine independence.

For each supported family, identify its semantic owner, selected subjects, inputs, writes, explicit nonspatial references, valid time interval, invalidation causes and completion obligations. Reuse existing native work, dependency and phase owners. Trusted finite families can encode these facts directly; no per-tick reflection of every field read or global dynamic dependency graph is required.

Unknown influence must expand the required coherent scope or keep that work colocated. It must not silently ignore a distant effect. Conversely, a harmless change elsewhere should not invalidate all prepared work. Granular validity matters for long model calls and paths as much as for CPU parallelism: repeatedly rejecting useful work because a world revision changed can erase the benefit of asynchronous execution.

Preparation should account for consequences that multiply: changed membership, subscriptions, observation recipients, generated records, follow-on due work, retained references and output bytes. The existing `native-work.ts` already combines several demand classes. The proposed design-preparation work is to verify coverage at the native/world boundary and identify unsupported expansions, not invent another budget system.

## 4. Keep due work and changes enumerable without scanning everything

The engine needs efficient ways to discover actual work: due deadlines, changed subjects, relevant spatial candidates and supported reverse dependencies. Each derived index needs a canonical source, maintenance owner, reconstruction rule, invalidation rule and bounded retention. A stale index may be worse than a slower query if it suppresses an actual event.

A meaningful no-op should not dirty unrelated history, request fresh cognition or force every viewer to rebuild. Equally, repeated changes inside an unpublished phase must not disappear because a key was already marked dirty. Current NSC finalization and changed-record requirements already preserve that distinction.

Global traversals are not inherently forbidden. A bounded installation, validation, explicit report or complete export may intentionally traverse its declared scope. The dangerous assumption is making world-wide enumeration the hidden prerequisite for each small command, observer, save prefix or elapsed interval. A result limit at the end does not bound that prerequisite.

## 5. Treat time, ordering and asynchronous completion as explicit inputs

The existing engine separates simulation time from wall-clock orchestration, retains owed progress and orders effects deterministically. Preserve this in the Rust port. A native worker's finish time cannot decide who acquired a contested object. A timeout cannot retroactively undo an accepted effect. A delayed result cannot execute against a new physical life merely because the string ID matches.

Do not introduce a new “everything ticks every frame” interface. Some families already support exact intervals, rates, deadlines and retained continuations. Others need detailed interaction. Each family owns its supported numerical/temporal semantics and invalidation conditions. A central scheduler must not invent an approximate evaluator simply to fit a budget.

Determinism needs a stated scope. Equivalent semantic order and saved random progression are obligations; blanket bitwise equality across architectures, compiler flags and geometry providers is not established merely by writing Rust. Before mixed-build/mixed-architecture simulation becomes a supported offer, the actual numeric and restoration contract must be qualified. For now preserve the selected same-build scope and record unsupported transitions rather than build a compatibility matrix.

## 6. Resource lifetime is part of operation correctness

An admitted operation has more than a logical ID. It holds input buffers, scratch, captures, output reservations and perhaps an external attempt that continues after its caller leaves. Finite queues require byte/count/age bounds and exact release conditions. Cancellation is a request; resource release follows actual completion or a proved stop.

This is particularly important across native tasks, database operations and paid model requests. A caller timing out must not free a slot while the underlying work is still running, allowing unbounded real concurrency behind a seemingly bounded counter. Existing NET and NSC rules already address this. Audit new physical loading and cross-world startup paths against the same mechanism.

Do not hold a compute worker while waiting for SQL, a model or a settlement that another job must perform. Keep logical ownership while releasing the scarce compute slot where supported. Avoid the opposite mistake of dropping the logical reservation and allowing an incompatible successor to run.

## 7. Preserve three different boundaries: physical truth, personal evidence, public delivery

An internal spatial query may establish that a body is present. It does not establish that a particular NPC perceived it, knows its name, remembers it, or may reveal it to a player. Reusing physical preparation is valuable; sharing private knowledge is a semantic bug.

Similarly, network interest is a delivery choice. Removing a distant object from a client's replicated set cannot remove its collisions, resource use or consequences for NPCs. A camera's culling set and a server's active simulation set have different consumers. [Epic's replication system](sources.md#s10) illustrates reusable network preparation, not a substitute for these OpenLegend distinctions.

Keep prepared/captured source validity separate from current permission at publication. Delayed context can finish computation without gaining authority to publish forgotten or revoked evidence. A physical origin rebase, residency change or host migration must not generate a new sighting, name acquisition or chronology entry by itself.

## 8. Make failure and restoration routine boundaries, not future platform magic

The smallest proof should survive clean stop/start and current-format restoration with pending work appropriately reconciled. That is already required by NSC and saves. It exercises the identities and ownership boundaries that later hosting will need, without implementing high availability now.

Distinguish accepted in-memory progress, ordinary scheduled durability and protected durable effects. Do not call a successful queue insertion a completed action, a snapshot a complete recovery protocol, or an engine replay a safe way to repeat an external purchase or model attempt. Existing receipts, non-rewindable operational authority and privacy controls remain authoritative.

Keep installation and creation separate. Restoring a world must not rerun seed rewards, spawn residents again or consume fresh initialization randomness. A later world-manager can call the existing correct boundaries; a prototype that depends on one process's globals cannot be fixed by adding Kubernetes.

## What not to build as a foundation

No new distributed actor framework, broker, generic event-sourcing engine, consensus layer, automatic schema migration system, cross-cloud abstraction, universal scheduler DSL or per-cell service is needed for these contracts. A small explicit implementation with well-owned boundaries is preferable to a speculative framework. Record the alternatives and trigger for a more expensive mechanism; do not install it merely because it appears in a successful game's stack.

The actionable preparation and acceptance scenarios are consolidated in [MSF](../../docs/maintainers/mmorpg-scalability-needs-design.md). Existing NSC conversion obligations remain in NSC rather than being copied into that register.

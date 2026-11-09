# MMORPG scalability foundations — needs design

**Status: research-backed design-preparation register, November 9, 2026. No runtime implementation, changed gameplay promise, production architecture or capacity qualification is selected by this document.**

[Research corpus](../../research/mmorpg-foundations/README.md) · [Baseline and existing coverage](../../research/mmorpg-foundations/01-baseline-and-existing-coverage.md) · [Native-core delivery](native-simulation-core.md) · [General design register](needs-design.md)

## Scope and ownership

This focused register identifies hard-to-retrofit foundations for OpenLegend's simulation-heavy persistent worlds. The working scenario is many independently evolving seed copies, vast land/sea, roughly 1,000 or more players per world and potentially thousands of world datasets. These are research workloads, not newly selected release gates or measured capacity. Older release/growth criteria remain owned by PF/PS/PD until reconciled explicitly.

MSF records own **design preparation and cross-owner reconciliation only**. Their eventual designs belong in the existing canonical spatial, world-creation, native, scheduling, product-scalability, save/data and delivery owners. Do not create a second implementation queue for NSC, BK, PF, NET, SL, PS or PD. Close an MSF record when its actual missing contract is designed or verified as already covered; link the canonical result and leave runtime/qualification status with the existing owner.

The inspected baseline is `56e9ab35a1d6ac71ccce9cf97c0f76250a78e977` on `codex/stealth-runtime-01-evidence`. The separately named `codex/native-simulation-proof` branch was unavailable on the connected remote. **First reconcile the actual implementation branch and later integrated work before writing a new design or declaring a requirement absent.** Source sampling and prior-chat retrieval were partial; the research records that boundary.

## Priority and dependency map

| Record | Design-preparation timing | Smallest useful result | Consuming owners |
| --- | --- | --- | --- |
| MSF01 | Now, before native spatial layouts and bridge types spread | Explicit precision/space contract and a small offset-scene qualification plan | Spatial/SW, NSC, save/protocol/render adapters |
| MSF02 | Contract boundary now; detailed scope soon, before vast geography is offered | Complete versus partial physical-query coverage and dependency-safe residency lifecycle | Spatial, current data/SL, NSC/PF |
| MSF03 | Now, before world lifecycle assumptions spread into new consumers | Two independent seed instances with scoped identity, creation/restore distinction and process-independent lifecycle | World creation/composition, SL, authority, NSC/PD |
| MSF04 | Now, alongside each supported native-family conversion | Reconciled cost/influence/validity coverage using existing admission and dependency owners | NSC, native work, dependency invalidation, extensible world foundation |
| MSF05 | Soon, before an unattended/continuing-world service promise | Selected advancement/suspension/reactivation promise with obligations and cost boundaries | PS/continuing lives, simulation time, native family owners |
| MSF06 | Audit boundaries now; full hosted profile before multiplayer/many-world expansion | One aggregate resource/lifetime map and honest overload/resync behavior | Scheduling, NET, BK, PF, PD and AI orchestration |

These preparation tasks can run in parallel where their inputs are known. MSF02 consumes MSF01's space contract and MSF04's influence information. MSF05 constrains which state MSF02 may safely evict. MSF03 and MSF06 meet at world startup, shutdown, recovery and shared resources. None requires implementing a cluster before completing NSC's smaller proof.

## MSF01 — Coordinate precision and space contract

- [ ] Reconcile and complete the precision/space contract in the current spatial/native owners.

**Why now:** coordinate types and conversions become embedded in every physical operation, serialized field and provider boundary. A tiny origin-centred camp can conceal precision loss until a large world is populated. Fixing a whole numeric path later is more disruptive than choosing and qualifying its contract before the native layout spreads.

**Existing coverage:** continuous metre-based placement and the selected native architecture already exist as contracts. This record does not assert a current precision bug, mandate changing every number to f64, or reopen all geometry design. Evidence and rationale: [geography research](../../research/mmorpg-foundations/04-geography-and-physical-residency.md), [Epic LWC](../../research/mmorpg-foundations/sources.md#s12), [Godot precision](../../research/mmorpg-foundations/sources.md#s13).

**Design inputs:** current `docs/spatial-world.md`, `docs/architecture.md`, the native technical design, actual spatial/native/protocol/save types and installed geometry/navigation/render conversions. Inventory the actual types before selecting a replacement. Identify intended near-term extent and the smallest mechanically meaningful spatial error; an illustrative million-metre offset is not an adopted map size.

**Required design output:** specify world/space identity, units/axes, position/vector distinctions, extent and error budget, local/global transform rules, negative/boundary rounding, attachments, saved and wire representation, and explicit conversions at geometry/navigation/render boundaries. Compare sufficiently precise global coordinates with local computation frames against chunk/space-plus-local representations. State the tradeoff and exact unsupported cases. Keep computational origins independent of ownership cells and CPU placement.

**Must preserve:** rebasing and relocation do not change physical velocity, IDs, personal source chronology, known location, ongoing effects or causal order. A renderer transform cannot become authority. Save/restore cannot lose the chosen precision or silently reinterpret a local position in a different frame.

**Acceptance scenarios:** the same small contact/support/reach/path scene near and far from the origin; negative coordinates and a cell edge; attached or carried objects; an effect crossing a frame boundary; scoped observation before/after rebase; bridge/save/reopen equivalence within declared tolerances. A geometry-only success does not qualify a narrowed protocol or saved field.

**Decisions and exclusions:** Mike's intended extent/tolerance may need confirmation when choosing final parameters. Do not introduce planetary curvature, replace the renderer/physics engine, or build a huge terrain fixture merely to answer this contract question. Canonical design plus actual-consumer qualification plan closes preparation; runtime evidence remains SW/NSC/PF work.

## MSF02 — Sparse physical residency and query coverage

- [ ] Complete the supported physical residency and coverage contract, reconciling earlier regional proposals with current native and data owners.

**Why soon:** large geography must not require eager materialization of all terrain, entities and navigation preparation. More importantly, a nonresident blocker, process or destination must not be interpreted as nonexistent. The API distinction should be preserved now even while the small proof remains fully resident.

**Existing coverage:** earlier `archive/07-technical-architecture/data-delivery-and-scale.md` already proposes bounded regional working sets, prefetch/admission and unloaded-versus-empty semantics. NSC precisely covers partial personal-history records and conservative cell influence. Current architecture documents whole-map navigation rebuilding and bounded workers. None alone establishes a complete supported partial physical-world lifecycle. See [geography research](../../research/mmorpg-foundations/04-geography-and-physical-residency.md) and [streaming evidence](../../research/mmorpg-foundations/sources.md#s11).

**Design inputs:** current spatial queries, physical record ownership, containing/attached dependencies, active processes and deadlines, definition pins, current load/save validation and navigation/geometry preparation. Reconcile MSF01, MSF04 and the selected MSF05 service profile.

**Required design output:** identify supported physical units and what their coverage proves; distinguish complete negative, incomplete/pending and unavailable answers; define bounded preparation, admission, install, invalidation and eviction. Specify dependency closure for actual operations without recursively loading every historical/social reference. Identify which consequences require continued resident work, exact deferred advancement, or an explicit service suspension. State the behavior of crossing, remote lookup, teleport/author edit, long effect and topology change when needed data is not ready.

Separate storage pages, navigation tiles, broad-phase buckets, presentation streaming and NSC ownership cells even when an initial implementation reuses a convenient grid. Specify the scope of invalidation for a local geometry edit and how a stale preparation result is rejected. Preserve existing world-hold/entity-local-wait semantics until their owners deliberately change them.

**Must preserve:** one authority per object/effect, retained action continuation and due obligations, no resurrection from late loads, no lost contained items, current-format restore, exact unknown identity and no personal awareness merely from loading physical records. A chunk cannot be evicted while required mutable state has no complete owning continuation.

**Acceptance scenarios:** a small active area with a much larger cold extent; entry toward an unloaded obstacle; a large attached body spanning boundaries; a scheduled effect entering a cold area; geometry change during preparation; cancellation/failed load; save/reopen with partial working sets; an unrelated distant record that does not force full-world hydration. Record examined work and retained bytes separately from result size when qualified.

**Decisions and exclusions:** select the first supported physical scope; do not promise every authored law can sleep or stream. No distributed database, generic cache framework, continent generator, new pathfinding algorithm or detailed migration implementation is required. Actual loading implementation waits for its consuming scope; the contract must not falsely report completeness in the meantime.

## MSF03 — Independent seed-world lifecycle and namespace closure

- [ ] Reconcile the end-to-end lifecycle and namespace contract for independent instances of a shared seed.

**Why now:** seed, world, runtime and session identities easily leak into saved references and API assumptions. A provider-managed game session is not the lived world's identity. A simple two-world scenario can expose mistakes before thousands of worlds or a hosting fleet exist.

**Existing coverage:** world composition/pins, authorized creation, exact current-format restoration, transition-local allocation, timeline fences and NSC custody already have owners. Earlier scale design already proposes world-qualified records and whole-world placement. This task is not a new world manager or new UUID standard. [World/data research](../../research/mmorpg-foundations/05-independent-worlds-and-data-lifecycle.md) and [AWS lifecycle/session limits](../../research/mmorpg-foundations/sources.md#s01) explain the remaining integration need.

**Design inputs:** creation/composition, world identity and spatial spaces, restore/authority generations, records/repositories, operational receipts, async jobs/captures, definition/asset pins, routing and public participation. Audit actual key shapes and cached lookups; do not assume the schema is missing `world_id` merely because one sampled source did not show its SQL construction.

**Required design output:** distinguish seed/version, created world, entity/space scope, timeline and operational custody, process-local handle and player/provider session. Specify create versus restore, running versus suspended/unavailable/recovering, shutdown/retirement and retry/unknown-outcome behavior through existing owners. Explain how two instances share immutable starting material but own independent mutations, histories and jobs. State which references are world-local and which intentional catalog/account relationships are global.

Include a complete boundary inventory for caches, SQL joins/keys, delayed responses, geometry/path results, receipts, save selections, client resync, metrics and administration. An internal trusted world context can establish scope; adding redundant IDs to every function is not the goal. Record minimum guarantees a later process-placement directory needs without implementing that directory now.

**Must preserve:** equal local IDs across seed copies cannot collide; changing a seed does not change an existing history; restoring does not rerun initialization; a moved host does not create a new world; late results from another world/timeline cannot act; one world's private evidence cannot leak through shared preparation; current external billing/privacy/authority cannot rewind with a gameplay save.

**Acceptance scenarios:** two seed copies with equal local entity IDs and diverged inventory/history; concurrent work against each; stale/delayed reply addressed to the wrong instance; restore one without changing the other; fresh process-local handles; seed catalog unavailable after installed pins are loaded; incomplete creation or uncertain retry without duplicate initialization.

**Decisions and exclusions:** the brief selects independent evolution, not automatic synchronization or transparent overflow copies. Cross-world travel, campaign sharing and cloning a lived history are separately designed product operations. Do not build physical copy-on-write storage, a global ID allocator, schema-per-world databases, orchestration or multi-cloud adapters unless later evidence selects them.

## MSF04 — Supported-capability cost and influence closure

- [ ] Reconcile cost, dependency and influence coverage for each actually supported native family through the existing conversion/admission inventory.

**Why now:** authored laws and new mechanics can accidentally introduce global scans, unbounded subscriptions, invalidation storms or follow-on work that defeats locality despite a compact native core. Catch the contract gap while converting the owner, not after many families assume cheap global access.

**Existing coverage:** NSC already has dirty/due selection, conservative scopes, deterministic phases and a complete caller/field conversion inventory. `packages/domain/src/native-work.ts` already combines several work-demand and installed-footprint classes. Existing dependency invalidation and native work remain authoritative. This record must not duplicate those designs or create a universal dynamic scheduler.

**Design inputs:** actual supported-family manifest, semantic mutation/acceptance owners, existing `work-budget`/native-work admission, current invalidation dependencies, captures and retention. Use [core-contract research](../../research/mmorpg-foundations/03-core-engine-contracts.md) and [cost analysis](../../research/mmorpg-foundations/02-cost-model-and-failure-modes.md); [Factorio](../../research/mmorpg-foundations/sources.md#s09) is supporting evidence, not a scheduler specification.

**Required design output:** for every conversion family, identify selected subjects, reads/writes, nonspatial dependencies, valid time, exact invalidations, effect ownership and bounded stopping points. Account for input preparation, subscriptions, actual recipients, output records/bytes, due follow-on work, retained pins and cleanup. Name any field/caller that still requires full-world materialization. Specify a conservative path for unknown/global influence and unsupported family installation, without silently narrowing accepted effects.

Reuse explicit known-family facts and existing owners. Distinguish logical demand from measured CPU cost; estimates support safe admission only within their declared assumptions. Positive cheap preflight and final state-current admission may differ; preserve current action availability/refusal behavior rather than adding false permanent impossibility from a temporary limit.

**Must preserve:** no current permission check is replaced by a cached cost/validity result; unrelated changes need not cancel useful work; relevant changes must invalidate it; worker completion order cannot select winners; a budget overflow cannot leave partially accepted effects; required outputs cannot be dropped to fit a benchmark.

**Acceptance scenarios:** one operation with many actual recipients; subscription/follow-on expansion; local edit with unrelated distant actors; a real global dependency; small and dense cohorts; withdrawal/cancellation while a task owns captures; deterministic contested result at different worker counts. Qualify complete work, including cost of maintaining indexes and conservative scopes.

**Decisions and exclusions:** exact demand limits stay in existing operational/world owners as appropriate. No per-actor threads, per-cell pools, new general event bus, reflection tracing framework or runtime DAG rebuilt every interval. If NSC implementation already covers the full contract, document that evidence and close preparation rather than reimplement it.

## MSF05 — Advancement service and reactivation contract

- [ ] Resolve the selected continuing-world service profile through PS and simulation-time owners before making an unattended promise.

**Why soon:** persistence, no human clients, physical residency, optional intelligence and elapsed world time are independent. Treating any pair as equivalent can produce false history or indefinite catch-up cost. Empty worlds can still have admitted obligations and expense.

**Existing coverage:** PS-P04–P12 and PS03 already distinguish existence, attention, continuation, exact calculated physical progression, clocks, funding and finite unattended offers. This task is a focused reconciliation for the many-independent-world scenario, not a new cognition algorithm or permission for approximate physical outcomes. See [world lifecycle](../../research/mmorpg-foundations/05-independent-worlds-and-data-lifecycle.md) and [qualification](../../research/mmorpg-foundations/08-sequencing-and-qualification.md).

**Required design output:** select the actual offered profile and classify supported work by its existing exact continuation/next-boundary rules, required detailed execution, optional unstarted initiative and unsupported combinations. State when the world clock advances, what a deliberate suspension means, which obligations keep work active, what failed dependencies do, and what evidence a returning participant can actually receive. Connect state residency and external job admission to that policy without transferring authority to an autoscaler.

Define the finite operating/funding horizon, expiry/resume behavior and reactivation workload. Bound deferred preparation; do not accumulate a debt of every optional thought that would have occurred. Recovery after unplanned downtime and deliberate service suspension must follow their actual selected policies, not a speculative “catch up by replaying all events” loop.

**Acceptance scenarios:** a useful resident activity with no human present; an approaching meaningful interruption; funding/authorization expiry; dependency unavailability; ordinary attended return without inventing absent experience; long elapsed storage with no unauthorized background progression; repeated activation and suspension without duplicated work or changed personality.

**Decisions and exclusions:** product decisions include unattended advancement promises, funding and acceptable stop behavior. Do not choose them through technical convenience. This does not block the currently supported personal-world pause behavior or NSC proof. No new calendar system, economy simulation, background scene resolver or hardcoded substitute personality is part of this foundation record.

## MSF06 — Aggregate capacity and consumer lifecycle reconciliation

- [ ] Reconcile host/world aggregate resource and consumer lifetimes before an expanded hosted workload is offered.

**Why now/soon:** individually bounded queues or character budgets can still multiply with world count. A slow client or provider can retain expensive captures; startup/restore waves can overload a host that passes a steady-state test. A faster native loop cannot correct an unbounded downstream lifetime.

**Existing coverage:** current scheduling already specifies bounded admission, byte/count/age limits, coalescing and explicit failure behavior. NSC chooses a shared host pool; NET retains capacity for still-running timed-out work; BK owns save/retention behavior. Reconcile these actual implementations instead of inventing a new admission framework. See [scheduling research](../../research/mmorpg-foundations/06-scheduling-delivery-and-overload.md), [Google overload](../../research/mmorpg-foundations/sources.md#s14), [cascade failures](../../research/mmorpg-foundations/sources.md#s15) and [AWS backlogs](../../research/mmorpg-foundations/sources.md#s16).

**Required design output:** a single resource/lifetime map for native jobs, ready work, geometry preparation, SQL lanes, inference/context work, captures/undo buffers, output queues, maintenance and world startup/recovery. Record owner and scope, admission point, byte/count/age measurement, cancellation/completion release, fairness and overflow behavior. Identify real cross-owner holes and place their designs with existing owners; do not copy every subsystem limit into a second table of operational truth.

Distinguish simulation, personal evidence and public publication. Share only target-independent preparation. Define bounded slow-consumer reset/resync through current protocol owners, preserving occurrence/receipt/revocation semantics and current permission. Current-view reconstruction must not require a full-world export or lifetime history load. Clarify aggregate AI budgets beyond per-character limits and reserve actual capacity for accepted work, saving and reclamation.

**Must preserve:** no new admission success is inferred from queue insertion; no timeout frees resources still in use; no stale context publishes private evidence; no duplicate paid request; no dropped accepted effect; optional failure does not masquerade as storage corruption; fairness does not reorder already-admitted causality.

**Acceptance scenarios:** busy and quiet worlds together; slow SQL/provider/client; source revocation while a capture waits; reconnect and cold-start waves; long-lived required receipts with routine detail expiry; cleanup competing with normal play; true overload with explicit user-facing state. Existing admission config limits must not be reported as demonstrated capacity.

**Decisions and exclusions:** PS/delivery owners retain density policy, durability/recovery promises and hosted service limits. No Redis/Kafka, autoscaler, priority DSL, per-world provider pool or automatic paid retry is prescribed. Preserve a coherent unavailable/paused state where required rather than silently degrade the game.

## Existing foundations to preserve and qualify, not redesign here

| Foundation / unresolved evidence | Canonical owner | Required reconciliation |
| --- | --- | --- |
| Resident Rust authority, bridge, private acceptance, multicore, cells, custody and adaptation | [NSC](native-simulation-core.md) | Preserve selected design and full-game conversion inventory; MSF does not mark any implementation or experiment complete |
| Meaningful perception, identity, independent detail freshness, correction and forgetting | Current attention/perception/memory owners and [PS](product-scalability.md) | Candidate sharing and physical residency never grant model/player knowledge |
| Bounded changed-record saving, retention and physical cleanup | [Production data/BK](production-data.md) | Qualify world age, actual physical bytes, dependency pins, maintenance lag and database I/O; no new indefinite event journal |
| Current-format load, identity high-water and operational non-rewindable state | [Save/load](save-and-load.md) | Qualify complete recovery cuts and mature-world restore, not only fresh saves; no compatibility infrastructure for zero users |
| Complete-path performance, dense/dispersed populations and AWS measurements | [PF](performance.md) | Use the [scenario matrix](../../research/mmorpg-foundations/08-sequencing-and-qualification.md); establish criteria before runs and preserve failed outcomes |
| External waits and actual resource termination | [NET](bounded-network-requests.md) | Reuse finite lifetime/capacity rules for new loaders and consumers; timeout is not proof of termination |
| Fleet deployment, distributed storage, hosted failure/recovery and build upgrades | [Production deployment](production-deployment.md) | Trigger later work by measured needs or a real service promise; process allocation is not regional simulation authority |

## Completion rule

A useful design closes a specific missing contract, names its existing owners, compares plausible alternatives, records remaining product decisions, supplies concrete actual-consumer acceptance and states what remains deliberately unsupported. It does not mark runtime delivery complete. A finding already fully covered on the actual implementation branch is closed with evidence, not turned into a replacement design.

No MSF item requires a new maintained test suite merely because it lists scenarios. Follow repository verification policy: documentation/content/link review for this research; later actual speed measurements on the authorized AWS worker. No cloud resources, paid inference, runtime changes or gameplay retuning were performed for this research.

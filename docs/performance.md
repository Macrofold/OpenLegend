# Runtime performance design

## Spatial cost and scheduling

[SW17–SW19](maintainers/spatial-world.md) own current spatial/presentation delivery and performance gates. The chosen backend is Recast/Detour, prepared and queried in a bounded reused worker rather than synchronously baking geometry during a command. Direct native moves remain cheap. A shared capsule/cylinder contract and exact support projection validate routes; full route cost includes that validation, not just Detour's inner search. Selective Rapier shape queries reuse static broad-phase geometry rather than synchronizing a second mutable physics world. Cold meshes, repeated profile/world replacement and resource disposal remain measured costs.

Required-data wait is technical time, not an actor action duration: preserve admitted simulation debt while excluding real preparation wait. Do not block the writer or create one worker per actor. Track queue, build/query, native admission/finalization, durable commit/projection, transport and GPU separately. Additional workers, incremental tiles and state partitioning follow measured saturation, not an assumed universal library speedup. No profile/geometry limits were raised based on benchmark medians.

Renderer load is separate: many lit sprites, proxy shadows, shadowed point lights, overlapping read-through fragments, camera updates and alpha picking can dominate. Reuse materials/masks/meshes, keep lights bounded and avoid target-by-occluder CPU raycasts. Do not cull genuine authorized details or sensory evidence to manufacture a performance result. Eligibility/readability and dynamic lighting semantics belong to [World presentation](world-presentation.md).

A further 90% whole-game reduction requires end-to-end attribution (PF00), not repeated optimization of an already sub-millisecond inner query. Existing native participant, independent-copy and experience-membership improvements remain; genuine first-acquisition work, external-event fan-out, snapshots and synchronous finalization remain distinct costs. Detailed deferred cases live in SW19/PF and maintainer TODO, not a competing performance list here.

## Navigation failure and shutdown

Navigation workers are derived computation, not persistence authority. Normal exit while active, asynchronous worker errors and synchronous launch/message-clone failures use the same bounded failure path. Failed result publication pauses on the existing storage-error boundary rather than repeatedly recomputing an uncommittable result. No new work starts while storage is faulted. Shutdown drains in-flight result publication and already-started termination before closing the store; replaced worlds fence results by existing map/timeline/action identity. Worker failure and stale retirement remain distinct metrics. A queue waiting on required data never becomes a false no-route answer.

## Selected approach

Make the cost of an interaction follow the entities and records it changes, rather than total world age, history, observers elsewhere or background activity. Keep one authoritative writer per world initially. Retain PostgreSQL durability, use the existing journal and story jobs, and optimize them before adding infrastructure.

Start by eliminating unnecessary queries and scans, batching necessary SQL, replacing idle polling with commit-triggered work, and separating gameplay publication from optional database reads. Reuse existing asynchronous I/O. Add a separate database lane, microbatch coordinator or worker only at its measured gate. More promises or threads do not reduce the amount of work, and an asynchronous query can still occupy the only connection ahead of a player command.

The requested 10,000× improvement is a direction for eliminating scaling multipliers, not a credible guaranteed speedup for one click. The deliverable is a responsive small world with explicit cost budgets, regression tests and a measured path to larger populations. Each optimization must improve its target metric without moving unbounded work elsewhere.

## Walking after the immediate fixes

1. The browser displays the destination marker immediately and sends the intention. It does not need to fetch the action catalogue first.
2. The authority validates the intention against loaded state and computes the movement transition. Due simulation work yields at deterministic step boundaries so an enormous CPU batch cannot monopolize request handling.
3. Prepare changed records, event-time audiences and permitted history capsules in memory. Persist them with the action receipt in one compact transaction. Ordinary event appends do not run edit/deletion cleanup.
4. Once commit succeeds, publish the action result and the player's affected view promptly. Conversation, usage and latest-narration database reads cannot gate the position/action update.
5. Notify eligible background consumers after commit. A plain movement start does not itself become a paid narration opportunity. Walking may produce a separate qualifying encounter or other meaningful event.

The database commit remains on the confirmed-action path. Keep the existing bounded routine-progress save policy; this design does not silently expand its crash-loss window to explicit commands. Client movement prediction is a later responsiveness improvement governed by the real-time specification, not proof that a command committed.

## Work placement and buffering

| Work                                                                       | Execution and buffer                                                                | What can be combined or deferred                                                                                                                      |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native command validation and domain effects                               | Authoritative ordered in-memory transition                                          | Compute only relevant rules; never delegate authorization to the browser or a model                                                                   |
| State, command receipts, event/audience history and required invalidations | One short atomic database transaction                                               | Bulk parameterized writes by table; coalesce final component values while retaining meaningful intermediate events and outcomes                       |
| Routine native progression                                                 | Loaded state, existing bounded dirty interval                                       | Flush by age/bytes and before an explicit durable boundary; no growing unsaved future                                                                 |
| Narrator generation, reflection and embeddings                             | Bounded asynchronous workers scheduled by committed changes and due deadlines       | Coalesce compatible pending opportunities, reuse valid caches, preserve paid-attempt identities and privacy                                           |
| Public positions, actions and HUD                                          | In-memory projection of permitted state, independently scheduled publication        | Dirty-section updates; newest compatible visual state, with reliable outcomes preserved                                                               |
| Transcript and editor pages                                                | On-demand indexed reads, scoped cache                                               | Page by cursor; invalidate affected pages on source/membership changes; do not reload for movement                                                    |
| Diagnostic capture                                                         | Bounded local pending data and asynchronous persistence                             | Replace pending snapshots of the same trace with the newest version; persist ordered distinct records in small batches when measured load warrants it |
| Historical exports and snapshots                                           | Fixed-revision input; asynchronous work outside the gameplay transaction where safe | Stream pages/bytes, limit concurrency; checkpoint publication/truncation stays transactional                                                          |
| CPU-heavy computation                                                      | Optimize work first; bounded slices, then a dedicated worker if still needed        | Send compact inputs/results or give the worker long-lived ownership; never clone the full world every tick                                            |

Locally buffered authoritative state lives on the server. Browser buffers hold presentation, drafts and unacknowledged intentions only. RAM buffers are not durable. Do not introduce a second local authoritative database or write-ahead log in the immediate fix; that changes failure and recovery semantics under [D58](../archive/05-project/open-decisions.md#d58--durability-and-storage-placement).

## Compact transactional persistence

### Fast append and deliberate edits

Use the application's unchanged/append/diff intent together with the domain draft’s append proof; caller hints alone cannot certify an unchanged prefix. For an admitted append, collect only appended events, calculate the shared event encoding once and bulk insert event rows, audiences and actor-scoped source capsules. Resolve the history schema/backfill state once at startup and cache it only after a successful transaction. Duplicate IDs and receipt conflicts must still fail or reconcile explicitly; an append hint is not permission to overwrite retained history.

Existing event edits, source corrections, forgetting and deletions use a separate branch of the same repository entrypoint. Their dependent story revocation, audience changes, vector invalidation and forgetting ledger remain atomic. Do not obtain speed by leaving stale private prose or evidence readable after revocation. Batch the affected IDs and load dependencies together instead of traversing SQL relationships once per record.

Prepare payloads before opening the transaction. Bound bulk writes by rows, bytes and database parameter limits. Persist the journal, head/CAS check, required history, job outcome and accepted mind changes under the same atomic boundary. Combine compatible metadata writes rather than adding per-feature round trips. Keep any complex PostgreSQL-specific statement inside a typed repository operation and preserve equivalent SQLite outcomes. Query count should grow with bounded batch chunks, not one query per witness or event.

Full snapshots are checkpoint work. Capture an immutable revision, serialize outside an open transaction, and install/prune only the journal prefix covered by the committed checkpoint. Never truncate based on a snapshot that has not committed. Do not move all required history projection out of the transaction initially: it is also the durable source for consolidated-away experiences and source revocation. A future asynchronous projection needs a complete durable input, replayable cursor, lag-aware reads and privacy fencing, as described by the existing journal-first specification.

### Preserve order without one global database bottleneck

Gameplay writes retain one ordered writer connection and the advisory ownership lock. First remove idle queries and redundant writes on that connection. If optional activity still materially delays commits, add a bounded auxiliary primary-database connection for inspection, diagnostics and independent background job bookkeeping. It must not attempt to acquire a second world-writer lock or mutate world state through a side door.

A second connection removes application head-of-line waiting, not database contention. Keep its transactions short, queries indexed and deadlines bounded; long scans, shared-row locks and large writes can still hurt gameplay. Required reservations and uncertain paid receipts remain durable before dispatch/settlement under their existing accounting contract. Provider calls run outside SQL transactions and outside the mutation queue.

Cross-connection reads use captured scope/revision tokens and reject stale results on return. Revocation and publication compare authoritative source versions; optional caches or indexes never expand permission. No read replica, generic task broker or large connection pool is needed for this stage.

## Triggered background work

### Narrator

The durable story-job row is the queue. When a world commit or explicit regeneration actually creates eligible queued work, return a small after-commit signal with the world/owner and next eligibility time. Arm one timer for the earliest due job, using the configured causal batching window. Avoid resetting the timer on unrelated movement or postponing an existing batch indefinitely.

The runner claims a due job durably, releases the transaction, invokes the provider only after required spending admission, and publishes under the existing source-currentness checks. It then drains or schedules the next eligible job with bounded concurrency. Source privacy and job identity come from stored records, not the in-memory notification.

On startup, perform existing uncertain-work recovery and one bounded scan for queued/due work. On resume, drain pending wakeups and recompute the next due time. On shutdown, prevent new dispatch and reconcile in-flight claims according to the existing no-paid-retry contract. A wakeup received while the runner is active must survive its final cleanup: keep a dirty generation/next-due marker and recheck it before going idle. A crash between commit and notification is recovered by the startup scan. Because all current job creation is local and authoritative, no periodic empty database poll is necessary. External producers would require an explicit notification/reconciliation mechanism later.

This removes idle work, not durable job admission. Do not dispatch from an uncommitted transition, create a second queue table, or regenerate narration merely because a UI reloads.

### Cognition, maintenance and deadlines

The proposed [internal-event integration](events-perception-and-reactions.md#7-internal-triggers-and-native-survival), [ongoing stimuli](events-perception-and-reactions.md#8-ongoing-salience-relevance-and-reminders), [actor intake](events-perception-and-reactions.md#9-reaction-intake-and-scheduling) and [consumer boundary](events-perception-and-reactions.md#10-transactions-subscriptions-and-secondary-consumers) define the inputs to this scheduling policy.

Only actors affected by newly perceived evidence, need crossings, action outcomes, relevant inventory/goal changes or elapsed deadlines become scheduling candidates. Retain recurring critical-need reminders, consolidation eligibility and sleep/day boundaries; event-driven does not mean ignoring the passage of time.

Start with small dirty-actor sets, cached scheduling state and one earliest-deadline timer. Rebuild scheduling indexes from saved state on startup; invalidate them after commit or restore. Distinguish real-time cooldown/batching deadlines from simulation-time hunger, commitments and sleep. Pausing or changing speed must not turn a game-time deadline into a stale wall-clock timeout.

The simulation timer must not await a full cognition-maintenance scheduling scan. It reports relevant changes and returns. Scheduling and model execution use bounded asynchronous capacity, with interactive work taking precedence over not-yet-started optional work. Do not cancel/retry paid work just to reclaim a slot. Per-agent spending limits do not imply unlimited host concurrency; use explicit host-wide concurrency and pending-work limits without changing billing policy.

### Browser and provider polling

Cache display-only usage totals by accounting changes and UTC month, sharing concurrent reads. Reservation, settlement (including late billing) and recovery invalidate the display snapshot only after their writes succeed. Budget admission must continue to query current durable spending; a display cache never authorizes a call.

Use scoped conversation/narration revisions on the existing SSE stream to invalidate visible history pages. Load once on opening, once on reconnect/reset and when that scope changes; fetch older pages only on demand. Keep a slow, backoff-based fallback only if the notification contract is unavailable. Hidden panels perform no history polling.

Keep presence heartbeats because they establish liveness, and retain diagnostics' existing visible-panel cadence while making reads coalesced, bounded and independent of gameplay. Provider operation polling may remain necessary where no reliable callback/stream exists; back off while idle, respect provider limits, and preserve receipt reconciliation. Do not treat all timers as defects.

## Simulation CPU and growing history

Read immutable installed attribute/sense/status definitions outside draft proxies only where admission replaces them wholesale. Never use that shortcut for mutable actor state. Bounded visibility caches must degrade to uncached exact queries at capacity rather than evicting the whole working set on each sequential scan. Cache limits restrict retained optimization state, not the number of sources perceived.

The proposed [spatial validity contract](events-perception-and-reactions.md#6-spatial-work-and-invalidation) covers event-time geometry and receiver/source invalidation; performance budgets and escalation gates remain here.

[Simulation time](simulation-time.md) owns the elapsed-integration contract. Compile participant IDs outside drafts and reuse them until a membership/component-changing command invalidates that roster; retain IDs rather than draft entities. The current finite native families capture active rates/work at the start and integrate to a relevant mechanical or authored fidelity boundary, instead of traversing the world once per game second. Status applicability and immutable static-object exposure reuse remove unrelated work. Ordering, saved randomness, real collision and source-scoped evidence remain protected, but the obsolete one-second trace is not itself a gameplay requirement. The [base time policy](worlds/base/time.md) states sampling/approximation limits and coupled-rule fallbacks.

Actor observation assembly omits private routes/state before one final deep copy. Returned records remain isolated; do not substitute an aliased public view or a persistent copy of private plans. Candidate selection and required evidence remain the existing owners' responsibility.

The remaining CPU candidates are:

- Initialize traits, minds, cognition migration and policy when loading/creating actors or changing policy, rather than scanning every actor during every save. Keep one authoritative actor-admission entrypoint and startup validation.
- Preserve the implemented draft-local source-ID index for append admission. It scans retained IDs once per mutation-owner draft array, then maintains membership on accepted additions; it does not duplicate writable experience. Non-add changes invalidate it, array replacement obtains a new identity, and raw mutable builders use live lookup. Duplicate, owner, forgotten-source and obligation checks remain required. Further batching is conditional work, not a replacement for the current per-event semantic mutation.
- Bound finalization and work using the existing elapsed-interval owner. Do not merely pass a larger duration into a legacy per-second implementation: active rates, starts/completions, consequences, observation fidelity and RNG ordering need explicit contracts. PF13 delivers the current finite families; arbitrary coupled mechanics and regional schedules remain gated.
- Profile Immer draft finalization, serialization, change detection and garbage collection separately. Structural sharing does not by itself prove unchanged large branches are cheap. Benchmark targeted freezing or narrower drafts before changing the immutability strategy; do not replace Immer wholesale without evidence.
- Maintain reusable indexes for outstanding commitments, recently changed actors and event IDs. In larger worlds add a spatial grid for perception/path candidate sets and dirty-cell invalidation; distance is a candidate filter, not an authorization rule.

Measure actual game-time progress divided by real elapsed time against `baseRatio × speed`, with headroom for commands, persistence and publication. There is no sixty/480-transition requirement. Count actual completed intervals, their game durations and CPU cost separately; a short deadline can still dominate a global scheduler. Preserve immutable snapshot sharing, append lineage and privacy invalidation. Measure initial exposure/freezing and mature-state growth, not only short pre-frozen runs.

Distinguish overload from actual process suspension. Accept a bounded prefix and release mutation ownership before yielding between batches; continue catch-up without waiting for another routine timer interval. Bound catch-up work without discarding admitted simulation debt or allowing causal reordering. A long batch must not be interpreted as offline absence merely because the next timer interval exceeds two seconds. Keep genuine suspension and player-presence semantics explicit.

Optional diagnostics, narration/provider work and optional view reads can run independently; authoritative transitions and command receipts still require ordered acceptance. Checkpoint encoding can use a captured immutable revision outside the mutation lane only with revision-safe installation. Moving CPU-heavy finalization to a Promise does not remove blocking; moving it to a worker does not increase that world's single-worker throughput. Reduce the measured traversal before adding workers or database lanes.

Keep authoritative hot state bounded by active entities and required working memory. Long-lived events, completed jobs, old receipts and UI scrollback should eventually live in their durable repositories rather than every simulation snapshot. This requires a source-preserving migration, cold lookup for IDs still referenced by obligations/forgetting and explicit restore semantics. A cache eviction is not permission to delete historical truth. Under [D59](../archive/05-project/open-decisions.md#d59--historical-retention-and-command-retry-horizon), ordinary gameplay commands replay full outcomes for 24 hours and then return `expired`; moving receipts out of hot state requires a durable server-issued epoch/controller-generation watermark that cannot admit an old ID as new. Current receipts remain unbounded until that boundary exists.

Only after these changes, consider sparse scheduling of idle actors, analytic needs advancement and sleeping regions. They must preserve threshold crossings, event-time awareness, path conflicts, action completion, stable ordering and random draws, or explicitly introduce a reviewed gameplay change. Do not lower fidelity silently to advertise a higher population.

Perception should read position and capability scalars once after movement, query local candidates, compare prior membership with sets and preserve unchanged visibility-array identities. Avoid repeatedly walking draft proxies or copying whole entity subtrees just to compare distances. The fixed-position encounter phase reuses exact audiences per source, while event admission still uses the current authoritative draft and event-time audience rules. This resolver must not escape that synchronous phase or cover speech, movement, lifecycle or sense edits. It does not skip commitment reconciliation or merge distinct events.

Scale cognitive eligibility separately from native movement. Signature-based dirty detection still costs work if every actor's visibility and history must be computed to discover that nothing changed. Prefer committed component/region invalidation and due deadlines; measure eligible-actor queue age as well as CPU time. Autonomous cognition has no actor cooldown or global thought interval; the remaining shared execution slot must be measured before changing provider concurrency. Faster simulation must not silently multiply paid dispatch.

Dense arrivals are a distinct workload. Initial visual acquisitions now have one observer-private recipient, eliminating the incorrect external witness multiplier; this is an evidence-scope correction, not dropped legitimate perception. Every real observer/source acquisition still requires storage. External speech/actions still use event-time audiences, and genuine all-to-all interactions can remain quadratic. Track events, recipient writes, history lookup and source-admission scans separately. EPR owns exposure deltas and hysteresis; PF owns commit/finalization costs. A synthetic scene's improvement does not authorize weaker perception, arbitrary event dropping or a higher supported population.

## Bounded batching, backpressure and publication

A single command on an idle healthy server should not wait for an artificial batch timer. When commands are already queued, a later microbatch can evaluate a bounded group in order against one candidate state and persist all receipts/effects together. Resolve each promise only from the committed batch. Keep one commit in flight; commands arriving during it wait in a bounded intention queue. Rejected, duplicate and conflicting IDs retain their own outcomes. Do not coalesce already-admitted discrete actions or suppress intermediate meaningful events.

Repeated unsent movement destinations may use the existing real-time design's explicit supersession contract when implemented. General action coalescing is unsafe: two eats, a pickup followed by craft, or stop followed by a new task are not interchangeable writes. Preserve fairness between players when adding multiplayer; priority must not silently reorder already-admitted causal work.

Buffers have byte/count/age limits and a defined overflow policy. Optional pending trace snapshots can be replaced by newer versions and report capture gaps. Visual updates can be recomputed from a compatible baseline. Accepted world events, source revocations, command receipts and spending records cannot be dropped. On storage pressure, stop admitting additional authoritative work and expose degraded/paused state; do not let an ever-growing queue masquerade as responsiveness. Queues smooth bursts, not sustained overload.

Player action results and their affected public state bypass the routine 100 ms debounce, with one coalesced publish per event-loop turn and bounded output. Routine motion retains an independent cadence. Keep cached usage/narrator/history sections separate so a slow optional query cannot delay basic gameplay. New fields never reveal private events or world-global activity through unscoped revision counters.

Action acceptance and first visible movement are different milestones. The current fifty-millisecond host wake admits elapsed time and publishes scoped progress without imposing that rate on rendering. Retain one-real-second routine durability and immediate consequential/authorization boundaries. Future pose coalescing must preserve reliable events and cannot advance unowed time. Device-paced interpolation and prediction are separate presentation/network choices, not simulation tick requirements.

## Scale path

World size, active population, observation density, retained history and concurrent players are independent dimensions. A thousand scattered actors and a thousand people observing the same event are different workloads. A thousand events per game minute also differs from a thousand per real minute at accelerated speed.

| Stage                                  | Intended architecture                                                                                                             | Gate before moving further                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tiny world, including long sessions    | Existing process, compact atomic writes, triggered jobs, bounded hot-state CPU, cached scoped publication                         | Small-world budgets pass with optional AI/inspection load and retained history                                           |
| Roughly 100× entities/activity         | Spatial candidate indexes, dirty actors/components, batched durable writes, deadline scheduling, scoped pages and replication     | Representative distribution and crowded hotspot both measured; explicit queue and spending capacity                      |
| Roughly 1,000× world footprint/history | Hot/cold data separation, sleeping regions where semantics permit, one worker/owner per independent world or region when measured | Worker message volume, migration/recovery and boundary semantics proven; size is not assumed to mean all entities active |
| Thousands of concurrent actors/players | Fenced ownership and region/interest-based replication following the existing scale design                                        | Real load envelope, transfers, fairness, privacy, recovery and concentrated-crowd limits established                     |

The accepted product priority is a shared world divided into regions, with independent worlds also supported. Follow the [shared-world rollout](../archive/07-technical-architecture/data-delivery-and-scale.md#3-growth-stages-and-triggers): independently queryable records and bounded regional working sets first, then measured region CPU/storage distribution. Do not add Redis/Kafka, a generalized actor framework or one worker per creature without a consuming bottleneck. Multiple logical regions may share one writer/database until ownership and boundary interactions are qualified. Independent-world placement remains useful but does not qualify one crowded shared world. Actual audience delivery may legitimately cost proportional to the audience; no index can make thousands of real recipients free.

Keep CPU-bound work in a worker only when it removes a measured event-loop bottleneck after work reduction. A worker holding an entire world's active state should receive intentions and send permitted deltas, not exchange whole-world snapshots with the main thread every frame. Async PostgreSQL/provider I/O does not need a worker. Optional path/serialization jobs use versioned compact inputs and have their results revalidated by the owner.

## Design review and tradeoffs

| Challenge                                                                           | Design response                                                                                                                             |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| The earlier diagnosis assumed a remote database                                     | Measure the actual PostgreSQL instance; local configuration is loopback. Statement counts establish amplification, not end-to-end causation |
| Making everything async still shares CPU and connection queues                      | Remove work first, bound tasks, then isolate the measured resource; never hold a gameplay transaction over model/network work               |
| Moving history behind the response could expose stale private data or lose evidence | Keep required history/invalidation atomic initially; journal-first projections need their full recovery and privacy contract                |
| Notification-only workers can miss a wakeup                                         | Durable existing jobs, after-commit notification, startup recovery, resume handling and lost-wakeup-safe draining                           |
| Bigger save batches improve throughput but worsen a single click                    | Eliminate SQL amplification first; add command grouping only for measured bursts, without a mandatory idle delay                            |
| More connections can merely move contention into PostgreSQL                         | Cap auxiliary capacity; measure locks and database time as well as application queue time                                                   |
| A one-draft tick or sparse scheduler can change the game                            | Differential replay includes intermediate events, sequence/RNG and perception/deadlines, not just final positions                           |
| A fast fresh save can conceal an aging-world regression                             | Grow historical data independently of active actors; record CPU, heap, recovery and query costs, with no silent history deletion            |
| Client prediction can hide a slow backend                                           | Measure local feedback and durable confirmation separately; backend budgets still apply                                                     |
| A fast acknowledgement can still leave the character stationary                     | Measure first changed position separately and evaluate smaller due-step batches before reaching for prediction                              |
| A 10,000× target can encourage premature infrastructure                             | Optimize and remeasure one bottleneck at a time; defer larger mechanisms until their gate is met                                            |

The immediate sequence needs no new product decision: it preserves authority, durable command acknowledgements, event retention and gameplay timing. Product-sensitive alternatives are centralized in [D58](../archive/05-project/open-decisions.md#d58--durability-and-storage-placement), [D59](../archive/05-project/open-decisions.md#d59--historical-retention-and-command-retry-horizon), and the existing D03/D09/D22 choices for overload, supported devices and density. Unresolved research belongs to [R12](../archive/05-project/research-backlog.md), not a claim that this design already supports thousands of active players.

## Eight-times spatial and sensory budget

This is the accepted optimization direction, not a declaration that dense 8x performance has passed. PF12 sequences work in the existing PF/SW/EPR owners. [Rebase and runtime evidence](verification/spatial-rebase-eightx.md) records the measured starting point.

### Define the rate before optimizing

The base conversion is sixty game seconds per real second: speed eight requests 480 game seconds of progress, **not 480 mandatory native transitions**. Use [the elapsed-interval contract](simulation-time.md), not the superseded 2.08 ms per-one-second-step assumption. The host retains an approximately eight-millisecond cooperative work budget, while a single atomic interval may exceed it. Measure actual achieved clock rate, interval count/duration, work per affected entity, command latency and debt together. Rendering targets display cadence independently; no twenty-FPS cap follows from sparse updates.

Measure actual world-time progress against monotonic elapsed wall time, separately recording explicit pauses, required-navigation waits, admitted debt, not-yet-admitted busy callback time, and queue age. A blocked native call is not completed simulation. Report cold preparation separately but also include its visible delay in command-to-movement latency. Required-data exclusions cannot be used to claim cold navigation is instant or an overloaded world sustains 8x.

Use the starter scene, the current 318-entity sensing workload, and the earlier combined 329-entity/23-surface workload as initial reproducible cases, not population limits or a promise that every spatial distribution passes. Independently vary history, observer count, moving targets, sounds, profile count, stacked floors, render coverage and geometry edits. Current evidence supports the starter's short server run; dense 8x remains unqualified.

### Strict behavior and elastic presentation

| Preserve exactly                                                                                      | May reduce or defer within this contract                                                                    |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Body clearance, intended support/floor, action timing, conservation and ordered consequential effects | Visual particles, decorative grass density, shadow detail/resolution and non-authoritative post-processing  |
| Character-specific sight/hearing and observer-private evidence; immediate revocation                  | Fewer redundant geometry queries when a conservative proof remains valid; never fewer legitimate recipients |
| Simulation time, retained admitted debt and deterministic native ordering                             | Fewer replacement-only pose publications per real second, with smooth authorized presentation               |
| Existing command durability and forgetting/accounting boundaries                                      | Batched encodings/writes within existing transactions; no enlarged crash-loss window by stealth             |
| Read-through eligibility, meaningful interactions and native survival independent of camera position  | Camera-frustum render culling and distance/detail levels that do not affect simulation or knowledge         |

Do not cap heard speech, drop visibility entries, sleep an offscreen actor, shorten sensory range, or jump over unhandled consequential boundaries to meet the target. The current straight-line acoustic family remains intentionally simpler than diffraction/reverberation; a new room-acoustic model is not a prerequisite for optimizing it.

### 1. Separate unchanged static work from changed agents

The highest-value hypothesis is to cache **dependency-valid results**, not just individual ray intersections. A stationary observer looking at unchanged objects and geometry should not rebuild the same object-visible list every simulated second. Keep static object membership/poses separate from moving actor targets. Geometry, source identity/pose/body, observer pose/anchors/range/capability and relevant detector policy are explicit invalidators; metadata/recognition remains freshly observer-scoped rather than cached with geometric visibility.

Use dirty entity/region work from the existing mutation owner and a phase-local scalar view, not a full-world deep copy into each worker. Snapshot/fork/load boundaries must not share mutable or revoked draft references. Start with unchanged static objects, then incremental cell membership. Moving entities update only affected neighborhoods. Preserve deterministic candidate/event order; unchanged arrays can be retained, while changed membership produces the same acquisition/loss semantics.

More aggressive kinetic certificates are conditional: an outside-range pair may remain rejected until a conservative distance-to-boundary divided by relative maximum speed deadline, with immediate invalidation on teleport, sense or geometry changes. Range certificates do not prove unchanged line of sight. A skipped LOS query needs a valid swept-corridor/unchanged-geometry proof; otherwise perform the exact query. Do not implement arbitrary time throttles disguised as these proofs.

### 2. Invert hearing queries around receiver volumes

For sparse sounds, index eligible listeners' 3D sensory bounds and point-query the emission origin, rather than scan every world entity. Receiver ranges may differ, so do not assume one universal speaker radius. Use a bounds tree/hierarchical structure for very large extents rather than replicating them into unbounded hash cells. Resolve event-time availability, exact anchors, distance and transmission only for conservative candidates, then deliver to every qualified recipient in the established order.

The current thresholded transmission query is implemented: an admitted attenuation factor below the requested minimum proves rejection immediately, without constructing/sorting the remaining crossings. Successful numeric answers and full-transmission callers retain canonical multiplication order. This relies on the finite family's factors being in [0,1]; amplifying authored media require new valid bounds. Do not prune a marginal multi-barrier product by a differently ordered floating-point approximation.

Next reuse geometry-only acoustic transfer for identical emission/listener anchors and relevant geometry versions, separately applying event semantics and listener thresholds. Retain historical emission origins. Batch sounds sharing the same stable sensing boundary, not merely sounds arriving in the same wall-time interval. Full/muffled detection, localization and word/identity disclosure remain distinct EPR responsibilities. Playback mixing can be budgeted independently; the awareness ledger cannot lose events because the audio mixer is full.

### 3. Keep continuous travel cheap after a route is known

Retain Recast and the exact direct-path shortcut. Prewarm common profiles and reuse compatible prepared data; no per-actor WASM instance. Coalesce identical derived requests only when geometry, body envelope, support endpoints, traversal policy and knowledge scope all match. Keep the existing bounded worker/queue, deterministic admission and stale-result fences.

For static geometry, consider a revision/body-bound certificate for an accepted segment: following a subset of a validated swept capsule corridor should not redo every identical static query. Dynamic occupancy, current capabilities, support transitions, destination validity and state-dependent effects still need their checks. Far-away geometry changes should eventually invalidate relevant tiles/segments rather than the entire world, but only after provenance and dirty-region coverage are complete.

Whole-revision construction and first-use profile stalls remain measured limits. Bring forward affected-tile preparation when edits/content cause them; extra workers can improve responsiveness/parallel throughput but cannot repair excessive total work. Do not turn a technical wait into in-world hunger or resource-order disadvantage merely to avoid a visible preparation pause. Crowds/landing fairness and special traversal remain separately scoped features.

### 4. Stop paying for old state and irrelevant status rules

The rebased host already has bounded routine persistence, frozen snapshots, append-aware history, elapsed-prefix yielding and trigger-based background work. Reuse them rather than adding a second journal or another universal queue. Profile applicability/deadline indexes for status effects and active component families; inert props must not repeatedly traverse rules that cannot apply to them. Indefinite sleep/needs/wake effects still advance semantically.

Move genuinely cold historical data off repeated finalization/serialization paths under PF08 while retaining evidence, stable IDs, pending commitments, current knowledge and explicit durable reads. PF13 already integrates selected finite rates to their next bound; it does not certify arbitrary nonlinear or coupled authored rules. Use the [running boundary catalogue](maintainers/simulation-boundaries.md) to identify further independent deadlines, valid bounds and invalidators before adding regional schedules or a general event heap. Do not discard meaningful interactions to make a latency target pass.

### 5. Separate simulation, replication and rendering rates

Simulation speed is not the display refresh rate. Use existing publication owners to coalesce replacement-only poses to a measured real-time cadence (20 Hz is a starting experiment), while rendering camera/animation at device cadence. Action acknowledgement, removals, authorization revocation and ordered story/speech/effect records must not wait for that pose throttle. Slow clients resume from authoritative scoped state plus reliable history, not a backlog of every obsolete pose. Never send an NPC's future path to make interpolation easy.

Measure browser/SSE/React work separately from the server's native budget. Existing main-thread yielding is useful; if unavoidable aggregate native work still monopolizes the host, evaluate one long-lived simulation owner worker receiving commands and sending permitted deltas, not full-world copies every tick. This is PF10's gated ownership change, not an additional competing world writer.

### 6. Batch render cost without altering the world

Prioritize shared-mesh shadow-proxy instancing, then static grass/foliage chunks, then resource atlases/instancing. Group by compatible material and spatial chunk, preserving per-instance alpha, virtual depth, orientation and reveal data. Whole-scene instancing can defeat culling; chunk by camera and light influence and retain offscreen casters whose shadows reach visible receivers.

Avoid regenerating unchanged static shadow contributions; invalidate on light, relevant geometry/caster and shadow-volume changes. Camera-dependent cascades may still require updates. Keep the principal sun and a bounded local-shadow budget. Expose reduced-quality presentation rather than silently changing bodily sight/hearing or removing meaningful nearby items. Actual hardware-GPU measurements determine shadow/material/overdraw budgets; software-rendered frame rates do not establish desktop capacity.

Further sealed-room/portal rejection, hierarchical route planners, simulation workers and regional partitioning follow evidence. A coarse region graph may conservatively reject impossible work; it cannot invent visibility, erase overlapping floors or grant hidden topology. The near-term strategy is less repeated work at one authoritative boundary, not a replacement engine.

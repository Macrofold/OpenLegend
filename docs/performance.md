# Runtime performance design

Status: accepted target design, with initial foundations implemented as recorded in Architecture; larger-world capacity remains unqualified. [Prioritized tasks and acceptance budgets](maintainers/performance.md) are the execution plan. [Architecture](architecture.md#performance-critical-path) records current behavior; [verification](verification.md#performance-investigation) records the limited measurements.

This document owns runtime work scheduling, persistence cost reduction, local buffering and performance escalation gates. The [real-time synchronization design](../archive/07-technical-architecture/realtime-synchronization.md) continues to own command/confirmation semantics, prediction, replication, reconnect and network queue contracts. The [production data design](../archive/07-technical-architecture/production-data-model.md) owns atomic data contracts; [delivery and scale](../archive/07-technical-architecture/data-delivery-and-scale.md) owns migration, recovery and partitioning. [Narration](narration-and-conversations.md) and [memory](memory-architecture.md) retain their behavioral and privacy contracts.

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

Only actors affected by newly perceived evidence, need crossings, action outcomes, relevant inventory/goal changes or elapsed deadlines become scheduling candidates. Retain recurring critical-need reminders, consolidation eligibility and sleep/day boundaries; event-driven does not mean ignoring the passage of time.

Start with small dirty-actor sets, cached scheduling state and one earliest-deadline timer. Rebuild scheduling indexes from saved state on startup; invalidate them after commit or restore. Distinguish real-time cooldown/batching deadlines from simulation-time hunger, commitments and sleep. Pausing or changing speed must not turn a game-time deadline into a stale wall-clock timeout.

The simulation timer must not await a full cognition-maintenance scheduling scan. It reports relevant changes and returns. Scheduling and model execution use bounded asynchronous capacity, with interactive work taking precedence over not-yet-started optional work. Do not cancel/retry paid work just to reclaim a slot. Per-agent spending limits do not imply unlimited host concurrency; use explicit host-wide concurrency and pending-work limits without changing billing policy.

### Browser and provider polling

Use scoped conversation/narration revisions on the existing SSE stream to invalidate visible history pages. Load once on opening, once on reconnect/reset and when that scope changes; fetch older pages only on demand. Keep a slow, backoff-based fallback only if the notification contract is unavailable. Hidden panels perform no history polling.

Keep presence heartbeats because they establish liveness, and retain diagnostics' existing visible-panel cadence while making reads coalesced, bounded and independent of gameplay. Provider operation polling may remain necessary where no reliable callback/stream exists; back off while idle, respect provider limits, and preserve receipt reconciliation. Do not treat all timers as defects.

## Simulation CPU and growing history

Preserve one-second native semantics, deterministic ordering and saved randomness while reducing repeated work. The first CPU candidates are:

- Initialize traits, minds, cognition migration and policy when loading/creating actors or changing policy, rather than scanning every actor during every save. Keep one authoritative actor-admission entrypoint and startup validation.
- Avoid constructing a map of all awareness, memories and summaries for one new experience. Use validated source-specific append admission and batch additions per affected actor, while preserving duplicate, owner, forgotten-source and obligation checks.
- Finalize a bounded set of fixed steps once where equivalence can be proved. Simply changing `advanceWorld(world, 1)` to `advanceWorld(world, N)` is unsafe: perception, commitments, conversation reconciliation, sequence increments and events currently have per-call behavior. Preserve each of those boundaries inside any new step-batch implementation.
- Profile Immer draft finalization, serialization, change detection and garbage collection separately. Structural sharing does not by itself prove unchanged large branches are cheap. Benchmark targeted freezing or narrower drafts before changing the immutability strategy; do not replace Immer wholesale without evidence.
- Maintain reusable indexes for outstanding commitments, recently changed actors and event IDs. In larger worlds add a spatial grid for perception/path candidate sets and dirty-cell invalidation; distance is a candidate filter, not an authorization rule.

Native throughput must cover 60 one-second transitions per real second at 1× and 180 at 3×, with headroom for commands, persistence and publication. A fast timer cannot compensate for a step whose CPU cost exceeds that budget. Establish an immutable snapshot boundary that lets finalization skip unchanged retained branches; preserve mutable seed/migration workflows, append lineage and privacy invalidation. Measure both initial freezing and steady-state growth, rather than counting only a short pre-frozen run.

Distinguish overload from actual process suspension. Accept a bounded prefix and release mutation ownership before yielding between batches; continue catch-up without waiting for another routine timer interval. Bound catch-up work without discarding admitted simulation debt or allowing causal reordering. A long batch must not be interpreted as offline absence merely because the next timer interval exceeds two seconds. Keep genuine suspension and player-presence semantics explicit.

Optional diagnostics, narration/provider work and optional view reads can run independently; authoritative transitions and command receipts still require ordered acceptance. Checkpoint encoding can use a captured immutable revision outside the mutation lane only with revision-safe installation. Moving CPU-heavy finalization to a Promise does not remove blocking; moving it to a worker does not increase that world's single-worker throughput. Reduce the measured traversal before adding workers or database lanes.

Keep authoritative hot state bounded by active entities and required working memory. Long-lived events, completed jobs, old receipts and UI scrollback should eventually live in their durable repositories rather than every simulation snapshot. This requires a source-preserving migration, cold lookup for IDs still referenced by obligations/forgetting and explicit restore semantics. A cache eviction is not permission to delete historical truth. Under [D59](../archive/05-project/open-decisions.md#d59--historical-retention-and-command-retry-horizon), ordinary gameplay commands replay full outcomes for 24 hours and then return `expired`; moving receipts out of hot state requires a durable server-issued epoch/controller-generation watermark that cannot admit an old ID as new. Current receipts remain unbounded until that boundary exists.

Only after these changes, consider sparse scheduling of idle actors, analytic needs advancement and sleeping regions. They must preserve threshold crossings, event-time awareness, path conflicts, action completion, stable ordering and random draws, or explicitly introduce a reviewed gameplay change. Do not lower fidelity silently to advertise a higher population.

## Bounded batching, backpressure and publication

A single command on an idle healthy server should not wait for an artificial batch timer. When commands are already queued, a later microbatch can evaluate a bounded group in order against one candidate state and persist all receipts/effects together. Resolve each promise only from the committed batch. Keep one commit in flight; commands arriving during it wait in a bounded intention queue. Rejected, duplicate and conflicting IDs retain their own outcomes. Do not coalesce already-admitted discrete actions or suppress intermediate meaningful events.

Repeated unsent movement destinations may use the existing real-time design's explicit supersession contract when implemented. General action coalescing is unsafe: two eats, a pickup followed by craft, or stop followed by a new task are not interchangeable writes. Preserve fairness between players when adding multiplayer; priority must not silently reorder already-admitted causal work.

Buffers have byte/count/age limits and a defined overflow policy. Optional pending trace snapshots can be replaced by newer versions and report capture gaps. Visual updates can be recomputed from a compatible baseline. Accepted world events, source revocations, command receipts and spending records cannot be dropped. On storage pressure, stop admitting additional authoritative work and expose degraded/paused state; do not let an ever-growing queue masquerade as responsiveness. Queues smooth bursts, not sustained overload.

Player action results and their affected public state bypass the routine 100 ms debounce, with one coalesced publish per event-loop turn and bounded output. Routine motion retains an independent cadence. Keep cached usage/narrator/history sections separate so a slow optional query cannot delay basic gameplay. New fields never reveal private events or world-global activity through unscoped revision counters.

Action acceptance and first visible movement are different milestones. A 250 ms native timer can delay the first changed position even after a fast command commit. After CPU reduction, evaluate a 50 ms native/replication cadence during active movement, processing only simulation steps actually due. Retain independent one-second routine durability and coalesced optional publications. This is a scheduling change, not permission to advance future time or multiply per-tick database queries. Adopt it only if the movement latency gain survives the increased timer/projection overhead; client prediction remains the separate network-latency option.

## Scale path

World size, active population, observation density, retained history and concurrent players are independent dimensions. A thousand scattered actors and a thousand people observing the same event are different workloads. A thousand events per game minute also differs from a thousand per real minute at accelerated speed.

| Stage                                  | Intended architecture                                                                                                             | Gate before moving further                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tiny world, including long sessions    | Existing process, compact atomic writes, triggered jobs, bounded hot-state CPU, cached scoped publication                         | Small-world budgets pass with optional AI/inspection load and retained history                                           |
| Roughly 100× entities/activity         | Spatial candidate indexes, dirty actors/components, batched durable writes, deadline scheduling, scoped pages and replication     | Representative distribution and crowded hotspot both measured; explicit queue and spending capacity                      |
| Roughly 1,000× world footprint/history | Hot/cold data separation, sleeping regions where semantics permit, one worker/owner per independent world or region when measured | Worker message volume, migration/recovery and boundary semantics proven; size is not assumed to mean all entities active |
| Thousands of concurrent actors/players | Fenced ownership and region/interest-based replication following the existing scale design                                        | Real load envelope, transfers, fairness, privacy, recovery and concentrated-crowd limits established                     |

Do not build sector sharding, Redis/Kafka, binary transport, a generalized actor framework or a worker per creature for the current world. Prefer independent worlds across processes first. Within a world, partition only where interactions can tolerate explicit boundaries. Actual audience delivery may legitimately cost proportional to the audience; no index can make thousands of real recipients free.

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

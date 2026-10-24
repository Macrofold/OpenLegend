# Scheduling, admission and fairness

Part of the [performance contract](../performance.md). Read for the matching mechanism; historical results qualify only their recorded workload and revision. [Verification](../../.agents/rules/verification.md) selects checks.

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
| Historical exports and snapshots                                           | Fixed-revision input; asynchronous work outside the gameplay transaction where safe | Stream from one stable read snapshot; bound concurrency; atomically publish checkpoint files through the existing save owner                          |
| CPU-heavy computation                                                      | Optimize work first; bounded slices, then a dedicated worker if still needed        | Send compact inputs/results or give the worker long-lived ownership; never clone the full world every tick                                            |

Locally buffered authoritative state lives on the server. Browser buffers hold presentation, drafts and unacknowledged intentions only. RAM buffers are not durable. Do not introduce a second local authoritative database or write-ahead log in the immediate fix; that changes failure and recovery semantics under the [backup/recovery contract](../../archive/07-technical-architecture/data-delivery-and-scale.md#5-backup-and-recovery) and [journal adoption conditions](../../archive/07-technical-architecture/realtime-synchronization.md#optional-journal-first-persistence).

## Triggered background work

### Narrator

The durable story-job row is the queue. When a world commit or explicit regeneration actually creates eligible queued work, return a small after-commit signal with the world/owner and next eligibility time. Arm one timer for the earliest due job, using the configured causal batching window. Avoid resetting the timer on unrelated movement or postponing an existing batch indefinitely.

The runner claims a due job durably, releases the transaction, invokes the provider only after required spending admission, and publishes under the existing source-currentness checks. It then drains or schedules the next eligible job with bounded concurrency. Source privacy and job identity come from stored records, not the in-memory notification.

On startup, perform existing uncertain-work recovery and one bounded scan for queued/due work. On resume, drain pending wakeups and recompute the next due time. On shutdown, prevent new dispatch and reconcile in-flight claims according to the existing no-paid-retry contract. A wakeup received while the runner is active must survive its final cleanup: keep a dirty generation/next-due marker and recheck it before going idle. A crash between commit and notification is recovered by the startup scan. Because all current job creation is local and authoritative, no periodic empty database poll is necessary. External producers would require an explicit notification/reconciliation mechanism later.

This removes idle work, not durable job admission. Do not dispatch from an uncommitted transition, create a second queue table, or regenerate narration merely because a UI reloads.

### Cognition, maintenance and deadlines

The [internal-event integration](../events-perception-and-reactions.md#7-internal-triggers-and-native-survival) (accepted for implementation within a named scope on 2026-09-28), [ongoing stimuli](../events-perception-and-reactions.md#8-ongoing-salience-relevance-and-reminders), [actor intake](../events-perception-and-reactions.md#9-reaction-intake-and-scheduling) and [consumer boundary](../events-perception-and-reactions.md#10-transactions-subscriptions-and-secondary-consumers) define the inputs to this scheduling policy.

Only actors affected by newly perceived evidence, need crossings, action outcomes, relevant inventory/goal changes or elapsed deadlines become scheduling candidates. Retain recurring critical-need reminders, consolidation eligibility and sleep/day boundaries; event-driven does not mean ignoring the passage of time.

Start with small dirty-actor sets, cached scheduling state and one earliest-deadline timer. Rebuild scheduling indexes from saved state on startup; invalidate them after commit or restore. Distinguish real-time cooldown/batching deadlines from simulation-time hunger, commitments and sleep. Pausing or changing speed must not turn a game-time deadline into a stale wall-clock timeout.

The simulation timer must not await a full cognition-maintenance scheduling scan. It reports relevant changes and returns. Scheduling and model execution use bounded asynchronous capacity, with interactive work taking precedence over not-yet-started optional work. Do not cancel/retry paid work just to reclaim a slot. Per-agent spending limits do not imply unlimited host concurrency; use explicit host-wide concurrency and pending-work limits without changing billing policy.

### Browser and provider polling

The [shared-network lifetime design](../projects/completed/bounded-network-requests-tech-design.md) supplies the common finite-wait mechanism for requests that ignore cancellation, including complete body consumption, cleanup, subscriptions and SDK preparation. [NET](../maintainers/bounded-network-requests.md) owns delivery. Current coalescing and stale-result checks remain necessary; they do not themselves prove a stalled wait ends. The shared owner retains capacity for unresolved underlying work instead of releasing it on timeout, and does not add another queue or automatic paid retry. Complete-view memory and hosted workload qualification remain with their existing owners.

Within one operation, repeated SDK/pipeline adoption of a physical Node stream reuses its existing ownership handle and listeners through weak identity keys; no completed stream history accumulates. Conditional exact transfer retries wait for actual predecessor closure inside the original budget, so a locally timed-out or completed consumer cannot multiply still-open transfer resources. Service-owned identity discovery remains shared while each workflow subscriber keeps its own deadline.

Cache display-only usage totals by actor, ceiling and UTC month, sharing concurrent
reads until accounting changes. Reservation, settlement (including late billing)
and recovery invalidate the display snapshot after writes and transaction
completion/rollback. Sharing is disabled inside a transaction so it reads its own
snapshot. Recent-job reads share unchanged results, with invalidation at their write boundary and
transaction completion or rollback. Budget admission continues to query current
durable spending; a display cache never authorizes a call. Scoped player views
reuse visible identities across nonphysical changes, then resolve current records
and current disclosure. [NW18](../limits/native-work.md#nw18--derived-spatial-and-read-reuse)
owns cache bounds.

Use scoped conversation/narration revisions on the existing SSE stream to invalidate visible history pages. Load once on opening, once on reconnect/reset and when that scope changes; fetch older pages only on demand. Keep a slow, backoff-based fallback only if the notification contract is unavailable. Hidden panels perform no history polling.

Keep presence heartbeats because they establish liveness, and retain diagnostics' existing visible-panel cadence while making reads coalesced, bounded and independent of gameplay. Provider operation polling may remain necessary where no reliable callback/stream exists; back off while idle, respect provider limits, and preserve receipt reconciliation. Do not treat all timers as defects.

## Bounded batching, backpressure and publication

A single command on an idle healthy server should not wait for an artificial batch timer. When commands are already queued, a later microbatch can evaluate a bounded group in order against one candidate state and persist all receipts/effects together. Resolve each promise only from the committed batch. Keep one commit in flight; commands arriving during it wait in a bounded intention queue. Rejected, duplicate and conflicting IDs retain their own outcomes. Do not coalesce already-admitted discrete actions or suppress intermediate meaningful events.

Repeated unsent movement destinations may use the existing real-time design's explicit supersession contract when implemented. General action coalescing is unsafe: two eats, a pickup followed by craft, or stop followed by a new task are not interchangeable writes. Preserve fairness between players when adding multiplayer; priority must not silently reorder already-admitted causal work.

Buffers have byte/count/age limits and a defined overflow policy. Optional pending trace snapshots can be replaced by newer versions and report capture gaps. Visual updates can be recomputed from a compatible baseline. Accepted world events, source revocations, command receipts and spending records cannot be dropped. On actual storage failure, stop authoritative admission and expose degraded/paused state. Optional memory consolidation pressure is not that failure and must not stop walking. Queues smooth bursts, not sustained overload.

Scope cooldowns and stops to the resource whose limit was observed, sharing them across dependent workers. Skip that resource's unattempted entries without retiring workers needed for independent work; an aggregate spending ceiling still governs all its consumers. Check stops before expensive preparation and exercise mixed blocked and eligible work through the actual dispatcher, including resume when the stop is durable.

Player action responses follow durable commit immediately. Their affected public state coalesces at most once per 50 ms publication-start window, publishing immediately after idle instead of adding another 50 ms after work finishes, with bounded output and cooperative work between viewers; this measured shared-load tradeoff avoids redundant projection of intermediate revisions. Routine motion retains an independent cadence. Keep cached usage/narrator/history sections separate so a slow optional query cannot delay basic gameplay. New fields never reveal private events or world-global activity through unscoped revision counters.

Action acceptance and first visible movement are different milestones. The current 50 ms host wake improves on the former 250 ms opportunity, but does not require a fixed amount of native work or a frame per game second. Retain independent one-second background saves of simulation progress and coalesced optional publications. Measure movement latency against timer/projection overhead; client prediction remains the separate network-latency option. State delivery is not a rendering-frame limit.

## Scale path

World size, active population, observation density, retained history and concurrent players are independent dimensions. A thousand scattered actors and a thousand people observing the same event are different workloads. A thousand events per game minute also differs from a thousand per real minute at accelerated speed.

| Stage                                  | Intended architecture                                                                                                             | Gate before moving further                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tiny world, including long sessions    | Existing process, compact atomic writes, triggered jobs, bounded hot-state CPU, cached scoped publication                         | Small-world budgets pass with optional AI/inspection load and retained history                                           |
| Roughly 100× entities/activity         | Spatial candidate indexes, dirty actors/components, batched durable writes, deadline scheduling, scoped pages and replication     | Representative distribution and crowded hotspot both measured; explicit queue and spending capacity                      |
| Roughly 1,000× world footprint/history | Hot/cold data separation, sleeping regions where semantics permit, one worker/owner per independent world or region when measured | Worker message volume, migration/recovery and boundary semantics proven; size is not assumed to mean all entities active |
| Thousands of concurrent actors/players | Fenced ownership and region/interest-based replication following the existing scale design                                        | Real load envelope, transfers, fairness, privacy, recovery and concentrated-crowd limits established                     |

The accepted product priority is a shared world divided into regions, with independent worlds also supported. Follow the [shared-world rollout](../../archive/07-technical-architecture/data-delivery-and-scale.md#3-growth-stages-and-triggers): independently queryable records and bounded regional working sets first, then measured region CPU/storage distribution. Do not add Redis/Kafka, a generalized actor framework or one worker per creature without a consuming bottleneck. Multiple logical regions may share one writer/database until ownership and boundary interactions are qualified. Independent-world placement remains useful but does not qualify one crowded shared world. Actual audience delivery may legitimately cost proportional to the audience; no index can make thousands of real recipients free.

Keep CPU-bound work in a worker only when it removes a measured event-loop bottleneck after work reduction. A worker holding an entire world's active state should receive intentions and send permitted deltas, not exchange whole-world snapshots with the main thread every frame. Async PostgreSQL/provider I/O does not need a worker. Optional path/serialization jobs use versioned compact inputs and have their results revalidated by the owner.

## Design review and tradeoffs

| Challenge                                                                           | Design response                                                                                                                              |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The earlier diagnosis assumed a remote database                                     | Measure the actual PostgreSQL instance; local configuration is loopback. Statement counts establish amplification, not end-to-end causation  |
| Making everything async still shares CPU and connection queues                      | Remove work first, bound tasks, then isolate the measured resource; never hold a gameplay transaction over model/network work                |
| Moving history behind the response could expose stale private data or lose evidence | Keep required history/invalidation atomic initially; journal-first projections need their full recovery and privacy contract                 |
| Notification-only workers can miss a wakeup                                         | Durable existing jobs, after-commit notification, startup recovery, resume handling and lost-wakeup-safe draining                            |
| Bigger save batches improve throughput but worsen a single click                    | Eliminate SQL amplification first; add command grouping only for measured bursts, without a mandatory idle delay                             |
| More connections can merely move contention into PostgreSQL                         | Cap auxiliary capacity; measure locks and database time as well as application queue time                                                    |
| A one-draft tick or sparse scheduler can change the game                            | Check intermediate events, sequence/RNG and perception/deadlines, not just final positions; record the accepted elapsed-time/fidelity change |
| A fast fresh save can conceal an aging-world regression                             | Grow historical data independently of active actors; record CPU, heap, recovery and query costs, with no silent history deletion             |
| Client prediction can hide a slow backend                                           | Measure local feedback and durable confirmation separately; backend budgets still apply                                                      |
| A fast acknowledgement can still leave the character stationary                     | Measure first changed position separately and bound due work before reaching for prediction                                                  |
| A 10,000× target can encourage premature infrastructure                             | Optimize and remeasure one bottleneck at a time; defer larger mechanisms until their gate is met                                             |

The immediate sequence preserves authority, durable command acknowledgements and event retention; the separately accepted elapsed-time policy supersedes the accidental fixed-second requirement. Current obligations live in the [durability/recovery contract](../../archive/07-technical-architecture/data-delivery-and-scale.md#5-backup-and-recovery) and [retention contract](../../archive/07-technical-architecture/data-delivery-and-scale.md#retention-decision-ledger). Remaining choices about [time/absence](../maintainers/decisions/world-and-play.md#d3--time-aging-and-absence), [supported devices](../maintainers/decisions/delivery-and-privacy.md#d9--minimum-client-devices) and [density](../maintainers/decisions/world-and-play.md#d22--sector-density-and-cross-border-behavior) keep their focused owners. Unresolved capacity research belongs to [R12](../research/gameplay-and-systems/delivery-and-capacity.md#r12--p1--what-does-a-sector-actually-sustain), not a claim that this design already supports thousands of active players.

## Bounded admission

World mutation lanes admit at most 256 pending operations; each PostgreSQL read/write lane admits 512. Pending work expires after five seconds, including an age check when a blocked event loop resumes. Already executing operations and transactions finish normally. HTTP limits simultaneous API handlers to four times configured player capacity and retained request bodies to 16 MiB, in addition to existing per-request body limits. Projection queue depth follows API capacity. Publication coalesces revisions within a 50 ms window measured from the preceding publication start and yields between viewers after roughly 8 ms, so a microtask chain cannot starve socket/command I/O. Disconnect cleanup retries after one second if queue admission expires; retries are bounded by admitted transports and never replay gameplay. Rejection is explicit `busy`/HTTP 503 with Retry-After; callers must check action status before retrying an uncertain mutation. Optional/background overload does not mark storage broken or pause the world. One writer, nested transaction ownership and durable receipts remain unchanged.

`OPEN_LEGEND_PLAYER_CAPACITY` defaults to 100 (configurable 1–10,000). Streams, service connections and projection caches allow three times this value, presence tracking six times, sessions max(4,096, sixteen times). These are coordinated admission settings, not measured population promises. [Verification](../verification/immediate-gameplay-limits.md#immediate-gameplay-limits) distinguishes 100 actual connected synthetic accounts from live OIDC, hosted and simulation-speed qualification.

Perception retains derived exposure inputs and prior outputs across immutable transitions. An unchanged observer/nearby-source set reuses exposure membership; changes to geometry, senses, positions, life/memory capabilities or output identity force reevaluation. Moving contacts still receive their next stationary transition. Recovery rebuilds the cache. Work metering counts actual UTF-8 event bytes; the group output allowance is 64 MB because the release-size first crowd exposure legitimately emits over 16 MB. No audience or required outcome is trimmed. The profiler refuses rejected or nonadvancing steps instead of counting them as simulation throughput.

## Native burst execution boundary

A native candidate may expose cooperative checkpoints, but not a partial world. The application keeps the writer lease while servicing I/O against the preceding snapshot; commands run after a coherent prefix is accepted. Main's boundary-limited elapsed integration and private motion slices remain the simulation contract. Host yielding does not defer required evidence to a later game tick. Finalization and other indivisible operations remain separately measured gates for further work. Current implementation is in [Architecture](../architecture.md#cooperative-native-burst-handling), work in [PF](../maintainers/performance.md#perceptionevidence-and-burst-delivery), and evidence in [Verification](../verification/integration-summaries.md#perception-performance-implementation).

## Design and review guidance

Move non-authoritative diagnostics/I/O off critical paths when ordering, durability and failure semantics permit. Coalesce replaceable snapshots, not distinct speech, acquisition events or committed effects; skipping work must preserve its required outcome. Before adding or changing worker pools or dispatch across shared resources, read [bounded batching, backpressure and publication](#bounded-batching-backpressure-and-publication). Add batching, queues, pooling, workers or hierarchy only for a justified bottleneck; bound concurrency/backlog and define cancellation/backpressure. Async syntax does not offload CPU. Preserve commit order, RNG draws, simulation steps, attribution and mechanical/disclosure checks unless an accepted behavior change explicitly allows otherwise.

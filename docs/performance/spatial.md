# Spatial, navigation and sensory performance

Part of the [performance contract](../performance.md). Read for the matching mechanism; historical results qualify only their recorded workload and revision. [Verification](../../.agents/rules/verification.md) selects checks.

## Spatial cost and scheduling

[SW17–SW19](../maintainers/spatial-world.md) own current spatial/presentation delivery and performance gates. The chosen backend is Recast/Detour, prepared and queried in a bounded reused worker rather than synchronously baking geometry during a command. Direct native moves remain cheap. A shared capsule/cylinder contract and exact support projection validate routes; full route cost includes that validation, not just Detour's inner search. Selective Rapier shape queries reuse static broad-phase geometry rather than synchronizing a second mutable physics world. Cold meshes, repeated profile/world replacement and resource disposal remain measured costs.

Idle map preparation selects up to six actual grounded body profiles when the
existing map/timeline key changes: the controlled character first, then active or
frightened characters. It prepares one at a time behind real queued requests;
an in-flight build is not preempted. Compatible real requests can share a bounded
dispatch across body profiles. Every request retains its current body/map/action/
timeline fences and the planner's existing six-profile bound. This moves CPU work
into idle preparation; unused profiles and cold replacement remain costs.
[Earlier first-use evidence](../verification/performance/02-native-render-and-route-trials.md#preparing-a-current-walking-body-before-its-first-route)
and the [complete animal campaign](../verification/performance/2026-10/animal-reductions.md)
retain their separate scope.

For navigation requests selecting a world hold (the default), required-data wait is technical preparation rather than an authored actor-action duration, but eligible real elapsed time is retained as ordinary simulation debt before a pending-route check returns. That barrier prevents integration until the current route clears; later bounded catch-up can charge hunger/deadlines and compress delayed travel. This supersedes the earlier technical-wait exclusion, which could discard an entire preceding busy host interval when a route became pending near its end. Preserve Pause/suspension/load debt clearing and current command/result fences. Deferred navigation elapsed is a subset of admitted active time, not an additional disjoint clock category. Do not block the writer or create one worker per actor. Track queue, build/query, native admission/finalization, durable commit/projection, transport and GPU separately. Additional workers, incremental tiles and state partitioning follow measured saturation, not an assumed universal library speedup. No profile/geometry limits were raised based on benchmark medians.

Renderer load is separate: many lit sprites, proxy shadows, shadowed point lights, overlapping read-through fragments, camera updates and alpha picking can dominate. Reuse materials/masks/meshes, keep lights bounded and avoid target-by-occluder CPU raycasts. Do not cull genuine authorized details or sensory evidence to manufacture a performance result. Eligibility/readability and dynamic lighting semantics belong to [World presentation](../world-presentation.md).

A further 90% whole-game reduction requires end-to-end attribution (PF00), not repeated optimization of an already sub-millisecond inner query. Existing native participant, independent-copy and experience-membership improvements remain; genuine first-acquisition work, external-event fan-out, snapshots and synchronous finalization remain distinct costs. Detailed deferred cases live in SW19/PF and maintainer TODO, not a competing performance list here.

## Navigation failure and shutdown

Completed walking routes share one owned draft per consecutive answer batch.
Each answer retains its current action/body/geometry checks, ordered reconciliation
and sequence increment; publication happens once. Native refuge answers preserve
their interleaving and existing ownership. Batching changes preparation cost, never
route authority or simulation progress.

Navigation workers are derived computation, not persistence authority. Adjacent pending characters with matching body profiles share one message within the existing 64-route allowance; complete animal comparisons and private boundary alternatives remain intact. Ordered answers publish in one mutation-lane turn with their individual current identities checked, while the existing global native barrier preserves simulation order. Normal exit while active, asynchronous worker errors and synchronous launch/message-clone failures use the same bounded failure path. Mutation-lane overload retains the single computed reply and retries publication after one real second, without rerunning navigation. Actual persistence failure pauses on the existing storage-error boundary rather than repeatedly recomputing an uncommittable result. No new work starts while storage is faulted. Shutdown drains in-flight result publication and already-started termination before closing the store; replaced worlds fence results by existing map/timeline/action identity. Worker failure and stale retirement remain distinct metrics. A queue waiting on required data never becomes a false no-route answer. Optional speculative body-build failure is counted separately and leaves a valid prepared map usable; a later actual request still performs its normal build/query and reports any real failure. Failed speculative preparation does not create an idle retry loop. If a successfully generated mesh cannot acquire its query wrapper before entering the cache, release that unowned mesh and rethrow; the generator already frees its ordinary unsuccessful result.

## Selected approach

The owner delegates overall architecture and performance decisions, including substantial redesign, and has withdrawn the arbitrary 20 ms retrieval target. Optimize complete interactions and sustained work under the [first-release and growth workloads](../../archive/07-technical-architecture/data-delivery-and-scale.md#1-what-scaling-means-for-this-product); do not freeze the present pipeline or optimize only one query. Prefer less work, bounded active state, indexed scoped access, reusable validated results and batched changes. Measure tail latency, throughput, simulation progress, relevance, memory, storage and cost together. Existing small-world budgets are early regression guides, not final capacity proof. Record material tradeoffs and history-loss choices; privacy, action correctness and meaningful source fidelity remain requirements.

Make the cost of an interaction follow the entities and records it changes, rather than total world age, history, observers elsewhere or background activity. Keep one authoritative writer per world initially. Retain PostgreSQL durability, canonical record transactions and the existing durable story jobs, and optimize those owners before adding infrastructure.

Start by eliminating unnecessary queries and scans, batching necessary SQL, replacing idle polling with commit-triggered work, and separating gameplay publication from optional database reads. Reuse existing asynchronous I/O. Add a separate database lane, microbatch coordinator or worker only at its measured gate. More promises or threads do not reduce the amount of work, and an asynchronous query can still occupy the only connection ahead of a player command.

The requested 10,000× improvement is a direction for eliminating scaling multipliers, not a credible guaranteed speedup for one click. The deliverable is a responsive small world with explicit cost budgets, regression tests and a measured path to larger populations. Each optimization must improve its target metric without moving unbounded work elsewhere.

## Walking after the immediate fixes

1. The browser displays the destination marker immediately and sends the intention. It does not need to fetch the action catalogue first.
2. The authority validates the intention against loaded state and computes the movement transition. Native actor, ambient and exposure work yields private progress, with the server returning to the event loop after roughly 8 ms of work between yield points. The mutation owner and accumulated work meter remain held until the complete elapsed-time transition publishes. Between accepted intervals the server releases mutation ownership while retaining unadvanced game time as debt. Finalization and individual operations remain indivisible; this is not a maximum step-latency promise.
3. Prepare changed records, event-time audiences and permitted history capsules in memory. Persist them with the action receipt in one compact transaction. Ordinary event appends do not run edit/deletion cleanup.
4. Once commit succeeds, publish the action result and the player's affected view promptly. Conversation, usage and latest-narration database reads cannot gate the position/action update.
5. Notify eligible background consumers after commit. A plain movement start does not itself become a paid narration opportunity. Walking may produce a separate qualifying encounter or other meaningful event.

The database commit remains on the confirmed-action path. Keep the existing bounded routine-progress save policy; this design does not silently expand its crash-loss window to explicit commands. Client movement prediction is a later responsiveness improvement governed by the real-time specification, not proof that a command committed.

## Eight-times spatial and sensory budget

This is the accepted optimization direction, not a declaration that every dense 8x workload has passed. PF12 sequences the broader PF/SW/EPR work; [PF13](../maintainers/simulation-time.md) owns the finite elapsed-time delivery. [Earlier rebase evidence](../verification/spatial-rebase-eightx.md) records the former per-second baseline; [current cadence evidence](../verification/simulation-cadence.md) records actual elapsed progress and its limits.

### Define the rate before optimizing

The bundled world’s current clock policy has a base ratio of 60 game seconds per real second: 8x requests **480 game seconds per real second**, not eight. This is an elapsed-time target, not 480 required ticks. The former 2.08 ms-per-tick arithmetic does not impose an integration cadence. Measure total CPU per game-time span, actual interval counts and command tails, leaving headroom for durable boundaries, publication and GC. Yield private native work to I/O after roughly 8 ms between checkpoints; uncontended work targets 32 ms before returning a coherent world update, with an earlier coherent return when ordinary commands or reads are waiting. [NW12](../limits/native-work.md#nw12) owns these separate targets and exceptions. Indivisible work and finalization can overrun either target; short samples do not prove a tail-latency guarantee.

Measure actual world-time progress against monotonic elapsed wall time, separately recording explicit pauses/suspension, admitted active time, the subset deferred behind required navigation, admitted debt, not-yet-admitted busy callback time, and queue age. Do not add deferred time to active time or normalize it away from wall-progress acceptance. A blocked native call is not completed simulation. Report cold preparation separately but also include its visible delay in command-to-movement latency. Retaining elapsed cannot make cold navigation instant or create CPU capacity for an overloaded world.

Use the starter scene, the 318-entity sensing workload and the earlier combined 329-entity/23-surface workload as reproducible cases, not population limits or a promise that every spatial distribution passes. Independently vary history, observer count, moving targets, sounds, profile count, stacked floors, render coverage and geometry edits. Short current-server results do not qualify every integrated sound/sight workload, long session or dense distribution; [joint evidence](../verification/hearing-main-integration.md) retains its specific scope.

### Strict behavior and elastic presentation

| Preserve exactly                                                                                      | May reduce or defer within this contract                                                                    |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Body clearance, intended support/floor, action timing, conservation and ordered consequential effects | Visual particles, decorative grass density, shadow detail/resolution and non-authoritative post-processing  |
| Character-specific sight/hearing and observer-private evidence; immediate revocation                  | Fewer redundant geometry queries when a conservative proof remains valid; never fewer legitimate recipients |
| Simulation time, retained admitted debt and ordered native effects                                    | Fewer replacement-only pose publications per real second, with smooth authorized presentation               |
| Existing command durability and forgetting/accounting boundaries                                      | Batched encodings/writes within existing transactions; no enlarged crash-loss window by stealth             |
| Read-through eligibility, meaningful interactions and native survival independent of camera position  | Camera-frustum render culling and distance/detail levels that do not affect simulation or knowledge         |

Do not cap heard speech, drop visibility entries, sleep offscreen actors or shorten sensory range to meet a benchmark. Elapsed integration must honor the accepted mechanical boundaries and explicit sampled-perception policy rather than blindly jumping through intermediate events. The current straight-line acoustic family is intentionally simpler than diffraction/reverberation; a new room-acoustic model is not a prerequisite to optimization.

### 1. Separate unchanged static work from changed agents

Current routine vision follows the [selected world’s sampling policy](../worlds/base/time.md#spatial-fidelity), without preparing future line-of-sight crossings. Exact contact and chosen watch/reach consumers remain separate. Current sight readers reuse a conservatively empty convex box or test their previous blocker first; geometry replacement invalidates both proofs. Physical body bins change only with membership, position or body extent, rather than every character-meter update. Pure native movement can complete inside the already owned transition through the ordinary command owner, retaining ordered effects and conservative invalidation for coupled work. [Animal campaign evidence](../verification/performance/2026-10/animal-reductions.md) separates these reductions from remaining population limits.

Cache **dependency-valid results**, not just individual ray intersections. A stationary observer looking at unchanged objects and geometry should not reconstruct the same static visible list every interval. Keep static object membership/poses separate from moving actor targets. Geometry, source identity/pose/body, observer pose/anchors/range/capability and detector policy are explicit invalidators; metadata/recognition remains freshly observer-scoped rather than cached with geometric visibility.

Use dirty entity/region work from the existing mutation owner and a phase-local scalar view, not a full-world deep copy into each worker. Snapshot/fork/load boundaries must not share mutable or revoked draft references. Unchanged exposure reuse and incremental source-bin membership are delivered by PW08/NP02, including old/new-neighborhood observer selection; [current query ownership](storage.md#shared-entity-queries-and-cognition-work) names the remaining roster, affected-observer and publication scans. Finer changed-target work remains gated by its measured cost. Preserve deterministic candidate/event order; unchanged arrays can be retained, while changed membership retains its acquisition/loss semantics.

Sight queries skip spatial cells outside the observer's sphere until its bounded
speed could reach that fixed cell. Live target membership means a target leaving
the cell is considered at its new cell; no distant all-pairs table is needed.
Observer teleport, range/speed changes or time reversal invalidate deadlines.
Range proofs do not prove unchanged sight. Shared endpoint-region proofs and
previous-blocker checks remove provably unchanged geometry work; uncertain rays
still run exactly. Required geometry is prepared round-robin in bounded chunks,
optionally on two bounded workers, before ordered observations are applied.
These I/O checkpoints do not advance game time or drop recipients. Static walking
corridors can prove exact collinear subsegments; terrain and current moving-body
checks retain their owners. [Spatial contract](../spatial-world.md#seeing-and-hearing-in-3d)
and [NW18](../limits/native-work.md#nw18--derived-spatial-and-read-reuse) own validity
and bounds. No arbitrary time throttle substitutes for a physical proof.

### 2. Invert hearing queries around receiver volumes

For sparse sounds, index eligible listeners' 3D sensory bounds and point-query the emission origin, rather than scan every world entity. Receiver ranges may differ, so do not assume one universal speaker radius. Use a bounds tree/hierarchical structure for very large extents rather than replicating them into unbounded hash cells. Resolve event-time availability, exact anchors, distance and transmission only for conservative candidates, then deliver to every qualified recipient in the established order.

The current thresholded transmission query is implemented: an admitted attenuation factor below the requested minimum proves rejection immediately, without constructing/sorting remaining crossings. Successful numeric answers and full-transmission callers retain canonical multiplication order. This relies on the finite family's factors being in [0,1]; amplifying authored media require new valid bounds. Do not prune a marginal multi-barrier product by a differently ordered floating-point approximation. The integrated [graded hearing implementation](../hearing-and-speech.md) retains its validated candidate/transfer rules rather than copying this older binary threshold policy.

Reuse geometry-only acoustic transfer for identical emission/listener anchors and relevant geometry versions, separately applying event semantics and listener thresholds. Retain historical emission origins. Batch sounds sharing the same stable sensing boundary, not merely sounds arriving in the same wall-time interval. Full/muffled detection, localization and word/identity disclosure remain distinct EPR responsibilities. Playback mixing can be budgeted independently; the awareness ledger cannot lose events because the audio mixer is full.

### 3. Keep continuous travel cheap after a route is known

Retain Recast and the exact direct-path shortcut. Prewarm common profiles and reuse compatible prepared data; no per-actor WASM instance. Coalesce identical derived requests only when geometry, body envelope, support endpoints, traversal policy and knowledge scope all match. Keep the bounded worker/queue, deterministic admission and stale-result fences.

For static geometry, consider a revision/body-bound certificate for an accepted segment: following a subset of a validated swept capsule corridor should not redo every identical static query. Dynamic occupancy, current capabilities, support transitions, destination validity and state-dependent effects still need their checks. Far-away geometry changes could invalidate relevant tiles/segments rather than the entire world only after provenance and dirty-region coverage are complete. [PF12.6](../maintainers/performance.md#pf12--eight-times-spatial-and-sensory-execution) evaluated these options: cheap warm queries, rare exact segment repeats and no production geometry-edit caller did not justify implementing them. Reopen only for a changed workload, not as unfinished accepted navigation delivery.

Whole-revision construction and first-use profile stalls remain measured limits. Bring forward affected-tile preparation when edits/content cause them; extra workers can improve responsiveness/parallel throughput but cannot repair excessive total work. The retained clock policy now deliberately charges eligible technical waiting time through ordinary catch-up, including needs/deadlines and delayed travel. Keep that fairness change explicit; it preserves elapsed time rather than removing preparation work or hiding its visible pause. Crowds/landing fairness and special traversal remain separately scoped features.

### 4. Stop paying for old state and irrelevant status rules

The host already has bounded routine persistence, frozen snapshots, append-aware history, bounded yielding and trigger-based background work. Reuse them rather than adding a second journal or universal queue. Conservative status participation and finite elapsed rates are implemented; richer applicability/deadline indexes remain candidates. Indefinite sleep/needs/wake effects still advance semantically.

Move genuinely cold historical data off repeated finalization/serialization paths under PF08 while retaining evidence, stable IDs, pending commitments, current knowledge and explicit durable reads. The [boundary catalogue](../maintainers/simulation-boundaries.md) distinguishes integrated finite laws from general net-flow coupling, local schedules and analytical dormant worlds. An interval cannot skip an unmodeled interaction merely because a formula produces a plausible final number.

### 5. Separate simulation, replication and rendering rates

Simulation speed is not display refresh rate. Current public-state publication uses the leading 50 ms window described above. Further pose-only coalescing remains [PF12.7](../maintainers/performance.md#pf12--eight-times-spatial-and-sensory-execution), distinct from that delivered shared-publication mechanism. Camera/animation render at device cadence, normally targeting 60 FPS or display refresh. Action acknowledgement, removals, authorization revocation and ordered story/speech/effect records must not wait for a pose throttle. Slow clients resume from authoritative scoped state plus reliable history, not a backlog of every obsolete pose. Never send an NPC's future path to make interpolation easy.

Measure browser/SSE/React work separately from the server native budget. If optimized aggregate work still monopolizes the host, evaluate one long-lived simulation owner worker receiving commands and sending permitted deltas, not full-world copies every tick. This is PF10's gated ownership change, not an additional competing world writer. Async syntax does not offload CPU.

### 6. Batch render cost without altering the world

Shared sprite-shadow submissions and grass instancing are delivered under [SW18.13/SW18.15](../maintainers/spatial-world.md); their named M1 Pro workload does not close all frame tails or lower-end-device qualification. Reuse those implementations and select further model/reveal batching or resource atlases from residual profiles, rather than rebuilding shadow and foliage batching. Group by compatible material and spatial chunk, preserving per-instance alpha, virtual depth, orientation and reveal data. Whole-scene instancing can defeat culling; chunk by camera and light influence and retain offscreen casters whose shadows reach visible receivers.

Avoid regenerating unchanged static shadow contributions; invalidate on light, relevant geometry/caster and shadow-volume changes. Camera-dependent cascades may still require updates. Keep the principal sun and a bounded local-shadow budget. Expose reduced-quality presentation rather than silently changing bodily sight/hearing or removing meaningful nearby items. Actual hardware-GPU measurements determine shadow/material/overdraw budgets; software-rendered frame rates do not establish desktop capacity.

Further sealed-room/portal rejection, hierarchical route planners, simulation workers and regional partitioning follow evidence. A coarse region graph may conservatively reject impossible work; it cannot invent visibility, erase overlapping floors or grant hidden topology. The near-term strategy is less repeated work at one authoritative boundary, not a replacement engine. [PF13](../maintainers/simulation-time.md) owns the current finite elapsed-time slice and its specific remaining work.

## Hearing review and lower routine-history cost

The September 27 continuation changes the base world's [sighting policy](../memory-architecture.md#encounters-sensory-detail-and-reminder-continuity): ordinary animal/scenery visibility does not create stored onset records; person sightings remain evidence without automatic reasoning. Earlier statements about preserving every encounter describe the earlier behavior-preserving optimizations. Existing stored history, exact current visibility, event-time hearing fragments and meaningful action/detail events remain intact.

Computed navigation results use the existing routine-progress buffer after the action/request has committed. They no longer require a second save before walking can begin. A crash before the next ordinary save can lose that computed route; restart prepares it again from the saved request. Late results cannot publish after a storage failure or across map/timeline changes. Explicit action acknowledgments, accounting and source revocation retain their existing durability. Results of background jobs (AI and other asynchronous work) that return the identical world and have no receipt, response job or invalidation skip an empty synchronous save.

Diagnostics now coalesce for 100 ms and drain at most 64 call snapshots through bounded multi-row writes, retaining the existing backlog/retention limits and shutdown drain. Their optional delay does not apply to accounting. The September 27 text-encoded multi-statement experiment was discarded because its benefit did not justify the extra SQL encoding path. October 14 implements the separate parameterized approach described in [Storage execution](storage.md#storage-execution); the larger [PF15](../maintainers/performance.md#pf15--save-round-trip-batching) proposal and four-round-trip target remain open. Required save work remains atomic. Since the ordered-save change, simulation progress uses [background saves](../save-and-load.md#background-and-synchronous-world-saves) that no longer block the next mutation while awaiting storage; commands, AI results and other effects still use synchronous saves that hold the queue until written, and smoothness under storage/host stalls is **not yet qualified** ([evidence](../verification/ordered-async-saves.md)). [Current measurements and limitations](../verification/performance/05-september-history.md#hearing-review-continuation-september-27) retain cold/warm latency, offered speech, host load and remaining acceptance.

## Design and review guidance

Spatial candidate bounds must conservatively cover the whole relevant interval, including motion and height crossings, before exact evaluation. Preserve canonical ordering and tie handling when pruning: a faster candidate list must not change layered effects, randomness or committed results. Measure cold rebuilds and concentrated edits as well as warm reuse; one small matched scene does not qualify population capacity or retained memory. For cached future-event predictions, a position tolerance does not prove equivalent timing or identities. Compare warm reuse with current-format cold restoration; retained time origins can change downstream results even when geometry remains within tolerance.

Before replacing a fast path with a shared helper, compare the conditions each actually handles; broader usefulness does not prove replacement coverage. In the selected checks, include a previously cheap case, the newly supported case and a meaningful refusal. Record whether each finishes directly or now requires deferred preparation, not only whether it eventually succeeds or its warm timing. Preserve a useful shortcut until the replacement covers its valid cases and cost, or document a justified tradeoff. [PX01's ramp review](../verification/first-threat-encounter.md#px01-navigation-review--october-6-2026) demonstrates why: walking across ground edges did not cover entering a ramp inside a larger ground patch, so a successful route still regressed into unnecessary mesh preparation.

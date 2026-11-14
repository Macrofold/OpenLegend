# Scheduling, cognition, delivery and honest overload

The primary requirement is not “use more threads.” It is to prevent optional, delayed or disproportionate work from exhausting the capacity needed for accepted gameplay and truthful recovery. The existing [scheduling contract](../../docs/performance/scheduling.md), [NSC design](../../docs/projects/native-simulation-core-tech-design.md) and NET lifetime owner already provide substantial machinery. This chapter identifies cross-owner checks, not a new scheduler implementation.

## Shared resource bounds must cover the whole host

One bounded pool per host is already selected for native compute. Do not multiply it by worlds, cells, actors or subsystems. The same principle applies to queued bytes, captures, database connections, geometry jobs and external requests: individually small limits can sum to an unbounded host burden when world count grows.

Account for useful service and waiting separately. A job awaiting SQL should not occupy a native compute worker, while a still-running timed-out native or provider operation must retain its real capacity reservation. A slow world should not monopolize every ready slot just because its queue is longest. Existing round-robin/coherent-boundary scheduling is a starting point; actual fairness and priority must be qualified under mixed workloads.

Avoid making every subslice a job. Small work stays inline. Large work needs bounded coherent stopping points so a command or capture is not trapped behind an enormous batch. Also reserve enough operating headroom for saving, cleanup and recovery. No fixed CPU percentage is selected here; the required reserve is measured against actual obligations.

[Google's resource-aware overload discussion](sources.md#s14) supports this distinction between request counts and demand. OpenLegend's application is to budget native work, retained bytes and dependency service, not merely HTTP requests or logged-in players.

## Cognition is an asynchronous consumer with real aggregate cost

This research does not redesign cognition, prompts, senses or NPC personalities. Its foundational requirement is that existing AI orchestration remain separate from deterministic native progression and bounded across actors and worlds. An NPC's chosen activity can continue through supported native rules without a new model call at every movement sample. The existing product direction already preserves that distinction.

Budget both inference and its surrounding work: selecting evidence, loading cold records, assembling context, retaining source bindings, parsing outputs, validating applicability and publishing accepted effects. Moving the model to another GPU does not remove these host costs. A per-character spending cap does not establish an affordable unattended community or a host-wide concurrency limit.

Under pressure, optional unstarted opportunities may be deferred/coalesced according to their current contract. Already-started paid work cannot be canceled and restarted merely to improve priority. Ordinary unrelated world advancement must not invalidate a still-meaningful response, while privacy, physical-life and action-target changes retain their actual fences. Migration changes routing, not semantic identity or a paid attempt's existence.

Distinguish provider unavailability from physical impossibility. A missing model response must not manufacture a decision or silently declare that a world continued its promised autonomous life. The unattended service owner decides which obligations require a coherent hold, an explicit unavailable state, or supported continued native action.

## Publication has a separate workload from simulation

A physical event happens once, can be received differently by many observers, and can produce different permitted outputs for players. Treat these as separate stages. Reuse target-independent preparation where valid; do not build each viewer's full world just because one source moved. Preserve per-observer identity, detail freshness, chronology and current authorization.

There are at least four independently bounded products: current visual state, distinct meaningful occurrences, query/history pages, and long-running diagnostic/export captures. The newest compatible position can often replace an unsent older position under its existing protocol. A trade result, speech occurrence, source revocation or accounting receipt cannot be silently replaced by a newer unrelated message.

[Epic's replication graph](sources.md#s10) and [EVE's cosmetic fan-out work](sources.md#s05) demonstrate reusable delivery preparation and separation of nonmechanical presentation. Neither permits a generic shared “everyone nearby knows this” record. NPC observation is not browser replication, and rendering culling is not physical simulation culling.

A slow client must have an explicit bounded reset/resync/disconnect path rather than pinning every accepted capture forever. Resync must prepare a bounded permitted view at a coherent cut, not expose the raw canonical world or require hydrating all history. Reconnects and initial exposure can be more expensive than steady state and need separate qualification.

## Define overload before selecting an autoscaler

Distinguish an operation not yet admitted, private native preparation, accepted ordinary live progress, protected durable success and optional presentation. Each has a different permissible response to overload.

For unadmitted work, explicit busy/unavailable responses can protect the system. For an already accepted consequential effect, queue overflow cannot erase the obligation. Protected operations retain their durable barriers. Optional diagnostics can report capture gaps. Latest-state presentation can use the selected reset/coalescing behavior. Gameplay fidelity cannot be secretly reduced to make a dashboard green.

Current scheduling already has finite admission lanes and byte/count/age rules. The new requirement is to audit the combined path when adding physical loading or many-world startup, rather than create yet another queue with an unrelated allowance. In particular, measuring only a native pool ignores an unbounded upstream HTTP queue or downstream capture/writer backlog.

[AWS's backlog analysis](sources.md#s16) is relevant because a queue can preserve work while making it arrive too late to be useful. [Google's cascade analysis](sources.md#s15) explains why retries and increased concurrency can make an overloaded dependency worse. An automatic retry is not a safe default for commands with uncertain effects or paid inference.

## Density and congestion remain product questions

A fixed-size cell, regional database or extra server does not make all interactions in a crowded festival independent. Dense physical coupling and many legitimate listeners can still demand substantial work. The engine should expose honest resource/latency information and support the current admission semantics; the product decides acceptable congestion behavior.

Do not silently import EVE's time dilation, spawn extra copies of a lived town, teleport entrants, shrink hearing distance, lower NPC intelligence, discard harm or delay an accepted action into a different fictional moment. Those are material gameplay choices, not neutral performance settings. [TiDi](sources.md#s04) is useful precisely because it makes slowdown a visible semantic policy rather than pretending overload disappeared.

The earlier shared-world capacity targets remain unqualified. A queue that excludes the offered target population is not proof that the target passed. Dense-encounter acceptance must say who is actually active and what they are doing, not count connected idle sockets.

## Positive design opportunities

These foundations support more than fault avoidance. Separating irrelevant work allows richer local encounters without charging every distant character for them. Good continuation lets residents pursue meaningful tasks rather than repeatedly deliberate. Bounded publication lets physical responsiveness remain clear while optional narration arrives later. Stable identity and explicit reactivation make returning to a particular changed community possible without reconstructing an invented history.

The design-preparation owner is [MSF04](../../docs/maintainers/mmorpg-scalability-needs-design.md#msf04--supported-capability-cost-and-influence-closure) for capability coverage and [MSF06](../../docs/maintainers/mmorpg-scalability-needs-design.md#msf06--aggregate-capacity-and-consumer-lifecycle-reconciliation) for aggregate cross-owner contracts. Current subsystem work and numeric operating gates remain where they already belong.

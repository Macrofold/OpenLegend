# Code-grounded pressure points and experiments

[Research index](README.md) · Companion to the [repository audit](repository-audit.md). Static inspection at `3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238`; no profiling or runtime changes were performed for this report.

## 1. External-event audience discovery starts with a whole-world candidate scan

In [`events.ts`](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/packages/domain/src/events.ts#L64-L120), normal `emit` calls `eventAudience` without a candidate array. For an external source, its default candidate source is `Object.values(world.entities)`, followed by memory/life/capability checks and the relevant hearing or sight query.

**Observed implication:** candidate enumeration grows with world entity count for this path, even when only a few neighbors can perceive the event. This is not proof that every candidate receives an expensive ray query, or that every command is quadratic: cheap exclusions and geometric range rejection already remove work. Required processing for genuine recipients is a separate cost that cannot simply be capped away.

**Proposed experiment:** hold local recipients and emitted events constant; multiply distant inert entities. Measure candidate enumeration, exact tests, allocation, evidence mutations and commit bytes separately. Then compare a conservative spatial candidate index against a small exhaustive oracle. No legitimate recipient may disappear. Coordinate with the existing EPR/PF/SW owners rather than creating a second audience system.

## 2. Private acquisition is already distinct from outward events

The same file's `encounterEmitter` emits with private scope. `recordEvent` preserves event-time origin and per-event audience; its recipient loop constructs scoped experience through `mutateExperience`. Intended recipient detail is not unconditionally revealed to every observer.

**Preserve:** noticing an object is not an observable announcement to everyone nearby. Do not optimize by broadcasting an acquisition event to a public queue or by replacing historical audience with current conversation membership. Shared source work is possible; identical private evidence for all recipients is not assumed.

**Proposed experiment:** two listeners with different visibility and recognition hear the same speaker. Move them and edit geometry before recall. Compare resulting evidence and generated context to the event-time baseline.

## 3. Sight-cache sizes are optimization bounds, not population limits

[`perception.ts`](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/packages/domain/src/perception.ts#L96-L174) defines memoization limits of 128 observers and 512 target transforms per observer. Uncached targets still take the exact geometry path. Frozen geometry/poses, observer radius and eye/target heights participate in reuse. The implementation avoids cycling every cached entry out merely because a dense target scan exceeds capacity.

**Interpretation:** these numbers do not mean the engine permits only 128 observers or only 512 visible objects. They identify useful cache-pressure boundaries for testing. Changing them may trade memory against CPU; neither a larger cache nor a smaller cache changes the legitimate audience by itself.

**Proposed experiment:** compare cold/warm 127/128/129-observer and 511/512/513-target fixtures, stationary and moving. Add geometry replacement and sense/body changes. Inspect tail latency, cache retention and correctness, not only average hit rate.

## 4. Hearing already rejects distance before barrier work

[`withinHearingRange`](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/packages/domain/src/perception.ts#L175-L202) computes three-dimensional ear/source separation before acoustic transmission. Current full-speech admission requires sufficient transmission and distance; indistinct sound is deliberately not inserted into a full-text audience while graded auditory contacts remain outside this slice.

**Preserve:** a faster hearing index must not convert muffled sound into intelligible speech or disclose a hidden identity. This is a detail/knowledge contract, not simply a Boolean network subscription.

**Proposed experiment:** separate far-away rejection cost from close, obstructed and stacked-floor cases. Include the same utterance with differently capable receivers. Evaluate exact tests and authorized payloads independently.

## 5. Actor memory deduplication and vector candidate assembly deserve age tests

`appendMemory` checks the actor's existing records for an event/kind duplicate before the shared experience mutation. The inspected [`VectorStore`](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/apps/server/src/vector-store.ts) transmits eligible source IDs/revisions as JSON and joins them before exact ranking.

These are clear, scoped implementations. Their future cost depends on actual bounded record counts and candidate windows; the source alone does not establish a bottleneck. Measure histories of different ages while holding the requested task fixed. Separate JavaScript construction/encoding, database join, distance calculation, filtering and result publication.

A database-side indexed eligibility relation may eventually avoid large repeated candidate payloads. It must preserve current source revisions, forgetting and actor scope. An unfiltered global ANN top-k is not a semantics-preserving replacement.

## 6. Root authority is both a protection and a future placement boundary

[`WorldService`](https://github.com/Macrofold/OpenLegend/blob/3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238/apps/server/src/world-service.ts#L176-L260) serializes mutations and holds one saved world. Its local-player initialization, controlled-actor history and world-wide presence/pause behavior identify the first multiplayer review surface.

Keep the serial mutation owner while proving two-human control, privacy and retry behavior. First remove whole-world work from routine operations and introduce bounded readers behind existing semantics. Splitting authority before defining conserved-resource and transfer boundaries would exchange a measurable local limit for distributed correctness problems.

The larger root type does not prove that every update copies or persists everything: current structural sharing and incremental journals matter. Profile finalization, serialization, SQL, projection and client work independently before replacing the data representation.

## Follow-up ownership

These experiments belong with [performance](../../../docs/maintainers/performance.md), [spatial work](../../../docs/maintainers/spatial-world.md), [EPR](../../../docs/maintainers/events-perception-and-reactions.md), [cognition](../../../docs/maintainers/cognition-redesign.md) and [production data](../../../docs/maintainers/production-data.md). This document adds static evidence and proposed measurements; it neither implements an optimization nor marks an existing acceptance gate complete.

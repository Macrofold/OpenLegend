# Vast geography, precision and physical residency

Vast land and sea create a different scaling problem from a crowded camp. The early design requirement is to avoid making the full world's extent, geometry and object population prerequisites for every local operation. This chapter develops interface needs; it does not select a terrain format, navigation algorithm or distributed spatial database.

## Coordinate precision is a foundation, not a late visual polish task

OpenLegend's current spatial contract uses continuous world coordinates in metres. That is a useful unit convention, but it does not establish precision through every provider, typed array, native bridge, saved field and GPU conversion. A double-precision host scalar can still be narrowed by a geometry API or native vector representation.

[Godot's documentation](sources.md#s13) explains the loss of floating-point resolution away from the origin. [Epic's large-world work](sources.md#s12) demonstrates that precision changes cross multiple engine systems and interfaces. These are reasons to audit the entire path now, not reasons to adopt either engine.

For illustration, IEEE single-precision spacing around 1,000,000 metres is 0.0625 metres: `2^(floor(log2(1000000))-23)`. That is an arithmetic example, not OpenLegend's selected world extent or a claim that any installed provider currently fails there. The acceptable error depends on body/support/contact tolerances, intended reach, navigation and authored scale.

A later design should compare a sufficiently precise global representation with bounded local computation frames, and a space/chunk-plus-local-position representation. Neither implies one CPU per coordinate cell. Do not select a global f32 representation merely because a physics API accepts f32, or make every unrelated scalar f64 without an actual need.

Required contract questions include units, axes, space identity, valid extent, negative coordinates, boundary rounding, local/global transforms, attachment transforms, persistence/wire encoding and error budget. Rebasing is representational: it must not change velocity, wake an actor as though moved, lose a projectile, alter saved location, or invalidate a model's evidence merely because the origin changed. Persistent handles and personal evidence must not store accidental addresses in a transient local frame.

The smallest useful qualification is a familiar small scene repeated near the origin and at a large declared offset. Include body contact, a support edge, a path, a moving effect, an attached item, a scoped observation and save/reopen. This exposes whole-path narrowing without constructing an enormous populated continent.

## Five meanings of “not here” must stay separate

1. No canonical entity or terrain exists at the queried place.
2. The relevant physical records exist but are not resident in this process.
3. Data is resident elsewhere or covered only by a time-bounded read overlap.
4. A client does not receive or render it.
5. A character has not perceived or retained knowledge of it.

A query needs to distinguish a complete negative from incomplete coverage. Loading physical records cannot create personal awareness. Evicting physical state cannot forget a character's knowledge. Client streaming cannot stop world consequences. Current native cold-history rules solve some analogous distinctions for personal records; they do not automatically define partial physical-world execution.

[Earlier regional architecture](../../archive/07-technical-architecture/data-delivery-and-scale.md) already proposes bounded active-state loading and warns against treating unloaded regions as empty. The needed work is a precise current contract and supported scope, not a newly discovered concept or a replacement for NSC.

## Residency must follow actual obligations, not only nearby players

An NPC may continue a chosen task without a human watching. Fire, travel, carried objects, a due obligation or an approaching projectile may require particular state. A purely player-distance loading rule can therefore be wrong even when it works for client rendering. [World Partition](sources.md#s11) is useful evidence for streaming mechanics, not evidence that such a rule meets autonomous simulation semantics.

For supported families, identify which state must remain available to advance correctly and which can be prepared lazily. Static terrain and immutable definitions may have a different caching lifetime from changing bodies. A dormant physical record may remain cold only when its pending consequences are represented correctly elsewhere or its advancement is explicitly suspended under the world's service policy. “Persisted” is not proof of either condition.

Do not require the complete future streaming implementation for the native proof. Instead keep read/install boundaries explicit and refuse unsupported partial coverage. A later bounded loader can supply the same requested facts. This avoids converting every mechanic from unconditional in-memory access after large content has already accumulated.

## Dependency closure should be sufficient, not contagious

A carried container has physical contents, attachment and custody dependencies. An actor's old acquaintance on another continent is a stable reference, not necessarily a reason to load that acquaintance's body and every social relationship. Blindly following all references can turn a local region load into the whole world.

The design should classify references by purpose: required for the active mechanical operation; required for exact current source/permission validation; immutable definition; separately queried historical evidence; or a locator that can remain unresolved until used. This is a classification in existing owners, not a new graph database requirement.

Loading and eviction need exact ownership and completion boundaries. Pending mutations, active effects and required references cannot disappear during eviction. A delayed fetch must not overwrite newer accepted state or resurrect a removed object. Bounds cover loaded bytes, concurrent preparations, retained old cuts and repeated work, not just the number of regions requested.

## Spatial queries and preparation units need replaceable boundaries

Keep geographical identity, broad-phase indexing, storage paging, navigation tiles, client streaming chunks and execution ownership distinct. They may initially share a convenient grid, but their optimal sizes and invalidation rules can differ. Baking a storage partition or CPU number into every position forces unnecessary coupling.

The current architecture documents whole-map navigation rebuilding and bounded workers. That is an explicit scope limit, not a proof of a defect on the current small map. Before large editable geography is offered, specify affected-area invalidation and the behavior of a request spanning prepared and unprepared areas. Rebuilding a world navigation mesh for every local construction edit is a foreseeable structural cost even if the current tiny map makes it inexpensive.

Long-distance planning may later need different preparation from immediate movement. This research does not choose hierarchical pathfinding or redesign navigation. It requires that the consumer can represent pending, partial, invalidated and unavailable preparation without fabricating a clear path, a wall or a false no-route answer. Existing world-hold versus entity-local wait policies remain with their current owners until separately changed.

## Borders, large bodies and nonlocal effects

Streaming boundaries must include actual body extents, swept motion, effect reach and named dependencies. A ship, building, long-range sense or shared process can cross many small cells without being duplicated into several authoritative objects. A stationary observer near a boundary must not miss an effect because only its home cell was queried.

Smaller cells can increase overlap, bookkeeping and transfers. They do not make dense mutually interacting actors independent. NSC already defines one effect owner and conservative scope joining; residency must use compatible coverage rather than a second conflicting boundary scheme.

The positive opportunity is a large world where traveling, building and returning feel continuous while the engine pays primarily for relevant active work. Achieving that requires honest missing-data and continuation contracts before clever distributed placement.

## Design handoff

[MSF01](../../docs/maintainers/mmorpg-scalability-needs-design.md#msf01--coordinate-precision-and-space-contract) owns precision preparation. [MSF02](../../docs/maintainers/mmorpg-scalability-needs-design.md#msf02--sparse-physical-residency-and-query-coverage) owns the current partial physical-world contract. Both first reconcile any already-completed implementation work. Neither authorizes a new renderer, geometry engine, grid-wide migration or full continent generator.

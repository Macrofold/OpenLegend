# Physics, collisions, navigation and mutable geometry

[Research index](../README.md) · The [spatial specification](../../../../docs/spatial-world.md) owns the accepted target: real XYZ geometry, tactical control, mixed-dimensional art, and no requirement for a free rigid-body sandbox.

## Separate five problems

Rendering says how an object looks. Spatial indexing finds possible geometric relationships. Collision/contact resolves whether bodies overlap or can reach. Navigation proposes a route through permitted space. Physical rules decide the consequences of contact, support, motion and resource interactions. Combining these into one scene graph makes both scale and correctness harder.

OpenLegend's Y-up, metre-based world, stable support surfaces and body profiles already provide the right separation. A sprite can occupy a real 3D body; a bridge and the path below it can share horizontal coordinates without sharing support or visibility. Camera cutaways do not remove physical floors.

## Broad phase first, exact tests second

Use conservative spatial bounds to reject impossible pairs before more expensive geometry tests. The NVIDIA broad-phase treatment explains the distinction and the quadratic worst case: spatial subdivision improves ordinary sparse workloads, but overlapping all bodies in one region can still produce a quadratic candidate set. Its historical CUDA benchmark is not a capacity estimate for this engine. [S47](../sources.md#s47)

Candidate choices to benchmark:

| Structure | Useful shape | Watch for |
|---|---|---|
| Uniform grid / spatial hash | Similar-sized local actors and regular queries | Huge bodies duplicated across cells; clustered density; changing cell size |
| Hierarchical bounds tree | Mixed body sizes and ray/overlap queries | Update/rebalancing cost, poor trees after adversarial motion |
| Sweep-and-prune | Coherent motion and constrained dimensions | Large changes, broad overlapping intervals, dense hotspots |
| Static geometry hierarchy plus dynamic index | Mostly fixed terrain with moving actors | Correct joins and invalidation when geometry becomes mutable |
| Chunked surface/navigation graph | Large terrain with local edits | Cross-chunk connectivity, vertical surfaces and stale seam caches |

No single index must serve every workload. Share canonical geometry and revisions, but permit dedicated navigation, sight and collision accelerators where measured needs differ. An optimization index must never become a second physical truth.

## Do not buy more fidelity than the game needs

Initially, upright actor bodies, swept movement checks, support resolution and discrete action reach can implement meaningful tactical movement. General articulated ragdolls, deformable structures, fluids and aerodynamics each add substantial coupling, compute and replication obligations. Introduce them only for a concrete mechanic.

Box2D's official simulation guide is a useful reference for sleeping, substeps, body categories and coherent stepping, but it is a 2D engine and not a proposed replacement for OpenLegend's 3D world. Rapier's determinism documentation is useful for understanding the conditions attached to reproducibility; it does not prove arbitrary JavaScript world initialization is cross-platform deterministic. [S16](../sources.md#s16), [S18](../sources.md#s18)

Fast motion needs a declared policy for swept collision or continuous collision detection. Raising a time multiplier by simply making physical timesteps larger can tunnel through walls or skip contacts. Multiple native substeps may be necessary for a chosen physical model; the resulting work must appear in the cost model.

## Navigation must be incremental and actor-specific

Represent traversable surfaces, portals and explicit links rather than a dense voxel for every cubic point. Clearance, slope, body size, locomotion mode and support identity influence a route. A ladder edge requires an implemented climbing behavior; a graph connection cannot silently grant flight or teleportation.

Hierarchical search reduces long routes to a coarse corridor followed by local refinement. Incremental methods such as D* Lite reuse prior search work after relevant changes. These are options to benchmark against the existing navigation provider, not reasons to replace it immediately. Dynamic edits, per-body capability profiles and route optimality change the tradeoff. [S19](../sources.md#s19), [S48](../sources.md#s48)

Useful cache keys include geometry revision, traversal policy/body profile, relevant start/goal surface and movement mode. Avoid global invalidation for a changed door in a distant region when dependency tracking can identify affected paths. Avoid reusing a route whose relevant door or bridge changed merely because the world-wide cache TTL has not expired.

Off-thread path queries return proposals with revisions. On completion, validate the relevant geometry and the actor's current requirements. “Pending,” “coverage absent,” “partial route,” “unsupported transition,” and “proven unreachable under these rules” are different outcomes. Native action continuation must not consume materials before arrival or through an inaccessible floor.

## Crowds and collision islands

Local avoidance can keep agents from repeatedly replanning because of nearby motion. ORCA is a useful research reference for reciprocal avoidance under its motion assumptions. It is not a substitute for authoritative collision, chokepoint scheduling, gameplay blocking rules or route existence. [S17](../sources.md#s17)

Doorways and narrow bridges are coordination problems as much as pathfinding problems. Explicit local reservations, yielding priorities and waiting behavior may be more legible and cheaper than thousands of oscillating avoidance corrections. Such choices should preserve player agency and the accepted action rules.

When full rigid-body mechanics arrive, connected contact/constraint islands offer a natural unit of local parallel work. A chain or structure that spans a sector boundary couples both sides. Splitting it across network owners requires either co-location of the connected island or a carefully reviewed distributed solver. Do not assume every geometric tile is independently simulatable.

## Mutable geometry is the real extensibility test

A new wall can affect navigation, collision, sight, acoustics, shelter, spatial subscriptions and support. Publish a versioned geometry change with a bounded affected region; each dependent accelerator invalidates the correct portion. Destruction may also require native falling/recovery behavior before the edit is admissible.

A physically large creation has a larger dependency footprint even when represented by one entity. Put bounds on admitted extent, active parts, connected constraints and update frequency. Rejecting an operationally unsupported configuration is more honest than pretending an untested giant structure will automatically scale.

## What to test before expanding this subsystem

Use bridge/underpass overlap, narrow openings for differently sized bodies, long thin walls, very large extents, high-density intersections, repeated door edits, many simultaneous identical path requests, missing support and fast moving bodies. Include adversarial placement at cell boundaries and pathological stacked geometry.

Measure candidate counts, exact checks, navigation queue time, rebuild bytes/time, cache hit and invalidation rates, allocation/GC and p99 native work. Test client frame time separately. A fast renderer can depict an incorrect or overloaded simulation; a fast pathfinder can still return invalid permissions.

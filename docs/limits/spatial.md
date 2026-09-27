# Space, movement and perception: limits and constraints

[Feature contract](../spatial-world.md) · [Implementation work](../maintainers/spatial-world.md) · [Tracking rules](README.md) · [Change backlog](../maintainers/limits-audit.md)

Values describe the stated baseline, not approved future targets. **Reported** means the merged implementation report (2026-09-26, `c133000` / `a90d411`); **Historical** means the original audit and needs code recheck. Ratings describe restrictiveness, not correctness or measured capacity. New rationale is an engineering assessment unless an authored decision is explicitly identified.

Implementation starting points: [types.ts](../../packages/spatial/src/types.ts), [queries.ts](../../packages/domain/src/queries.ts).

## LA120

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A world can define at most 8 senses, and a character can be assigned at most 8 senses.

**Reason / tradeoff:** Removed eight-sense definition/binding ceilings. Supported detector implementations and one owner per detector remain required; this does not implement additional senses.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Completed removals**.

## LA121

**Historical — needs recheck · Restrictiveness: Very safe.**

Body-contact sensing now requires touching physical body surfaces, with a zero sensing radius; other supported sense radii remain capped at 32 world units.

**Reason / tradeoff:** The former one-unit contact-radius maximum is obsolete. Physical body dimensions and numerical tolerance determine contact; review sight/hearing distances separately.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Review**.

## LA122

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A character's touch/proximity perception acquires and stores information about at most 32 nearby beings or objects.

**Reason / tradeoff:** Removed the thirty-two-contact cutoff in both acquisition and saved-state validation. All acquired contacts remain receiver-private.

[Implementation starting point](../../packages/domain/src/world-modules.ts).

Original recommendation: **Replace**.

## LA136

**Historical — needs recheck · Restrictiveness: Safe.**

The current spatial map validator allows at most 128 rows and 128 columns.

**Reason / tradeoff:** Increase map dimensions only with measured navigation and perception cost, rather than deleting the grid-size guard blindly.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA137

**Historical — needs recheck · Restrictiveness: Very safe.**

A valid world position must keep each coordinate within a magnitude of 512.

**Reason / tradeoff:** Allow larger coordinates when useful, but first check map, movement and rendering assumptions that currently depend on the smaller world.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA138

**Historical — needs recheck · Restrictiveness: Very safe.**

A spatial map permits at most 32 walkable surfaces, 128 blocking shapes and 16 named height levels.

**Reason / tradeoff:** Increase map-detail capacity with measured pathfinding and collision costs, preserving explicit failure if a supported map exceeds processing capacity.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Expand**.

## LA139

**Current after spatial/cadence integration · Restrictiveness: Safe.**

The existing authored-geometry guard allows at most 16,384 accumulated integer XZ-grid sites across support patches. This remains a conservative map-admission envelope; it is no longer the size of a constructed navigation graph. Recast's actual query/worker bounds are [SP01](#sp01).

**Reason / tradeoff:** Retain the admitted geometry envelope until larger-map preparation, memory and perception are qualified. The legacy implementation name `maxGraphNodes` does not imply lattice routing remains installed.

[Implementation](../../packages/spatial/src/validation.ts).

## LA140

**Removed during spatial/cadence integration · Restrictiveness: — (superseded).**

The 32,768-expansion lattice-search budget is removed with that planner. Recast now uses a 4,096-node query pool and explicit incomplete/budget outcomes under [SP01](#sp01). No-route remains distinct from incomplete computation.

## LA141

**Historical — needs recheck · Restrictiveness: Safe.**

A computed walking path may contain at most 2,048 points.

**Reason / tradeoff:** Allow longer journeys through suitable path processing rather than storing or searching indefinitely without a work budget.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA142

**Removed during spatial/cadence integration · Restrictiveness: — (superseded).**

The eight lattice endpoint connectors within 1.6 metres are removed with the old planner. Current nearest-polygon search uses 0.3 m horizontal and 0.2 m vertical half-extents, with physical support identity rechecked. See [SP02](#sp02); this approximation cannot authorize snapping to another floor.

## LA143

**Historical — needs recheck · Restrictiveness: Very safe.**

The search for a place to stand near an interaction target clamps its sampling radius to between 1 and 12 world units.

**Reason / tradeoff:** Make approach-point sampling respect the intended interaction reach without allowing an uncontrolled search over a huge area.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA144

**Removed at original audit; not reverified · Restrictiveness: — (removed).**

**Former limit, now removed:** A world can store at most 16 flight routes, each with 2–32 waypoints.

**Reason / tradeoff:** Removed the sixteen-flight-route and thirty-two-waypoint ceilings. At least two points, valid movement parameters and clear flight corridors remain required.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Completed removals**.

## LA145

**Historical — needs recheck · Restrictiveness: Very safe.**

A flight route's speed cannot exceed 1 world unit per simulation second, climbing cannot exceed its total speed, and waypoint waits cannot exceed 86,400 seconds.

**Reason / tradeoff:** Review speed and wait ceilings as flight-mechanic choices, preserving valid motion calculations when they change.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA146

**Historical — needs recheck · Restrictiveness: Safe.**

A walkable surface must have positive thickness no greater than 32 world units.

**Reason / tradeoff:** Preserve valid collision geometry and check whether larger authored structures genuinely need a higher thickness allowance.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA147

**Current after spatial/cadence integration · Restrictiveness: Medium.**

Geometry retains a 0.00001 numerical tolerance and 0.015 m support/seam comparison. Final movement arrival allows a 0.02 m residual; no actor is teleported across that residual. These are numerical tolerances, not placement snapping. [SP02](#sp02) records the independent navigation approximation and body skin.

**Reason / tradeoff:** Avoid repeated tiny corrections while preserving swept collision, support identity and distance accounting.

[Implementation](../../packages/spatial/src/types.ts).

## LA148

**Removed during spatial/cadence integration · Restrictiveness: — (superseded).**

Four terrain samples per horizontal metre are replaced by exact crossed-cell traversal, including conservative diagonal-corner rejection. Swept round-body obstruction and exact named support checks remain separate. This removes gaps between samples rather than widening passable terrain.

[Implementation](../../packages/spatial/src/geometry.ts).

## LA149

**Historical — needs recheck · Restrictiveness: Safe.**

The sight-check cache stores up to 128 observers and 512 target-position entries per observer; additional checks still run without caching.

**Reason / tradeoff:** Keep the cache-size bound because it limits reusable computation, not which beings or objects can be seen.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Keep**.

## LA150

**Historical — needs recheck · Restrictiveness: Medium.**

A hearing check requires sound transmission of at least 0.65.

**Reason / tradeoff:** Review this cutoff as a model of audibility, including whether characters miss speech that should be heard.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA151

**Historical — needs recheck · Restrictiveness: Very safe.**

The item-handling policy permits reach up to 10 world units and pickup duration up to 3,600 game seconds.

**Reason / tradeoff:** Review these as authored interaction rules, with movement and action-duration validation preserved.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA152

**Historical — needs recheck · Restrictiveness: Medium.**

The native falling calculation caps downward velocity at 3 world units per simulation second.

**Reason / tradeoff:** Treat this as a physical-world rule to review deliberately, not a generic software resource cap.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## QU01

**Reported · Restrictiveness: Safe.**

Spatial query radius: **10,000 world units**.

**Reason / tradeoff:** Bound search extent; independent geometry-position bounds still apply.

## SP01

**Current, source-inspected during integration · Restrictiveness: Safe.**

One navigation worker per application owns at most six body-profile meshes and one active task; its pending queue contains at most 64 admitted action requests. Overflow remains saved/pending. Each query has 4,096 nodes, at most 12 candidate interaction destinations and 2,048 output/corridor points. The worker has a 128 MiB old-generation limit and a 20-second watchdog. Failed/incomplete work is explicit, not proof of unreachability. Native replanning allows two attempts. One completed reply may await mutation-lane admission, retrying publication after one real second without recomputing navigation. Shutdown drains retirement/publication.

**Reason / tradeoff:** Bound CPU/memory and retain admitted intent. Required preparation pauses native time for the whole world while preserving prior debt; region-local blocking is unimplemented. These operating bounds are not latency/capacity certification. [Navigation owner](../../apps/server/src/navigation/coordinator.ts), [backend](../../apps/server/src/navigation/backend.ts), [contract](../../archive/07-technical-architecture/spatial-world-runtime.md#navigation-preparation).

## SP02

**Current · Restrictiveness: Medium.**

Recast uses 0.08 m horizontal / 0.05 m vertical cells, 64-cell tiles, contour error 0.1, 0.2 m candidate height projection, 0.01 m body skin and zero physical step height. Exact supports and full-body sweeps validate proposals. Same-support string pulling considers at most 24 future points per pass. Larger simplification work or coarser rasterization is not permission to cross geometry.

**Reason / tradeoff:** Practical worker preparation with continuous placement and demonstrated narrow-passage calibration; broader geometry/profile qualification remains SW17. [Calibration contract](../../archive/07-technical-architecture/spatial-world-runtime.md#movement-calibration).

## SP03

**Current · Restrictiveness: Safe.**

Static-object exposure reuse caches at most 256 observers per immutable map/target set. Overflow computes the complete result, never truncates an audience. Pose, eye/range, target membership/height/position and geometry invalidate reuse; names and recognition remain live. Round-body shape reuse holds at most 32 body shapes, with solid shapes weakly keyed.

**Reason / tradeoff:** Bound derived cache retention while retaining main's unchanged-exposure invalidation. [Exposure cache](../../packages/domain/src/object-exposure.ts), [shape adapter](../../packages/spatial/src/rapier.ts).

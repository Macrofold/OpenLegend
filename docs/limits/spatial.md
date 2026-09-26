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

**Historical — needs recheck · Restrictiveness: Safe.**

The navigation graph used for walking paths can contain at most 16,384 connected locations.

**Reason / tradeoff:** Keep a graph-size budget until larger-map construction and search have been measured or improved.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA140

**Historical — needs recheck · Restrictiveness: Safe.**

One walking-path search can examine at most 32,768 connected navigation locations before reporting that its work budget was exceeded.

**Reason / tradeoff:** Keep finite search work and distinguish budget exhaustion from proof that no route exists.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA141

**Historical — needs recheck · Restrictiveness: Safe.**

A computed walking path may contain at most 2,048 points.

**Reason / tradeoff:** Allow longer journeys through suitable path processing rather than storing or searching indefinitely without a work budget.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

## LA142

**Historical — needs recheck · Restrictiveness: Safe.**

A walking-path endpoint considers at most 8 connections to the navigation map within 1.6 world units.

**Reason / tradeoff:** Measure whether this connection cutoff rejects reachable destinations before expanding the number or distance of connections.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

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

**Historical — needs recheck · Restrictiveness: Medium.**

Geometry uses a 0.00001 numerical tolerance, and standing support or movement arrival uses a 0.015-world-unit tolerance.

**Reason / tradeoff:** Keep small numerical tolerances so tiny rounding differences do not prevent standing on a surface or completing a walk.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Keep**.

## LA148

**Historical — needs recheck · Restrictiveness: Safe.**

A surface-walking check samples the proposed movement segment four times per horizontal world unit.

**Reason / tradeoff:** Measure collision accuracy and processing cost together before changing the sampling density.

[Implementation starting point](../../packages/spatial/src/types.ts).

Original recommendation: **Review**.

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

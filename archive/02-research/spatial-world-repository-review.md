# Historical spatial-world source review

This is the supplied pre-implementation review at `dd40ad2ad42639a8171b6fa0a82c184c351b346e`, not current implementation status. The implementation branch was based on `12c9cd7318ee3958d5bea006005e1f0aad996547`. Current facts and evidence belong to [Architecture](../../docs/architecture.md#spatial-world-foundation) and [Verification](../../docs/verification.md#spatial-world-runtime).

# Repository review for the spatial-world design

**Reviewed repository:** Macrofold/OpenLegend. **Pinned commit:** `dd40ad2ad42639a8171b6fa0a82c184c351b346e` (September 22, 2026). [Commit](https://github.com/Macrofold/OpenLegend/commit/dd40ad2ad42639a8171b6fa0a82c184c351b346e).

This is a delivery-time source review, not a replacement for `docs/architecture.md` or an implementation diary to paste into target specifications. The integrating AI must recheck its current checkout; later code/docs may supersede these findings.

## Scope and limits

The review used the connected GitHub reader for relevant code and documentation, including the coordinate/pathfinding module, protocol, native movement/action completion, client scene and picking, public exposure projection, sensory/EPR ownership, save policy, and maintainer navigation. Earlier conversation reads also established the domain/AI/rendering boundaries and current action/cognition mechanisms.

This was **not an exhaustive repository-wide import or position-write audit**. The public source archive could not be downloaded in the working environment because DNS resolution failed, so no local checkout was available for a complete grep, build, or repository-wide link scan. No game tests, browser gameplay, dependency qualification, live model execution, or paid asset generation were run. Repository edits and all implementation task states remain untouched.

## Verified starting points and consequences

### 1. The current world is planar at its authoritative boundary

`Position` has X and Z; the protocol repeats that shape. The public map contains a two-dimensional tile array and planar obstacle descriptors. This requires a domain **and** transport cutover, not only a new renderer field.

Sources: [domain types](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/packages/domain/src/types.ts), [protocol](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/packages/protocol/src/index.ts#L1-L200).

### 2. Spatial algorithms encode the flat map directly

The spatial module computes XZ distance, tests grass/sand walkability in rounded tile coordinates, samples rock obstruction on a planar segment, and finds a four-neighbor breadth-first route. Its caches use map/entity identity and its candidate bins use XZ positions. A map's second grid dimension is named height, although it is not vertical elevation.

The design replaces these meanings with explicit 3D/support queries. A mere `y` field cannot make this BFS handle two floors, volumetric headroom, or flight.

Source: [spatial.ts](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/packages/domain/src/spatial.ts).

### 3. Native movement and actions must migrate together

`moveAlongPath` moves only X and Z. Approach logic calls the existing pathfinder; ranged completion uses its planar distance/LOS. Work completion and inventory effects remain native and are useful foundations to keep. Movement completion currently sets the destination directly.

This motivates semantic route segments, validated support, three-dimensional completion/range checks, and explicit preparation states. The same audit must cover other positional mutations—animal wandering/fleeing, creation, god tools, recovery, and save validation—rather than assuming this one kernel excerpt is the whole integration surface.

Source: [kernel movement and completion region](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/packages/domain/src/kernel.ts#L480-L700).

### 4. The renderer already uses 3D objects, but with flat assumptions

`scene.ts` uses PlayCanvas entities, materials, cameras, and world-to-screen transforms. It places gameplay roots at Y=0, applies a fixed billboard tilt, anchors shadows/markers to fixed heights, and interpolates XZ. Camera placement is fixed relative to a planar target. Picking ground intersects Y=0.

This is a favorable separation: keep the engine while refactoring its scene adapter. However, camera orbit requires more than changing a camera angle: billboard orientation, pan basis, selection, shadows, floor disambiguation, and authorized exposure all need coordinated work.

Sources: [scene asset/anchor region](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/apps/client/src/scene.ts#L240-L430), [camera, interpolation and picking region](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/apps/client/src/scene.ts#L650-L870).

### 5. Current procedural artwork is portable image generation, not a body model

`art.ts` draws Canvas images. The scene uploads them as textures and displays planes. The future art design proposes 2D rigs and reusable composition while explicitly separating visual joints from physical capabilities.

Keep those images and the painted direction. Add representation bindings and 3D anchors; do not require new 3D models before elevation works. Likewise, do not infer functional limbs, flight, collision, or resource stock from art.

Sources: [art.ts](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/apps/client/src/art.ts), [procedural-art design](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/archive/03-design-proposals/procedural-art-and-animation.md).

### 6. Exposure has several consumers, and camera parity is already a target requirement

The public view currently selects nearby entities using the existing sight predicate. The sensory target document separately calls for approved embodied viewport intersection with body LOS, independent NPC vision, and distinct acoustic propagation. EPR owns how resulting evidence reaches reactions.

The spatial work must update current consumers consistently and preserve those target boundaries. It must not silently replace them with an omniscient orbit camera, renderer-only fog, or a second event bus.

Sources: [view projection](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/apps/server/src/view.ts#L85-L150), [sensory owner](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/archive/07-technical-architecture/perception-and-attention.md), [EPR owner](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/docs/events-perception-and-reactions.md).

### 7. The existing architecture protects the most valuable reusable pieces

Domain transitions, authoritative actions, scoped context, stable entity IDs, definition/instance separation, memory, goals/plans, and AI execution boundaries are not inherently planar. The spatial proposal extends their inputs and dependencies instead of replacing them. The newly integrated Jev-only native-action selection design is preserved; navigation does not need a model loop.

Sources: [AGENTS.md](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/AGENTS.md), [agency runtime](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/archive/07-technical-architecture/agent-agency-runtime.md), [reviewed commit](https://github.com/Macrofold/OpenLegend/commit/dd40ad2ad42639a8171b6fa0a82c184c351b346e).

### 8. No-legacy-save policy changes the correct implementation plan

The active policy rejects incompatible development saves rather than requiring migrations. New 3D records should therefore have a deliberate current-format cutover, not a permanent optional-Y layer. Same-version continuity, retained routes, billing/privacy boundaries, and load-epoch fencing still apply.

Source: [save/load policy](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/docs/save-and-load.md#active-development-policy).

## Documentation placement finding

The inspected technical and maintainer indexes identify sensory, agency, EPR, art, and architecture owners, but no dedicated spatial-world design owner. The packet adds one behavior specification and its technical companion, with a focused SW tracker and research archive. This is based on the inspected indexes, not a claim that a full repository search found no mention of dimensionality anywhere.

Sources: [technical index](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/archive/07-technical-architecture/README.md), [maintainer index](https://github.com/Macrofold/OpenLegend/blob/dd40ad2ad42639a8171b6fa0a82c184c351b346e/docs/maintainers/README.md).

## Required implementation audit

The SW tracker explicitly assigns the complete position-write, planar-query, visibility-consumer, input, import-boundary, and persistence scans to the implementation checkout. Treat the source references above as starting points, not permission to stop after editing `Position`, `spatial.ts`, and `scene.ts`.

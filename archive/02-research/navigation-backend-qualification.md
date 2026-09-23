# Navigation backend qualification decision

Status: isolated research, not a production backend migration. Source baseline is spatial branch commit `11be9312dd560b8fcae5016acb1fc6ddf6216d86`. The playable feature branch and main are unchanged. Current runtime evidence and failed qualification cases are in [the qualification evidence](../../docs/verification/navigation-qualification.md). The accepted spatial architecture remains owned by [the spatial runtime contract](../07-technical-architecture/spatial-world-runtime.md), and implementation work by [SW](../../docs/maintainers/spatial-world.md).

## Recommendation

Select **Recast/Detour as the lead integration candidate**, behind a server-owned adapter and a bounded persistent worker service. Retain navcat as an alternative, not the default recommendation. The measured generation advantage and mature upstream implementation outweigh navcat's more convenient JavaScript extension points for the current workload. This is not a claim that either backend is already safe to execute as a replacement for the current physical movement contract.

A small GitHub star count is not proof of poor quality or no support. Nevertheless, maintenance depth and deployment history matter. Recast's upstream ecosystem and the narrower JavaScript wrapper must be evaluated separately; the wrapper and navcat also share an important maintainer. Pin the wrapper and qualify the actual exported APIs, rather than assuming every C++ capability is exposed.

navcat retains advantages for JavaScript per-actor traversal predicates, sliced search and dynamic global off-mesh connections. The runtime qualification confirmed these capabilities. Recast's standard flags suffice for the sampled link-permission case. Arbitrary object-specific permissions should not be reduced to an unlimited collection of flag bits or require one complete mesh per actor; richer rules belong in an explicit query adapter or higher-level action planner when needed.

## Integration boundaries

- OpenLegend remains the single owner of position, support identity, capabilities, time and effects. Navigation polygons and collider handles are derived data, not entity identities or saved authority.
- Navigation clearance must agree with actual movement shape and contour/rasterization error. Both candidates generated sampled corner positions rejected by the current square-footprint collision rules. Oversized planning radius partly helped but also removed a physically usable passage and did not eliminate every corner mismatch. Neither simple radius inflation nor accepting every successful navmesh result is an approved fix.
- Resolve approximate navigation heights onto the exact intended support with bounded correction and provenance. Do not globally loosen the 1.5 cm physical support tolerance. Keep exact ramp/seam transitions and same-XZ floors separate. Horizontal box tops must not gain walkability merely from triangle generation when no corresponding support is admitted.
- Prepare navigation by geometry revision and bounded body profiles; do not rebuild because a bird, camera or cosmetic sprite moves. Prefer qualified affected-tile updates for structural changes. A persistent worker protects host responsiveness; it does not make computation free or cancellation preemptive.
- Bound worker counts, queued queries, query/output capacity and retained candidate worlds. Validate world/load/geometry/profile/policy epochs before publishing results. A partial path, stale result or exhausted search is not arrival and is not proof of impossibility.
- Keep sight, physical reach and acoustics on physical geometry, not navmesh walkability rays. Retain a validated direct-movement fast path and use native execution to follow a corridor, rather than linearly connecting distant corners through changes of ground height.
- Rapier may be introduced for richer collision/sweeps or kinematic motion, not as an assumed universal speedup. Its world-query broad phase must be synchronized after changes. Shape-level queries use explicit transforms but still need deliberate spatial acceleration. No second autonomous dynamics authority should be introduced accidentally.
- Candidate geometry edits must not mutate committed collision/navigation state before authoritative acceptance. Dispose replaced native resources. Do not instantiate a separate WASM module/world for every actor. Full dynamics needs a separate saved-state/timestep design.

## Teleportation boundary

Teleport execution does not require pathfinding. The engine validates permission, cost/cooldown and destination occupancy, then commits the action. A teleport belongs in a route graph only when an actor should compare mixed itineraries such as walking to a portal, teleporting and walking onward. Cheap long-distance links require a valid cost heuristic in that planner. They are not a reason to complicate ordinary walking queries or block a floor-navmesh decision.

## Lighting and presentation direction

This qualification did not change rendering. The target remains continuous arbitrary-angle movement and a configurable local player-centered reveal treatment, restricted to observations the character is authorized to perceive. Right-drag smooth orbit/pitch, default lit sprites, continuous shadows and depth/cutaway corrections remain implementation work.

PlayCanvas has the relevant dynamic lighting, shadow-map and normal-map capabilities. A plain sprite can receive light color and falloff, but its default normal is a flat sheet, not the volume depicted in the image. The current renderer explicitly makes many cards unlit/emissive. A shared lit fallback is appropriate; richer leaf/trunk shading needs deliberately approximated virtual normals, normal/depth maps, layered cards or simple geometry. Backface normal correction does not create volumetric backlighting. Shadow proxies and lighting normals must not rotate as if the underlying object changed when the camera orbits, and they must not become collision authority. Commercial-game polish and screenshot parity require separate browser/GPU visual qualification.

## Outstanding adoption gates

Do not mark the full SW01/SW05/SW06 or previous SR regression gates complete from this research. The basic library capabilities were exercised; production shape/support reconciliation, affected-tile rebuild performance, native-resource longevity, application save/load/epoch publication, dynamic crowds/landing and full sensing/rendering/persistence behavior remain unqualified. Keep the existing regression requirements in `docs/maintainers/TODO.md`; add backend-specific cases with the production adapter rather than fabricating passing test evidence now.

## Primary references

- [Recast upstream](https://github.com/recastnavigation/recastnavigation)
- [Recast JavaScript wrapper](https://github.com/isaac-mason/recast-navigation-js)
- [navcat](https://github.com/isaac-mason/navcat)
- [Rapier scene queries](https://rapier.rs/docs/user_guides/javascript/scene_queries/)
- [PlayCanvas materials](https://developer.playcanvas.com/user-manual/graphics/physical-rendering/physical-materials/)
- [PlayCanvas StandardMaterial](https://api.playcanvas.com/engine/classes/StandardMaterial.html)

The qualification evidence is from pinned installed packages, not inferred from project marketing or star counts.

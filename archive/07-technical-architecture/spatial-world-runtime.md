# Spatial world runtime contract

## Initial native provider

The implemented `packages/spatial` package contains plain Y-up points, semantic surface destinations, bounded profiles, exact segment/convex-shape clipping and conservative upright-box sweeps. Rectangular planar supports and solid ramps form a layered grid. A* connects four-neighbor samples and coincident equal-height seams; it never connects vertically overlapping floors by proximity. A clicked sub-cell destination is connected only to its named surface. Accepted `SurfacePoint[]` routes persist in the ordinary action record. Future navmesh adapters can return the same plain spatial data without leaking polygon handles into saves.

Limits are centralized in `SPATIAL_LIMITS`: 128 cells per horizontal axis, 32 surfaces, 128 combined explicit/terrain blockers, 16,384 authored lattice samples (with at most 128 additional derived rock-support metadata slots), 32,768 search expansions and 2,048 output points. Their limits are implementation bounds, not measured capacity guarantees. The current graph and shape memoization keys are immutable map identity/revision and relevant body-profile values. Cache construction is synchronous, unpaid native work; there is no worker-readiness race or new simulation clock. Static solids and support patches use cached full-extent AABB trees; split axes follow center variation rather than total slab width. Boolean sight, stance and swept-motion queries stop on the first blocking hit, while ordered acoustic crossings retain one contribution per solid. A support wholly below both endpoints can short-circuit only its top-contact check, never a blocker or an overhead slab. Direct support-ID lookup is constant-time. Exact halfspace checks still decide contact, so a broad-phase miss may only discard a disjoint bound. A required over-limit/invalid world is rejected, never treated as empty space.

Coarse support groups conservatively compare the extrema of plane-height differences over shared integer coordinates. A disjoint group rejects a route before lattice construction. Within a potentially connected group, construct only bounded point/column metadata initially. Memoize exact standability and each complete outgoing-edge list on demand during A*. Unexplored is neither clear nor blocked; never publish a partial edge list for a reverse query to reuse. Sorted XZ columns localize seam candidates. Reversible same-surface edges can reuse an already-complete reverse list; exact-coincident valid stances retain a zero-cost star, while tolerance-height seams retain directed checks and costs. A shared endpoint permits a direct two-leg support change only after both native segment validations succeed. This can select a shorter valid route than grid search without changing already-saved routes.

The search lower bound is the maximum of Euclidean distance to the goal and the minimum, across at most eight valid goal connectors, of horizontal Manhattan distance to that connector plus its actual final segment cost. Every current internal edge is cardinal in XZ or a same-XZ seam, making both terms lower bounds. Manhattan distance directly to a fractional click would not be safe. Future diagonal, discounted or teleporting traversal must revise this heuristic before activation. Equal-estimate ties prefer greater traveled cost, then stable node identity; equal-cost new routes may differ without changing saved routes.

Do not bake the whole exact graph merely to derive weak connected components. After a search fully exhausts its queue without reaching a goal, its visited set is closed under outgoing edges. Cache at most four such byte sets per map/profile/group. A subsequent search whose every start connector lies inside one and whose every goal connector lies outside it can be rejected. This negative proof is safe for directed seams; membership never proves a positive route. No budget-limited/partial search creates a closed region. Eviction changes work, not reachable results. Generation-stamped typed arrays remain synchronous/non-reentrant scratch, clearing stamps on counter wrap; lazy facts and closed regions reset with the map/profile revision. Expensive first no-route searches can still explore an entire connected group. Limits constrain native work, not wall-clock latency, and no asynchronous preparation policy is implied. Interaction-stance discovery first bounds the relevant support patches and defers exact stance/ray work until candidates are considered. The current maximum of 12 route attempts and coarse grid remain coverage limits; richer stance search and propagation of route budget/status distinctions to gameplay remain SW05 work.

The visual query caches only frozen geometry and transforms, keyed by the current observer pose, radius, eye height and target pose/height. Its maximum is 128 observers and 512 target entries per observer per retained map. Eviction recomputes geometry; it never removes an exposure or grants knowledge. A post-movement exposure pass captures scalar/body inputs once. Mutable candidate geometry bypasses this visibility cache, and public entity-list memoization also depends on map and sense-manifest identity. Hearing rejects out-of-range listeners before querying barriers.

Landing occupancy uses a lazy, step-local hash over actual body extents; it is updated after every subsequent native animal/flyer movement. This avoids a full entity scan for each landing and distinguishes vertical overlap from equal surface IDs. It is not a general crowd controller: walking and cruising actors still lack dynamic avoidance/fair passage arbitration. A nominated takeoff/landing surface permits top contact, not travel through its underside. Arbitrary flight-graph generation, body-shape accuracy and general support-loss recovery remain deferred.

Renderer geometry rebuilds retain unchanged actor assets. Shadows and billboard transforms update on relevant pose/geometry/orientation changes, not blindly every frame; stationary hover is sampled at most 20 times per second and identical callbacks are suppressed. Click picking remains immediate. This does not implement terrain streaming, general instancing or a retained hidden-world scene. Actor observations omit other actors' private future flight routes and physical path/destination records before their final isolated copy; the observer retains its own plan through its existing private owner. The bounded native participant roster and draft replacement boundary are described in [simulation CPU](../../docs/performance.md#simulation-cpu-and-growing-history); it does not change spatial authority or sensory semantics.

Each physical actor has one `{x,y,z}` position plus body-profile, heading and support reference. The existing `map.height` field remains horizontal Z cell count for this cutover and is documented accordingly; it is not elevation. A small authored bird corridor uses ordinary saved native progress and vertical takeoff/landing. Flight cannot run beside another voluntary body action. Unsupported airborne physical actions are rejected; speech/private cognition retain their existing capability rules. Death/incapacity aloft transitions to the bounded vertical recovery family. Arbitrary support removal is not exposed; the native geometry mutation rejects unsupported/obstructed occupants and airborne structural changes.

The generic sections below remain the end-state contract, not claims that arbitrary triangles, rigid-body simulation, dynamic crowd arbitration, hidden-map navmesh baking, room acoustics, viewport leases, GLB loading or arbitrary invention-generated bodies are delivered. Those gaps stay with SW and its cross-linked owners. Preserve the current default-world policy while expanding it through the existing world-module boundary.

**Status: target technical contract with an implemented finite native provider.** The [spatial-world specification](../../docs/spatial-world.md) owns the end-state behavior. The [SW tracker](../../docs/maintainers/spatial-world.md) owns implementation and all delivery gates. Source findings and package qualifications are in the [research archive](../02-research/three-dimensional-worlds-and-navigation.md). TypeScript below is logical interface notation, not tested code or a promise about a library's exact API.

## 1. Architecture and package choices

Retain the single authoritative simulation and PlayCanvas client. Add a small spatial boundary, not another general-purpose game engine.

```text
admitted world geometry + actor bodies + current transforms
               |                           |
       immutable spatial snapshot     native fixed-step movement
               |                           ^
     numeric geometric queries ------------|
               |                           |
   scoped navigation input -> route proposal -> validated native route
               |
    sensory geometry results -> existing sensory / EPR / memory pipeline

world authority -> permitted projection -> camera/input + renderer interface
                                                     |
                                          PlayCanvas sprite/mesh adapter
```

**Current implementation choice:** a small native layered-surface A* provider, analytic finite convex slab/wedge/box queries, and authored native flight corridors; PlayCanvas remains presentation. No navigation/physics dependency was added. For the present 28-by-24 public map and a few surfaces, this is a smaller reversible integration than initializing several unqualified WASM libraries. It adds no second dynamics world and no asynchronous preparation framework.

Recast/Detour (`recast-navigation-js`), Rapier shape queries and `ngraph.path` remain the researched candidate stack for richer geometry, scale or arbitrary route graphs, subject to SW01 qualification. They are not installed, tested or implicitly required by the current build. Pin tested versions before adopting them; the research archive records the original evidence and access limits.

Do not assume PlayCanvas supplies the authoritative pathfinder. Its renderer integrations and examples are useful, but the navigation service consumes canonical geometry directly, not PlayCanvas entities. Do not import `@recast-navigation/playcanvas` into server or domain code. Do not run a PlayCanvas/Ammo physics world as a second authority.

Recast provides walkable-surface navigation, not unrestricted volumetric flight. Rapier is used initially for geometry tests, not to advance rigid bodies. `ngraph.path` supplies graph search, not flight dynamics or collision checking. Each package has a narrow responsibility.

### Code ownership

A small `packages/spatial` module may hold renderer-independent point/vector/bounds types, coordinate conventions, finite shape descriptions, pure helpers, and query interfaces shared by domain and protocol. It must not depend on the domain, a renderer, a database, or a provider. Do not create it merely to re-export vendor types.

`packages/domain` owns authoritative spatial records, capabilities, movement/traversal transitions, geometry mutation, and effect admission. `apps/server` initializes vendor adapters, prepares indexes/navmeshes, schedules bounded unpaid CPU work, constructs permitted projections, and commits proposals. `apps/client` owns presentation, interaction gestures, and a PlayCanvas adapter. `packages/ai` needs no new spatial engine dependency.

Vendor SDK objects are private adapter implementation details. Import-boundary checks must prevent `pc.Vec3`, Detour polygon handles, Rapier collider handles, or an SDK scene graph from entering domain state, transport contracts, saves, or model reference fields.

## 2. Coordinates and canonical records

### Coordinate convention

Use a right-handed frame with positive Y up. Lengths are world metres; angles are radians in shared data. Retain the current world's horizontal scale by declaring one existing map unit to be one world metre at the development-format cutover, then tune gameplay separately. This establishes units, not a claim that the old artwork was physically calibrated. Do not silently multiply current movement speeds or change the simulation-clock ratio.

Define zero actor heading as facing positive Z and positive heading as rotation about positive Y. Camera yaw uses its own documented view convention. Imported models declare any source-axis correction. Convert to PlayCanvas's camera/local conventions inside its adapter. Distinguish a world's depth in Z from an object's vertical height: new map metadata should use `widthCells`, `depthCells`, and explicit bounds rather than overloading `height`.

```ts
type WorldPoint = Readonly<{ x: number; y: number; z: number }>;
type WorldVector = Readonly<{ x: number; y: number; z: number }>;
type Bounds3 = Readonly<{ min: WorldPoint; max: WorldPoint }>;
type Quaternion = Readonly<{ x: number; y: number; z: number; w: number }>;

type SpatialDestination =
  | { kind: 'surface'; point: WorldPoint; surfaceId: string }
  | { kind: 'air'; point: WorldPoint; airRegionId: string };
```

Require finite numbers, bounded world extents, valid rotations, nonnegative dimensions, supported units, and safe IDs. A semantic surface ID is not a library polygon ID. `WorldPoint` and screen/CSS-pixel coordinates are different types even if TypeScript structurally resembles them. Provide explicit `distance3D`, `horizontalDistance`, and surface-route length helpers; prohibit a generic ambiguous `distance` at new call sites.

### One position owner

Keep `Entity.position` as the only authoritative world position; replace its type with required `x,y,z`. Do not add independently writable `elevation`, `altitude`, renderer transform, and physics-body position copies. Support and movement mode describe that position rather than replacing it.

```text
Entity.spatial
  revision
  bodyProfileRef / geometryProfileRef
  heading
  supportSurfaceId?      # required for supported ground stance
  locomotionMode         # grounded | traversing | airborne | falling
  locomotionProfileRef
  traversalState?        # native link identity, progress, interruption rules
  fallState?             # saved vertical velocity and native recovery state
```

An actor position is its support anchor, normally foot level. Collision shapes and eye/ear/action anchors are local to it. A standing capsule's center is offset upward by its admitted geometry profile. Animation bobbing never changes these anchors. Static shapes may have full orientation; initial living actors use upright body shapes and heading, keeping arbitrary tumbling out of scope.

Inventory items do not need independent world positions merely because the world is 3D. Their location remains derived from admitted ownership/containment. A placed or dropped interactable item obtains a world-presence record through its existing family. Attached presentation sockets and any future physical attachment transforms must have an explicit owner; they must not become a second writable absolute position.

A body's structural capability and its navigation-clearance profile are related but distinct. Use a few conservative clearance classes rather than a separate navmesh for every visual scale or every animal. Exact dimensions still matter at native collision and contact checks. An injury may reduce speed without requiring a new navmesh unless it changes an admitted clearance or traversal capability.

### Geometry, surfaces, and connectors

Store bounded semantic spatial records using the existing world-state/repository conventions:

```text
SpatialGeometry
  id, revision, ownerEntityId?, definitionRef
  transform, finite shape payload
  masks: movement / sight / projectile / acoustic / support
  materialProfileRef, disclosurePolicyRef

WalkableSurface
  id, revision, geometryOwnerRef
  surface selector / bounded patch description
  semantic level group?, supported locomotion classes

TraversalLink
  id, revision, fromSurfaceOrAirRegion, toSurfaceOrAirRegion
  endpoint anchors, direction, nativeTraversalFamilyRef
  required capabilities, cost/time model, occupancy policy
```

The finite shape vocabulary starts with boxes, upright capsules, bounded convex ramps/wedges, and bounded triangle patches for terrain/decks. Each family defines solid sides, top support, thickness, face orientation, allowed transformations, and bounds. A floor is not an infinitely thin decorative plane. Terrain can combine a base heightfield with independent platforms and ceilings. A cave or bridge does not require replacing the entire landscape with voxels.

Surface identity is stable across cosmetic mesh changes and derived navmesh rebuilds. Structural changes that replace a support surface use explicit identity/revision rules. Never make Detour's finite area labels stand for an unbounded set of individual surfaces. Keep the surface-to-nav correspondence as derived adapter metadata and validate endpoint/support agreement geometrically.

## 3. Central spatial mutations and dependency invalidation

Use one domain entrypoint for adding, moving, changing, or deleting meaningful geometry. It validates family bounds and ownership, resolves supported effects on occupants, updates revisions, and returns required invalidations. It is used by native mechanics, owner tools, and admitted inventions rather than three shortcut writers.

Distinguish dirty causes:

| Change | Invalidates |
| --- | --- |
| Actor position/heading | Dynamic broad phase, affected exposure, applicable contact and route-start checks |
| Static support or blocker geometry | Intersecting nav tiles/corridors, spatial queries, affected supports, sensory geometry |
| Door/opening or acoustic material state | Relevant traversal/occlusion/transmission consumers, not all art or all goals |
| Body clearance/capabilities | That actor's route compatibility and native constraints |
| Appearance-only revision | Visual assets and applicable descriptive detail, not pathfinding or physical dimensions |
| Knowledge/disclosure revision | That observer's permitted spatial projection and route-discovery input |

Return an affected bounds/ID set rather than scanning every actor or rebuilding every model context. Update the authoritative geometry immediately when a real action changes it; a stale navmesh cannot postpone the physical existence of a closed door. Planned creator changes may prepare derived data before activation. Unexpected derived-data failure follows the explicit technical-pause policy below.

Supporting surfaces, blockers, and source profiles share canonical definitions, but their derived representations may differ. A navigation mesh is not collision geometry, and a sprite silhouette is not either. Every derived artifact carries source/configuration digests. Missing coverage is explicit; it must not become immunity, free space, or invisible support.

## 4. Geometry query boundary

### Pure queries over explicit snapshots

Expose a finite read-only interface for segment rays, shape overlap/sweep, support projection, and broad-phase candidates. The request includes or binds an immutable snapshot/revision and the relevant physical inputs. Results return numeric hits, semantic IDs, normals, and explicit coverage/status. They do not mutate bodies or acquire knowledge on their own.

```ts
interface GeometryQueries {
  raycast(input: ScopedRayQuery): RayQueryResult;
  sweep(input: BodySweepQuery): SweepResult;
  overlap(input: ShapeOverlapQuery): OverlapResult;
  support(input: SupportQuery): SupportResult;
}
// All request/result types are OpenLegend data, not vendor API types.
```

Initialize WASM in server bootstrap, outside pure transitions. The initial adapter uses Rapier **shape-level** ray/contact/intersection/shape-cast operations over explicitly supplied transforms. This avoids synchronizing a second mutable rigid-body world merely to ask geometric questions. The exact adapter API and shape-pair coverage must be verified in SW01; this document does not assume a particular mutable `World` query-update method exists.

Compiled shapes and spatial indexes are discardable memoization. A query against a candidate domain transition must see that candidate's geometry, including mutations earlier in the defined transition order, not a stale index from the previous committed world. Bind snapshot identity and use a current dynamic overlay or rebuild the affected small index. Never capture mutable application world state in a supposedly pure query closure.

Results are deterministic for identical canonical inputs and the pinned tested backend under the supported execution environment. Sort equal-distance hits by stable semantic identity and define tolerances centrally. Do not promise cross-version or cross-platform lockstep merely because a dependency documents deterministic arithmetic. Saves pin the interpretation and accepted native route data needed for continuity.

### Broad phase and finite work

Begin with a 3D spatial hash for dynamic bodies and bounded static shape bounds, reusing the existing spatial-index approach. Insert an object's full AABB into intersected bins, not only its center; otherwise a large bridge or wall can be missed. A very large shape may use an explicitly indexed coarse tier with bounded lookup rather than unbounded bin insertion. Deduplicate candidates in stable order before exact tests.

The finite native provider now uses a static full-extent AABB tree after measured query/build costs justified it. A richer static index or dynamic broad phase still needs workload evidence, not a new general scene framework. Queries enforce finite candidate/work limits. Overflow is a technical incomplete result: it must not be interpreted as no collision or no occlusion. Mandatory safety queries either use a complete bounded fallback or stop the affected transition visibly.

A ray detects an unobstructed line; a body needs a swept-volume test. Slopes and thin obstacles require support/clearance checks along movement, not simply at the destination. Ground skin distance and support contacts need explicit tolerances so a walking capsule does not reject its own floor as a wall or tunnel through a deck. Query masks and owner exclusions must be specific to the operation, not global “ignore this obstacle” escape hatches.

## 5. Ground navigation

### Recast/Detour adapter

Generate navigation input from canonical walkable/blocking geometry in world coordinates. Use `@recast-navigation/core` and the appropriate generator/WASM packages behind an application-owned `NavigationProvider`. A renderer integration package can assist a god-only debug view but cannot supply authoritative geometry.

A small static fixture can use a solo navmesh during qualification. The production direction is tiled ground navigation with bounded invalidation. Temporary obstacle support is useful for supported blockers; adding a new bridge surface or removing structural support requires the appropriate geometry rebuild, not pretending it is only an obstacle toggle.

Build parameters belong to a versioned navigation profile: cell resolution, clearance, slope, climb/step tolerance, region and polygon settings, and tile boundaries. Choose them by fixture results, not default-demo values. Record the exact package/build/configuration digest with cached data. A change that alters traversability is a spatial-policy change, not an invisible performance tweak.

### Route request and endpoint binding

```text
RouteRequest
  request identity, world/load epoch, actor identity
  start point + current support/mode
  intended destination point + surface/air-region identity
  clearance profile + permitted traversal families
  scoped spatial-knowledge view
  relevant geometry/navigation revisions
  finite search/output limits

RouteResult
  reached | partial | no_known_route | invalid_endpoint |
  unsupported_mode | stale | pending_geometry | budget_exceeded | unavailable
  segments, reached destination, cost, source/configuration references
  completeness and diagnostic reason (server-only detail may be richer)
```

First resolve the actor's actual support and intended destination. Restrict nearest-point projection to the chosen support family, a small vertical range, and a declared maximum projection distance. Verify the resulting support identity. An unconstrained nearest polygon around `(x,y,z)` is not sufficient when floors overlap.

For an entity-targeted action, request a reachable **interaction stance** satisfying the action's native reach/line-of-effect predicate, not a route to the target's center. This is necessary for campfires, large objects, walls, and ranged attacks on airborne creatures. Bound candidate stances and preserve unknown/no-stance versus navigation failure distinctions.

Check full route termination. A library-level successful query may return only a partial corridor or exhaust a node/output budget. Mark arrival only when the requested supported destination is actually reached within tolerance. Normalize route ordering, one-way semantics, and status flags inside the adapter and test them independently.

Do not reuse a Detour walkability raycast or projected neighborhood query as a general 3D sight, acoustic, projectile, or body-collision test. Its navigation semantics differ from a ray through the physical scene. Those consumers use the geometry-query boundary. See the [Detour query reference](https://recastnav.com/classdtNavMeshQuery.html).

### Native route representation

Store OpenLegend route segments, not a vendor query object:

```text
walk segment: supported surface refs, bounded 3D path/detail samples
traverse segment: native link ID/version, endpoint refs, required execution
fly segment: air corridor refs and bounded 3D waypoints
```

Persist the accepted segment list, current segment/cursor, intended destination, and source-policy references. Detour polygon handles may be cached while valid but are not durable identity. Follow the surface/detail geometry through each walk segment; connecting two 3D corners by a straight chord can cut through a slope or floor. Support projection must be constrained to the segment's admitted surface, not the nearest surface anywhere below.

Off-mesh links supply connectivity, not animation, energy use, collision immunity, or teleportation. Only native traversal families advertised by the actor can be used. Initially prefer ramps and walkable steps for ground height changes. Add ladders/jumps only when their execution, interruption, and recovery are implemented.

### Planning without an omniscient map

Separate physical safety from the actor's spatial knowledge. The authoritative collision system can stop an actor at an obstacle. The actor's route discovery cannot reveal a hidden staircase or use a private tunnel it has never learned about.

The starter world's public terrain may be explicitly known to all actors. Mark this as a disclosure rule rather than calling it unknown while transmitting the entire map seed. For hidden/generated structures, construct routing input from permitted current or remembered geometry and known connectors. Reuse navigation artifacts by shared knowledge/source digests; do not require a full private bake per actor when the inputs are identical.

Remembered geometry can be stale. A path through a remembered open doorway may be proposed, but current physical checks stop movement when the changed door is encountered. Do not consult hidden updated geometry and explain its exact new shape as though the actor observed it. A known surface graph or filtered tile set is acceptable only if it cannot reveal topology excluded by that observer's knowledge view.

Client path previews use the same permitted discovery view. Hidden map seeds, nav tiles, collider payloads, precise sound positions, and debug overlays must not become alternative disclosure channels. Actual targets and required observations remain governed by the identity and sensory contracts.

## 6. Native movement, timing, and local conflicts

The domain remains the sole owner of position and movement time. Do not advance DetourCrowd or PlayCanvas bodies from browser frame delta and copy them into world state. The first release uses the existing native action controller extended for 3D routes. A future crowd backend is a separately qualified replacement for one defined controller responsibility, not a concurrent writer.

Movement consumes a simulation-time budget along actual 3D segments. Speeds, slope effects, ascent/descent rates, and work durations are native data. Use finite swept-volume checks and bounded subdivision at corners/links. Large simulation advances and accelerated playback must not cross an entire barrier between collision samples. Respect the existing fixed-step order and time-debt policy; do not introduce a second simulation clock.

For actor–actor conflicts, produce proposed movement from one step boundary, then resolve conflicting swept volumes in a stable native order. Initial behavior is wait/yield at a blocking actor, with saved waiting age and stable IDs for fair narrow-passage arbitration. Do not rebake the static navmesh for every moving creature. Keep bodies inside their valid surfaces/corridors while resolving conflicts. Independent avoidance systems cannot both steer the same actor.

If repeated waiting warrants a detour, perform a bounded native route reconsideration. Escalate to semantic planning only when the gameplay circumstance warrants it through AG/EPR. No model is needed to slide along a valid path, wait for a reserved connector, or inspect a native collision result.

### Query preparation without corrupting simulation time

Ordinary route queries run synchronously against prepared, immutable navigation data with deterministic expansion/output limits. Heavy mesh generation and optional previews run outside the mutation transaction, normally in a bounded Node worker adapter after its packaging is qualified.

A required cache miss is not an in-world delay sampled from worker speed. If a native command/step cannot finish because required spatial data is unprepared, return a typed **spatial-not-ready** result with no partial authoritative effects. The application prepares the exact required snapshot outside the mutation transaction, then revalidates and retries that same unpaid operation at its intended simulation boundary. If it blocks the next required step, hold advancement there and report a technical navigation preparation state; do not let starvation or action duration advance merely because the CPU is slower.

A geometry change already committed remains real. Until dependent navigation is ready, existing routes may continue only while their next segments pass current geometry checks; the first step requiring unavailable data hits the preparation boundary. Expose preparation readiness separately from the player's manual pause preference, with manual pause retaining priority. UI and safe inspection remain responsive. An explicit new command, cancellation, or world load can supersede the pending request through existing identities/epochs. Storage and transaction ownership are not held open while a worker runs.

This is the simple deterministic local-world policy, not a claim of hitch-free performance. It makes cache readiness non-authoritative. A later asynchronous multi-region scheduler must define equivalent ordering/continuity before replacing it. Worker completion order must not decide movement priority. Bounded unpaid CPU rebuilding is distinct from forbidden automatic paid AI retries.

### Interruption and loss of support

A changed obstacle, incompatible body profile, or revoked connector invalidates the affected route, not the actor's whole mind. Stop at the last valid position, preserve actual work/consumed materials, and return the appropriate blocked/interrupted outcome. Do not snap to the new destination when the old path ends.

Ground support loss or loss of flight initiates a small native falling state: saved velocity, bounded vertical/optional inherited-horizontal movement, collision sweep, landing support, and a supported outcome. Tune fall parameters in simulation units; adopting terrestrial constants without considering the accelerated game clock is not required. Body injury uses the existing body-effect owner. A falling/dead flyer cannot retain a conflicting walk/fly executor; native lifecycle interruption clears or suspends its voluntary motion according to the action policy.

Unsupported structural changes that would require an unavailable recovery mechanism must be rejected at admission. This rule is not permission to prevent every normal dangerous event; implement the needed finite fall family before exposing support-removing gameplay.

## 7. Aerial and mixed-mode navigation

Use an explicit bounded graph in three-dimensional free-space corridors. A graph node has a world point, air-region identity, clearance class, and allowed transitions. An edge has direction, a collision-checked swept corridor, speed/cost model, and relevant geometry revisions. Graph generation is trusted code or admitted bounded data, not arbitrary model-authored executable routing.

Start with a few useful altitude bands and vertical connectors over/around supported obstacles. Bands are absolute world heights within an air region; a node may be placed relative to known terrain during generation, but changing terrain cannot silently move the actor's authoritative altitude. Under-bridge and above-bridge corridors are explicit alternatives. Include ceiling/headroom checks, not only terrain below.

Takeoff connects a supported stance/perch to a clear aerial node. Landing connects to a selected support surface whose footprint, occupancy, and vertical approach remain valid. A flyer can wait in a permitted holding location or seek another known landing point when landing fails. It cannot appear on the nearest ground plane by default.

Use `ngraph.path` behind a small directed-route adapter. Supply explicit nonnegative cost and direction rules, normalize the returned order, and test one-way edges. A zero heuristic is the safe initial choice; a Euclidean/time lower bound may be enabled only when proven admissible for all included edge costs. Do not select a faster greedy search and describe it as optimal A*.

A mixed route combines ground subroutes and supported traversal/air edges through a small semantic connector graph. The higher-level graph compares compatible connection points; ground and air providers solve their own segments. Limits bound connector expansion and subqueries. Partial graph coverage is `unsupported_mode` or incomplete coverage, not a fabricated physical obstruction.

General continuous flight, dynamic aerobatics, voxel/octree navigation, swimming, and vehicle controls are optional later providers/families. The route contract already uses 3D points, modes, capabilities, and segments so those additions do not require flattening or replacing character goals.

## 8. Interaction, sight, and hearing integration

Provide action-specific spatial predicates rather than applying one radius to every verb. Examples include `canReachContact`, `canOccupyStance`, `hasLineOfEffect`, and `withinRangedEnvelope`. They combine body/target extents, anchors, masks, and native capabilities. Social speech uses the sensory system, not a hand-reach predicate.

The current probabilistic projectile family can remain an abstract shot: resolve range and obstruction in 3D, then apply its saved-RNG hit rule and native damage. Rendering an arrow arc does not establish ballistic simulation. A future ballistic family needs its own admitted trajectory and collision semantics.

Sight queries use body eye anchors and a bounded set of target exposure samples/extent tests. A center-only ray cannot represent a large partly exposed object. Define coarse detection/recognition/detail outcomes in the sensory owner, with geometric coverage and uncertainty returned here. A single hit test does not reveal private inventory or hidden internal state.

Hearing geometry returns three-dimensional source/listener separation and bounded transmission information across distinct crossed barriers. Deduplicate entry/exit faces of the same wall so a slab is not attenuated twice accidentally. The sensory owner defines normalized source strength, masking, sensitivity, intelligibility, and unknown handling. Do not relabel these scores as physical dB. A room/portal propagation provider is a later improvement when direct-path attenuation demonstrably fails useful cases; it is not a prerequisite for 3D distance and floor attenuation.

Capture event-time spatial origin, applicable source-profile revision, and permitted observer evidence through EPR's existing occurrence/acquisition contracts. Keep natural sounds, speech, private thoughts, and system notifications distinct. Source disappearance must not relocate a past shout. A new spatial snapshot cannot upgrade old memories into more precise historical observations.

Replace planar call sites consistently: event audience creation, `observeActor`, public views, action catalogue/candidates, immediate response admission, owner placement/revival/recovery, animal movement, and semantic interest exposure. A new `canSee3D` in one module is insufficient if another still discloses entities by planar radius.

## 9. Camera, viewport authorization, and floor presentation

### Camera state

```text
CameraState
  focus: WorldPoint
  yaw, pitch
  projection: orthographic | perspective
  orthographicHeight OR perspectiveDistance + verticalFov
  focusedSurfaceGroupId?
  orbitLocked / presentation profile reference
```

Camera state is presentation state. Use a pure camera-rig controller to validate/clamp it and derive view parameters, with the renderer converting to engine matrices. Pan in the projected camera-ground basis or by ray intersection with the active focus plane. Do not retain the old fixed screen-Y-to-world-Z multiplier. Keep pivot distance, zoom, pitch, and level focus independent. No default roll.

A provisional sprite-friendly default may use a 45-degree downward pitch, free yaw with optional snap, and a bounded 20–75 degree pitch range. These are tuning hypotheses, not hard requirements or measured best settings. The schema supports a wider developer view and an optional perspective mode. Preserve framing when switching projection and avoid singular near-horizontal ray intersections. Camera/geometry collision for keeping the eye outside walls is presentation behavior, not authority to alter actor position.

### Approved embodied view

Preserve the existing sensory policy: player current visual evidence is bodily visibility/detail intersected with the active server-approved world viewport. NPC bodily exposure is not gated by that viewport. God inspection uses a distinct grant.

Send bounded camera intentions with monotonic view identity/revision through a coalesced path; validate focus extent, projection limits, world bounds, actor/controller association, and active-view lease. The server determines eligible exposure from canonical geometry and approved camera math. Client GPU visibility results never grant knowledge.

Use approved camera frustum and coarse presentation-occlusion queries to narrow the player view where a wall hides an otherwise body-visible target from the camera. Approved cutaway masks may remove that *presentation* obstruction, but never the body-to-target physical obstruction. This reconciles a tactical roof cutaway with embodied parity without requiring server-side GPU pixel inspection. The renderer may further narrow what it draws; it cannot expand the authorized exposure. The sensory owner defines the detail/recognition meaning of the resulting exposure.

While a wider view is pending, the client can move its camera but cannot fill it with unapproved hidden entity state. Narrowing the view can immediately hide existing details; newly exposed details wait for the scoped response. This prevents a free-orbit frame from becoming an X-ray leak. Routine camera motion updates native exposure without dispatching a paid call per frame.

The sensory owner retains its hidden-tab policy and D51 details. Restoring a save or changing world invalidates the viewport lease and retained live projections. Multiple tabs and a creator camera cannot silently union their views into one actor's vision.

### Floors and picking

Floor groups are UI conveniences referencing surfaces, not authoritative discrete Y buckets. Select visible/permitted surface intersections with a ray; use focus level and an explicit alternate-surface control to disambiguate stacked hits. Show a destination marker anchored to that selected surface. The server verifies point/surface consistency and a valid stance before route admission.

Roof cutaway/fade operates on presentation groups or clipping masks. It does not remove support, collision, sight occlusion, or sound attenuation. Only permitted contents may appear below a faded roof. Do not implement cutaways by deleting canonical geometry or sending concealed NPCs so the browser can hide them.

Visual picking may use a GPU ID buffer, bounded mesh ray tests, or sprite-alpha picking against the authorized render view. Return a plain entity/surface reference and world point; never a trusted command. Respect transparent sprite regions, layer cutaways, geometry depth, and current exposure. Projected label rectangles cannot select an unknown entity behind a wall.

## 10. PlayCanvas isolation and hybrid assets

### A small renderer interface

Formalize the useful boundary already approximated by `WildernessScene`:

```ts
interface WorldRenderer {
  setView(view: RenderWorldView): void;
  setCamera(camera: CameraState): void;
  setSelection(selection: SelectionView | null): void;
  pick(point: ScreenPoint): PickResult | null;
  project(point: WorldPoint): ScreenProjection | null;
  resize(viewport: ViewportSize): void;
  dispose(): void;
}
```

`RenderWorldView` is a renderer-friendly **authorized projection**, not `WorldState` and not a new authority database. Keep inventories, minds, narration, and control policies in their existing UI/application owners. A small adapter can derive this view from `GameView` without creating another network protocol immediately.

`PlayCanvasWorldRenderer` owns `pc.Application`, scene nodes, textures/materials, lights, engine cameras, and GPU resources. React speaks plain data and commands through a renderer/controller boundary, not `pc.Entity`. Camera control, gesture recognition, and game-command submission are separate responsibilities. Do not build wrappers for every graphics API or a runtime engine-switch menu. A test renderer is sufficient to verify the boundary.

### Visual bindings

Extend the existing art owner's versioned visual contract with representation families rather than inventing another asset registry:

```text
single sprite / directional sprite set / 2D rig / procedural mesh / model asset
shared: definition/version, world dimensions, anchor, orientation policy,
        supported state/animation mapping, authorized asset refs, fallback
```

Single-view sprites use a declared camera-facing billboard mode. Directional assets choose a frame from relative actor and camera headings with stable angular bins/hysteresis. Missing pitch or direction coverage uses the declared fallback and camera limits. Rotating the camera must not trigger image generation. Static surfaces use geometry-mapped textures or bounded meshes; decorative painted backdrops declare their limited view validity.

Attach the visual to the world support anchor, then apply a bounded presentation-only offset/rig transform. Shadows and selection markers resolve the relevant support below, not global `y=0`. A flying actor's height marker can disambiguate its location from its projected shadow. Never infer authoritative body size, eye height, attack reach, or flight capability from a PNG alpha silhouette or loaded model bones.

Opaque/cutout objects use meaningful depth tests and a consistent alpha-cutout policy. Translucent effects have a separate blending/depth policy and bounded sorting. Do not sort the whole world only by Z; orbit and multiple floors invalidate that assumption. Fixed lighting/unlit painted sprites are acceptable, with clearly separated visual shadow approximations. Physical occluders remain independent of camera-facing cards.

Interpolate all three coordinates between accepted visual samples. At traversal corners or level transitions, use permitted segment samples or a bounded trajectory description rather than a chord through a floor. Never send an NPC's private future route for smoothing or extrapolate hidden actors' movements. Remembered silhouettes remain frozen historical projections under the existing memory rules.

### Asset interchange and late delivery

Use normal image assets and a supported glTF/GLB 2.0 compatibility profile for model exchange; this is a chosen baseline, not a claim about the newest glTF release. Pin allowed extensions and source-axis/unit transforms. Procedural visual descriptions remain bounded data consumed by trusted code.

Validate payload sizes, dimensions, mesh/skin/animation complexity, texture budgets, extension support, and asset references. Reject embedded scripts and uncontrolled external fetches. Model-provided physics/metadata has no authority until the applicable mechanical family admits it. Keep source provenance, digest, version, and licensing in the existing asset system.

Late asset arrival is keyed by world/load epoch, entity identity, and visual revision. Discard obsolete completions and release GPU resources. A native fallback remains until valid art is ready; arrival cannot duplicate entity creation, paid generation, or simulation RNG draws. Share reusable materials/textures/atlases and cache by relevant visual versions rather than allocating every frame anew.

### Input and spatial audio presentation

Preserve one owner for pointer gestures. Primary click, drag, context-click, wheel, keyboard shortcuts, and touch must resolve before a gameplay command is emitted. Orbit/pan releases never become movement clicks. Convert CSS coordinates and render-buffer coordinates explicitly, including UI scale and device pixel ratio. Provide accessible visible controls and reduced-motion camera damping; do not take shortcut letters already assigned to panels.

Audio playback uses a renderer-independent sound presentation adapter fed by **authorized audible evidence**. Its virtual listener should follow the embodied listening policy, not silently move with the tactical camera and expose other rooms. Camera-relative panning is a presentation choice; detection and loudness semantics remain body-based. When localization is approximate, do not transmit exact hidden source coordinates merely to position a sound. Mute and accessibility settings affect playback only.

## 11. Persistence, restoration, and versioning

Follow the active no-legacy-development-save policy. Require Y and new semantic references at the cutover; reject incompatible old development formats clearly. New flat fixtures explicitly initialize `y: 0`. Do not scatter `y ?? 0` compatibility readers throughout the code.

Persist canonical geometry/shape/profile versions; entity positions/support/mode/heading; active native routes and cursors; traversal/fall state; consequential waiting/reservation order; known spatial evidence; and event-time origins. Retain the current goals and native action receipts through their existing owners.

Derived navmeshes, shape objects, GPU resources, and spatial bins can be rebuilt only when reconstruction preserves the native interpretation. Cache keys include exact source geometry and knowledge digests, clearance/profile versions, and backend/configuration versions. A cached Detour reference cannot survive a rebuild as though it were a semantic surface. Save accepted route data so a rebuild need not choose a different path halfway through an action.

Restore canonical identities first, validate support/mode/route coherence, prepare required derived data, install a coherent world, and reopen paused. A rebuild cannot manufacture encounters, perform a new AI request, consume resources twice, or reset paid retry guards. CPU-worker and GPU-load completions carry the same world/load fencing discipline as external AI work, without conflating unpaid computation and billing.

Camera preferences can persist independently; selected entities/surfaces and view grants are revalidated against the restored world. Stale upper-floor selections, remembered future entities, hidden geometry, and obsolete asset callbacks must not survive as live access to an abandoned timeline.

## 12. Performance, diagnostics, and extension limits

Instrument spatial candidate count, exact query count, ray/sweep time, route query expansions, bake queue/build time, cache hit/miss, dirty tiles, preparation pauses, route revalidations, projection bytes, and renderer CPU/GPU/resource use. Keep native simulation cost, geometry/navigation CPU work, asset-provider spend, and semantic-model spend separate. Navigation is not scheduled under the AI director's global thought interval.

Use dirty dependencies and bounded local candidate sets. Do not rebuild navigation for camera movement or animation. Do not re-embed descriptions for every Y change. Region streaming, extensive BVHs, crowd packages, and a volumetric flight provider are later measured optimizations; they are not required to get an elevated sprite walking correctly.

The numerical limits, resolution, pitch defaults, and clearance buckets are engineering parameters with explicit fixture/live measurement gates. A smooth sample scene is not proof of many-agent capacity. Correctness failures must distinguish representation limits, unknown knowledge, physical obstruction, stale state, and insufficient compute rather than hiding them behind “no path.”

The architecture supports future physical families without promising them now. Every extension must preserve **one position owner, one mechanical admission path, scoped perception, bounded native execution, and renderer-independent domain data**.

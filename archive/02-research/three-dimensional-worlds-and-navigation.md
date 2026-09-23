# Research archive: 3D worlds, navigation, and hybrid presentation

**Research snapshot: September 22, 2026.** This is a targeted primary-source design review, not an engine benchmark or a systematic survey of all games. Documentation and selected source interfaces were inspected; no third-party package was installed, no game implementation was reverse-engineered, and no OpenLegend runtime test was performed in this review.

The [spatial-world specification](../../docs/spatial-world.md) owns chosen behavior, the [runtime contract](../07-technical-architecture/spatial-world-runtime.md) owns technical requirements, and the [SW tracker](../../docs/maintainers/spatial-world.md) owns tasks and acceptance. Active experiments and unresolved product choices belong in the existing research backlog and open-decisions documents.

## Synthesis

The useful combination is a three-dimensional physical scene, surface-constrained ground navigation, a separate limited air-route representation, and interchangeable visual representations. “3D world” does not require that every creature perform free rigid-body motion or that every object have bespoke 3D artwork.

Three especially useful lessons are: separate navigation from actual movement; separate camera access from character knowledge; and separate the asset's visual representation from its physical body. The first has direct navigation-system precedent below. The latter two also follow from OpenLegend's existing authority and privacy requirements; they are not claims about how every referenced game works.

## Implementation selections and alternatives

| Responsibility | Selected starting approach | Why this fits | Important qualification |
| --- | --- | --- | --- |
| Ground routes | Recast/Detour through recast-navigation-js | Mature surface-navigation architecture; browser/Node TypeScript integration | Exact package/profile/worker behavior must be tested in this repo |
| Physical geometric tests | Rapier shape-level queries behind an adapter | Existing ray/overlap/sweep mathematics without adopting another dynamics authority | Shape-pair coverage, initialization, and cost need qualification |
| Air/connector search | ngraph.path over a bounded semantic graph | Directed weighted routes with OpenLegend-owned positions and capabilities | Graph edges still need real clearance and native execution |
| Rendering | Retain PlayCanvas behind a small interface | Existing project investment already isolates much game authority | Refactor scene/input coupling; do not assume a one-file engine swap |
| Model interchange | A supported glTF/GLB 2.0 profile | Portable mesh/skin/animation representation alongside normal images | A compatibility baseline, not a statement that 2.0 is the newest specification |

These are architectural recommendations. SW01 can reject an implementation package for a demonstrated incompatibility without changing the game's end-state requirements. Avoid maintaining several providers merely to advertise replaceability.

### Why not only extend the existing tile grid?

A properly designed layered tactical grid can represent multiple floors and meaningful height. It is a credible alternative, not inherently “fake 3D.” Merely attaching Y to the current single flat grid, however, does not provide multiple support surfaces, volumetric clearance, or flight.

For OpenLegend's continuous positions, irregular terrain, and future admitted constructions, a surface navmesh is the preferred ground representation. A layered graph remains useful for semantic connectors and constrained airspace. This is our design judgment, not evidence that XCOM uses Recast internally.

### Why not a full physics engine as the game authority?

Rigid-body simulation could supply richer movement, but it would expand the determinism, control, collision, and persistence problem substantially. The near-term requirement is predictable native walking/flying and dependable spatial tests. Use established geometry algorithms without handing position ownership to a browser physics scene.

### Why not navcat immediately?

The maintainer presents navcat as a newer pure-JavaScript alternative, and its interfaces may simplify some integrations. Recast/Detour remains the primary selection because of its established navigation design and the available Node/WASM wrapper. This review did not establish comparative performance, long-term maintenance, or production reliability. Investigate the alternative when SW01 exposes a concrete integration constraint, not as a second simultaneous implementation project.

## Annotated sources

### R01 — Recast Navigation: distinct navigation components

**Source:** [Recast official documentation](https://recastnav.com/). **Access:** overview and architecture description.

The project separates mesh construction, runtime pathfinding/querying, tile handling, and crowd movement. It supports both solo and tiled representations. This supports selecting navigation independently of crowd steering or rendering. The project's own description identifies use across major engines; that is not an independent market survey or a claim about a specific game's private implementation.

**Transfer:** choose a surface-navigation substrate and own movement/admission separately. Do not equate a navmesh with the physical scene or a free-flight volume.

### R02 — recast-navigation-js: practical TypeScript integration

**Source:** [Maintainer documentation](https://docs.recast-navigation-js.isaacmason.com/). **Access:** installation, initialization, generators, queries, temporary obstacles, and serialization/worker guidance.

The wrapper documents Node/browser ESM support, asynchronous initialization, and core/generator/WASM packages; renderer helpers are optional. Temporary blockers and structural mesh changes are different integration cases. Its worker examples demonstrate a possible pattern, not proof of this repository's Node worker packaging. The wrapper also warns that not every upstream function is exposed.

**Transfer:** use a narrow server adapter and qualify actual APIs. Do not infer navigation availability from having PlayCanvas installed or import client helper packages into the authoritative domain. Versioned documentation examples are not automatically the newest compatible dependency set.

### R03 — Detour query semantics: partial paths and wrong-floor traps

**Source:** [dtNavMeshQuery reference](https://recastnav.com/classdtNavMeshQuery.html), [off-mesh connection reference](https://recastnav.com/structdtOffMeshConnection.html), [Detour module](https://recastnav.com/group__detour.html). **Access:** relevant query and connection contracts.

Queries distinguish polygon selection, corridor finding, detail height, and surface movement. A returned path may stop before the requested end; nearest-polygon status requires inspecting the actual result. Some neighborhood operations project onto XZ, and navigation raycasts describe walkability rather than general scene visibility.

**Transfer:** bind destination support identity, inspect completeness, and use separate physical ray/sweep tests. Off-mesh connectivity needs a real traversal implementation. Semantic surface identity cannot be encoded as an unbounded collection of navigation area labels.

### R04 — Rapier geometric queries without an extra simulation owner

**Source:** [Shape API](https://rapier.rs/javascript3d/classes/Shape.html), [scene-query guide](https://rapier.rs/docs/user_guides/javascript/scene_queries/). **Access:** shape-level signatures and scene-query distinctions.

The shape API exposes ray tests, shape intersections, contacts, and moving-shape impact queries with explicit transforms. This creates an option to use collision mathematics without synchronizing a second moving rigid-body world. Broad-phase bounds alone are not exact collision tests.

**Transfer:** use these behind renderer-independent numeric interfaces; test the actual body/terrain shape combinations. This does not establish their throughput in OpenLegend or eliminate the need for snapshot consistency, stable hit ordering, tolerances, and failure coverage.

### R05 — Determinism is conditional

**Source:** [Rapier JavaScript determinism guide](https://rapier.rs/docs/user_guides/javascript/determinism/). **Access:** full short guide.

The documented guarantee depends on identical initialization/input conditions and ordering, with caveats about computations outside the library. It is not a guarantee that an application using arbitrary wall clocks, asynchronous completion order, or changed versions will reproduce outcomes.

**Transfer:** pin versions, preserve canonical inputs and accepted routes, keep native time separate from rendering, and test save/load continuity. OpenLegend's application invariants remain its own responsibility.

### R06 — ngraph.path: general graph routing

**Source:** [Maintainer repository and API examples](https://github.com/anvaka/ngraph.path). **Access:** algorithm and configuration documentation.

The package works over graphs with explicit distance, heuristic, direction, and blocking choices. Its different algorithms have different guarantees. Examples also make path-order normalization a practical integration concern.

**Transfer:** represent bounded air corridors and cross-mode connectors as directed weighted edges. The graph library does not provide clearance, physics, or a meaningful destination floor. Use a safe heuristic and test ordering instead of relying on the appearance of a two-dimensional demo.

### R07 — navcat: a relevant newer alternative

**Source:** [Maintainer documentation](https://navcat.dev/docs/), linked from the recast-navigation-js documentation. **Access:** overview and selected navigation/connection APIs.

Navcat is a pure-JavaScript navigation toolkit based on similar navmesh-generation/query concepts, with renderer-independent data and explicit connection facilities.

**Transfer:** retain a narrow ground-provider boundary so a demonstrated packaging or API limitation can be addressed. This review did not run it, compare memory/latency, or verify production adoption. Newer does not automatically mean better, and a replaceable interface does not require two installed implementations.

### R08 — Unreal: pathfinding and local avoidance are not the same job

**Source:** [Epic's navigation avoidance guide](https://dev.epicgames.com/documentation/unreal-engine/using-avoidance-with-the-navigation-system-in-unreal-engine). **Access:** official overview of avoidance approaches and limitations.

Epic describes distinct avoidance mechanisms and their relationship to navigation. A local avoidance solution can require additional containment rules; route discovery alone does not prevent moving agents from conflicting.

**Transfer:** start with one stable native yield/conflict policy. Do not run independent crowd controllers and native movement over the same actor. Add sophisticated avoidance only after its behavior and cost justify it.

### R09 — Horizon Zero Dawn: constrained air representations are credible

**Source:** Guerrilla, [Putting the AI Back Into Air](https://www.guerrilla-games.com/read/putting-the-ai-back-into-air), 2017. **Access:** developer talk abstract, not a full inspection of the presentation slides or source code.

The abstract describes runtime heightmap-based air navigation, hierarchical refinement, and transitions between air and ground behavior.

**Transfer:** aerial navigation need not begin as a dense universal volume. OpenLegend's proposed corridor graph is its own simpler engineering choice, not a reproduction of Guerrilla's algorithm. The abstract does not establish support for arbitrary stacked caves or provide performance guarantees transferable to this game.

### R10 — XCOM 2: camera controls and floor focus are separate

**Source:** [Feral's official XCOM 2 manual](https://www.feralinteractive.com/en/manuals/xcom2/latest/steam/), tactical controls. **Access:** controls and selected tactical interface descriptions.

The manual exposes independent camera pan, rotation, zoom, recenter, and floor ascent/descent controls.

**Transfer:** offer a distinct level-focus operation rather than overloading all camera motion into zoom or moving the actor. Do not copy shortcut keys that conflict with OpenLegend's existing panels. This documents user-facing behavior, not XCOM's pathfinding algorithm.

### R11 — XCOM 2: authored spatial building blocks with procedural assembly

**Source:** Brian Hess, Firaxis, [Plot and Parcel: Procedural Level Design in XCOM 2](https://gdcvault.com/play/1025387/Plot-and-Parcel-Procedural-Level), GDC 2018. **Access:** session description; the full talk was not reviewed.

The session concerns combining procedural assembly and level-design building blocks.

**Transfer:** favor admitted spatial families and authored constraints that can be composed into varied locations over unbounded generated geometry. This is inspiration for the workflow; it does not prove a particular collision, navigation, or simulation backend.

### R12 — PlayCanvas: tactical cameras are within the existing renderer's scope

**Source:** [Orbit-camera tutorial](https://developer.playcanvas.com/tutorials/orbit-camera/), [camera concepts](https://developer.playcanvas.com/user-manual/graphics/cameras/), [camera controls](https://developer.playcanvas.com/user-manual/graphics/cameras/camera-controls/). **Access:** official camera guidance and example interfaces.

The engine documents orbit/pan/zoom examples, camera transforms, and orthographic/perspective rendering. Existing controls can inform implementation without changing engines.

**Transfer:** keep camera state and gameplay gesture arbitration in OpenLegend, converting to PlayCanvas objects at the adapter. Verify examples against the pinned engine version. No sample's picking result establishes character sight or server authority.

### R13 — PlayCanvas: hybrid rendering, picking, and optional physics

**Source:** [2D graphics](https://developer.playcanvas.com/user-manual/2D/), [entity picking](https://developer.playcanvas.com/tutorials/entity-picking/), [physics ray casting](https://developer.playcanvas.com/user-manual/physics/ray-casting/). **Access:** official feature/tutorial descriptions.

PlayCanvas supports sprite assets within its 3D rendering environment and documents several picking approaches. Its physics raycast examples presuppose the relevant physics setup; a rendered model alone does not establish a collision world.

**Transfer:** mix sprites and meshes, choose appropriate visual picking, and keep physical queries independent. The review did not identify an authoritative built-in navigation subsystem to rely on; the chosen external navigation adapter avoids making that assumption.

### R14 — Hades II: mixed-dimensional art is a production direction, not a contradiction

**Source:** DigiPen's direct developer interview, [Devansh Maheshwari Programs God Tier Graphics in Hades II](https://www.digipen.edu/showcase/news/hades-2-graphic-programmer). **Access:** interview text.

The graphics engineer discusses real-time 3D characters within a painterly presentation and the animation opportunities that change provides.

**Transfer:** an art direction can preserve painted visual character while using different runtime representations. This review does not promise Hades-quality animation from a generated sprite or apply that game's memory/performance results to OpenLegend.

### R15 — Portable assets and runtime loading

**Source:** [Khronos glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [PlayCanvas asset loading/unloading](https://developer.playcanvas.com/user-manual/assets/loading-unloading/). **Access:** coordinate/interchange and asset lifecycle sections.

The selected glTF compatibility profile provides explicit geometry/animation data and coordinate conventions; renderer assets have an explicit loading lifecycle.

**Transfer:** retain portable asset bytes/metadata and isolate GPU objects, with bounded validation and disposal. Neither an imported asset nor a successful load grants a physical capability. Choosing glTF 2.0 here does not assert it is the latest standard.

### R16 — Spatial audio: transmission, rooms, and evidence are different concerns

**Source:** [Audiokinetic Spatial Audio documentation, versioned 2024.1.2](https://www.audiokinetic.com/library/2024.1.2_8726/?id=pg_features_spatialaudio.html&source=UE4), [PlayCanvas SoundComponent](https://api.playcanvas.com/engine/classes/SoundComponent.html). **Access:** room/portal/transmission overview and playback API.

The documentation separates geometric/acoustic propagation structures from the act of playing positional audio.

**Transfer:** start with coarse distance and barrier transmission, leave room/portal routing as a future quality improvement, and prevent playback settings or camera motion from changing authoritative hearing. This is not a recommendation to adopt Wwise or a claim that normalized game scores model calibrated acoustics.

## What the research does not settle

None of these sources establishes the right navmesh resolution, clearance bucket count, population ceiling, pitch range, sprite-direction count, or worker budget for OpenLegend. Package support and examples do not establish its integration quality. Those values require the SW fixture and performance work.

The hardest project-specific boundaries are not solved by choosing a package: a route cannot reveal hidden topology; a cutaway cannot create bodily sight; a physics query must see the correct candidate snapshot; a cache miss must not become in-world time; and a newly generated image cannot change the body's mechanics. The runtime contract makes those requirements explicit rather than attributing them to a reference game.

This design intentionally avoids a complete renderer rewrite, a universal physics sandbox, a dense voxel world, and a new AI-driven pathfinding loop. It selects narrow, tested primitives while keeping higher-fidelity extensions possible.

## Algorithmic follow-up: lazy native work

The native implementation now uses lazy exact stance/edge evaluation over a bounded lattice, rather than the original researched vendor stack. [Boost Graph's A* documentation](https://www.boost.org/doc/libs/latest/libs/graph/doc/html/graph/algorithms/shortest_paths/astar_search.html) describes on-demand neighbor expansion for implicit graphs. This is algorithmic precedent, not a new OpenLegend dependency or evidence that our partial-lattice representation is a fully implicit infinite graph. The finite cardinal/seam heuristic and closed-region proof are OpenLegend-specific and remain qualified by the [runtime contract](../07-technical-architecture/spatial-world-runtime.md#initial-native-provider) and SR11.

[Immer's performance guidance](https://immerjs.github.io/immer/performance/) motivates reducing expensive proxy searches and reusing unchanged structure. OpenLegend keeps its pinned Immer 10.1.1 and public native mutation boundaries; it does not adopt APIs from a newer documentation version. Participant IDs are collected before the native draft and refreshed at known replacement boundaries, while permitted observations receive one isolated deep copy. The [third-pass measurements](../../docs/verification.md#spatial-scaling-review-third-pass), rather than upstream advice, establish the observed benefit and the rejected snapshot experiment.

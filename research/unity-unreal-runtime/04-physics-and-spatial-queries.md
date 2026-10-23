# Physics, collision, and spatial queries

| Research status                              | Scope                                                                                                                                                                   | Reviewed   |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Complete for the documented mechanisms below | Collision representation, broadphase maintenance, rigid-body solving, continuous collision, spatial queries, current 2D physics, deformables, and diagnostic boundaries | 2026-10-23 |

Physics cost depends on what is represented, which pairs or queries become candidates, how contacts are solved, and when results become available. Those are separate stages. A cheaper representation can change the answer; a delayed result can remain pending; a non-allocating query can still be incomplete. This chapter examines those distinctions in **Unreal Engine 5.8**, **Unity 6.6**, and **Unity Physics 6.6.0**. Patch baselines and the evidence policy are in [chapter 01](01-evidence-and-version-baseline.md).

This is research into documented engine behavior. It does not prescribe OpenLegend physics, collision shapes, simulation frequencies, or implementation work.

## 1. There is more than one physics world or backend

| Current system        | Representation and responsibility                                                                                                                                              | Evidence                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Unreal Chaos          | Unreal's physics family includes rigid bodies, destruction, cloth, ragdolls, fields, and deformable systems; individual extensions have their own maturity and coupling limits | [Physics in Unreal Engine][S04-01]     |
| Unity built-in 3D     | GameObject physics uses the PhysX integration by default                                                                                                                       | [Physics integrations][S04-02]         |
| Unity built-in 2D     | Rigidbody2D/Collider2D components use a separate Box2D integration                                                                                                             | [Physics integrations][S04-02]         |
| Unity Physics 6.6.0   | Data-oriented physics package with an ECS-facing pipeline and independently usable simulation/query structures                                                                 | [Design][S04-16]; [Pipeline][S04-15]   |
| Unity Physics Core 2D | The current `Unity.U2D.Physics` API is based on Box2D version 3 and is separate from built-in Rigidbody2D/Collider2D components                                                | [Physics Core 2D introduction][S04-05] |

**Provenance exception: Havok.** The Unity 6.6 integrations page still includes an additional-resources link to Havok. That link does not establish current editor support. Unity's live support notice retains Havok Physics for Unity support for the remaining Unity 2022 LTS and 6.0 LTS periods, while the 6000.5.0f1 release explicitly marks the package unsupported on that editor. This dossier therefore does not present the older Havok package as a supported Unity 6.6 alternative. The older release is used to document removal, not to infer current solver implementation. [Current support notice][S04-03]; [6000.5.0f1 removal record][S04-04]

The inspected Unity documents establish PhysX as a backend, but do not establish its precise embedded SDK revision. Features in the newest standalone NVIDIA SDK cannot automatically be attributed to Unity's integration. Likewise, Box2D version 3 in Physics Core 2D does not establish that the older component integration uses the same version or has identical behavior.

## 2. Collision representation determines which questions can be answered

### Participation is more precise than an enabled checkbox

Unreal's current `ECollisionEnabled::Type` API distinguishes six participation modes. This matters because bodies can exist for queries, simulation, both, or probes rather than always incurring the same work. [Collision-enabled API][S04-06]

| Mode            | Documented participation             |
| --------------- | ------------------------------------ |
| NoCollision     | No physics-engine representation     |
| QueryOnly       | Raycasts, sweeps, and overlaps       |
| PhysicsOnly     | Rigid-body and constraint simulation |
| QueryAndPhysics | Queries and simulation               |
| ProbeOnly       | Probing the physics simulation       |
| QueryAndProbe   | Queries and simulation probing       |

The current Collision Response Reference still describes only four states. Its list is therefore incomplete relative to the current enum. This is a concrete case where a page headed “5.8” contains inherited text that should not be treated as a complete current contract. The table above follows the API; it does not infer undocumented probe response details. [Collision Response Reference][S04-07]

### Geometry used for collision need not match rendered geometry

Unreal distinguishes primitive/convex simple collision from triangle-mesh complex collision. Routing complex queries to simple geometry can avoid retaining triangle data. Routing simple queries to complex geometry preserves different surface detail, but an object using complex collision as simple cannot itself be simulated through that mode, although it can collide with suitably represented simulated objects. These choices change both memory and the permitted behavior of the body. [Simple versus Complex Collision][S04-08]

Unity similarly distinguishes primitives, convex meshes, non-convex meshes, and compounds. Non-convex meshes are unsuitable for dynamic Rigidbody simulation; a compound of simpler colliders can represent concavity through multiple shapes. Shape count, triangle count, motion, and contact patterns all matter. A global claim that one collider family is always faster would exceed the evidence. [Collider types and performance][S04-09]

Unity's mesh cooking prepares collision data before it is used. Additional cooking can improve later collision performance while increasing setup cost; mesh cleaning and welding address input quality. Runtime creation or modification of collision geometry can therefore move substantial work into a frame that otherwise appears to contain little simulation. “Precomputed” describes when work occurs, not its elimination. [Mesh cooking options][S04-10]

**Interpretation.** A visible opening and a collision opening are not necessarily identical. A ray against simplified collision can answer a different visibility question from a ray against rendered triangles. Even an exact geometric hit does not establish that a character attended to, identified, remembered, or understood the object. Those additional meanings remain separate from the geometric query, as discussed in [chapter 02](02-simulation-and-perception.md).

## 3. Broadphase, filtering, and incremental maintenance avoid different work

Broadphase identifies plausible interacting pairs using cheaper bounds; narrowphase performs more detailed shape/contact work. Unreal's Chaos Visual Debugger exposes snapshots before and after these stages, including overlapping-bounds pairs and subsequent constraint solving. This is useful evidence of the actual pipeline rather than an assumption that every body is tested in detail against every other body. [Chaos Visual Debugger][S04-36]

Unity's built-in 3D sweep-and-prune sorts bounding intervals to reject separated pairs. Multibox and automatic box pruning partition space before running local pruning; they can reduce excess candidate pairs in large, relatively flat scenes. Maintaining cells and handling objects crossing their boundaries introduces its own cost, so subdivision is not a free reduction in work. [Broadphase optimization][S04-11]

Current Chaos controls expose separate static/dynamic acceleration structures, dynamic bounding-volume trees, and padded bounds that can reduce update frequency. The same catalog documents time-sliced tree construction and a queue threshold that can force completion without time slicing. A configured build budget therefore does not imply that every overload path preserves a strict per-frame ceiling. These are exposed controls, not a claim that every project uses identical settings. [Chaos acceleration controls][S04-12]

Unity Physics 6.6 exposes **incremental static and dynamic broadphase** options. They update changed parts between simulation steps and can avoid rebuilding unchanged body data. The same PhysicsStep API exposes solver iterations, substeps, multithreading, depenetration limits, and optional post-step collision-world synchronization. **Interpretation:** these incremental structures qualify the package's broad “stateless” design description; that description must not be expanded into a claim that no auxiliary acceleration data persists between steps. [PhysicsStep][S04-13]; [Design philosophy][S04-16]

Unity Physics collision filtering uses membership and accepted-layer masks, with an optional shared group index overriding mask checks: equal positive group values permit interaction and equal negative values reject it. Filtering is part of the query/collision contract, not only an optimization toggle. [CollisionFilter][S04-14]

**Interpretation.** Bounds and indexes trade maintenance effort for candidate reduction. Conservative bounds can return extra candidates that later tests reject. Missing a true candidate is a correctness failure relative to the represented collision world. An index can be computationally efficient yet stale if changes to geometry, transforms, filters, or residency have not reached it. The inspected APIs describe useful maintenance mechanisms but do not prove that arbitrary application mutation is automatically accounted for.

## 4. Advancing a physical world involves several distinct stages

### Unity Physics: explicit pipeline and customization boundaries

Unity Physics runs its PhysicsSystemGroup within the fixed-step simulation group. Initialization builds the physics-world representation from ECS state. Simulation produces body pairs, creates contacts, constructs contact/joint Jacobians, solves and integrates. Export writes resulting transforms and velocities back into ECS components. Custom systems can be ordered between these phases; their dependencies determine which intermediate data they can safely inspect or modify. [Physics pipeline][S04-15]

| Pipeline stage            | Why the distinction matters                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| Build or update the world | Establishes the geometry, motion, and filters available to the step    |
| Find body pairs           | Rejects most separated or ineligible combinations                      |
| Generate contacts         | Determines actual contact data from candidate shapes                   |
| Build constraints         | Converts contacts and joints into the relationships solved numerically |
| Solve and integrate       | Updates motion subject to the admitted constraints                     |
| Export results            | Makes completed physical state available to ECS consumers              |

Unity Physics' design describes a stateless solver that avoids requiring hidden persistent solver caches to reproduce a step, supporting immediate simulation and explicit state control. It also describes the package as deterministic. This dossier does not extend that statement to an unqualified guarantee across arbitrary architectures, floating-point settings, package changes, job schedules, or application input ordering; the inspected design page does not specify all those boundaries. [Unity Physics design][S04-16]

### Chaos: connected islands and iterative contact solving

Chaos' `FPBDIsland` groups connected particles and constraints. A dynamic particle belongs to one island; a kinematic particle can participate in more than one. Adding connecting constraints can merge islands. The API exposes sleep state, sleep counters, and partial-island behavior. These groups reflect physical dependencies: splitting objects into unrelated work units would not preserve constraints connecting them. [FPBDIsland][S04-17]

The collision solver API exposes contact manifolds with normals, tangents, position differences, velocity targets, and mass properties. It has separate iterative position-correction and velocity-correction methods, with friction and hard/soft-contact configuration. This explains why producing a contact is not the end of collision cost: the contact participates in numerical work that can repeat. The public interface is insufficient to reconstruct every internal convergence heuristic or infer a universal maximum cost per contact. [FPBDCollisionSolver][S04-18]

Current Unreal physics settings expose asynchronous physics stepping with a fixed interval, maximum physics delta, maximum substep duration/count, and Chaos-specific partial-island sleep and wake controls. A physics thread and a game-thread frame can therefore have different progression. The settings page also retains unrelated legacy PhysX/APEX comments; only the explicitly relevant modern fields support this account. The older sub-stepping guide's mobile/APEX statements are not treated as current platform limits. [UPhysicsSettings][S04-19]; [Scheduling provenance discussion](02-simulation-and-perception.md)

### Built-in Unity 3D: solver quality, sleep, and cadence

Unity exposes position and velocity iteration controls, Projected Gauss-Seidel and Temporal Gauss-Seidel solvers, contact offsets, and energy-based sleep thresholds. Its enhanced-determinism setting is conditional on deterministic actor insertion order and carries a cost. These settings affect solver quality or reproducibility; none proves complete application determinism. [Physics project settings][S04-20]

Sleeping bodies avoid continuing ordinary active-body calculations and can wake after forces or collisions. Explicit sleep/wake operations also exist. Repeatedly waking otherwise resting bodies prevents the saving. [Rigidbody sleeping][S04-39]

Manual simulation supports controlling when the default or a local PhysicsScene advances. The current manual specifically warns that variable, large steps can be inaccurate or unstable, and that fixed steps alone do not remove every PhysX determinism challenge. Manual scheduling transfers responsibility for cadence and synchronization; it does not make fewer solved intervals physically equivalent to more intervals. [Manual simulation][S04-21]

**Interpretation.** A rendering frame, a fixed simulation interval, a substep, and a solver iteration are different units. More iterations improve a solve at its sampled state; more substeps also change when motion and contacts are sampled. Sleeping concerns physical motion and contact dependencies. It is not evidence that unrelated world processes—memory, hunger, social commitments, or elapsed-time consequences—can stop without changing their meaning.

## 5. Continuous collision detection has explicit approximations

Unity's sweep-based CCD searches along linear motion for time of impact, advances to an impact, updates motion, and can sweep again. Its documented limitation is angular motion: a rotating flipper can contact something without the body's linear sweep representing that movement. Additional sweeps and substeps cost more when many nearby bodies move rapidly. [Sweep-based CCD][S04-22]

Speculative CCD expands a body's bounds using predicted linear and angular movement, then admits potential contacts to the solver. It avoids the same repeated time-of-impact sweeps, but can create ghost contacts with misleading normals and can still miss collisions. Its broader prediction is therefore not equivalent to exact continuous geometry. [Speculative CCD][S04-23]

**Interpretation.** CCD is a family of approximations with different failure modes. A larger broadphase envelope can reduce missed candidates while adding contacts that constrain motion unnecessarily. A linear sweep can be precise for the swept trajectory while failing to represent rotation. The reviewed Chaos sources establish CCD controls and solver stages, but do not justify assigning Unity's exact CCD algorithms or limits to Chaos.

## 6. Queries have freshness, completion, and capacity contracts

### Query shape and collection policy change work

Unity Physics supports querying one collider, the global CollisionWorld, or an independently constructed world. Its collision world uses a broadphase tree. Any-hit collectors can stop early; closest-hit and all-hit collection retain different information. Collider sweeps, point/collider distances, and AABB overlaps answer different geometric questions. In particular, AABB overlaps return candidate body indices rather than proof of exact shape overlap. [Collision queries][S04-24]

The same manual states that the query broadphase is normally built during initialization and is not automatically updated again after the solve. Optional collision-world synchronization pays an additional update to make post-step results available earlier. Querying before that update asks about the available snapshot, not necessarily the most recently integrated transforms. [Collision queries][S04-24]

For built-in Unity 3D, changes made directly to Transform components can await synchronization with physics. `Physics.SyncTransforms` explicitly applies those changes before a query that needs them; automatic synchronization can introduce repeated hidden work when transform changes and queries are interleaved. [Transform synchronization][S04-25]

Unity also documents query-only use with scripted simulation disabled. Collision queries can remain useful without advancing dynamics, but directly moved transforms still require the appropriate synchronization. Stopping the solver does not imply that the spatial representation ceases to need maintenance. [Query-only physics][S04-26]

### Deferred work is not an immediate answer

Unreal's asynchronous line-trace API returns a handle and supports a delegate or polling. The documentation limits result availability to the next frame after submission. Its modes distinguish a boolean test from single- or multiple-hit information. Consumers therefore have both an asynchronous completion boundary and a finite result window; the API does not promise that the submitted scene will remain unchanged until a result is consumed. [AsyncLineTraceByChannel][S04-27]

Unity's RaycastCommand schedules batches whose result buffers must not be read before their job completes. Each command owns a slice determined by `maxHits`. A null collider marks the first invalid result; later unwritten entries need not be null. The batch profiler marker does not provide a count of individual queries. Correct interpretation depends on the per-command layout and completion contract, not merely obtaining an array. [RaycastCommand][S04-28]

Unity's OverlapSphereNonAlloc writes into the caller's array without growing it and returns the array length when full. **Inference:** that count alone cannot distinguish exactly-capacity results from truncation of a larger result set. Avoiding allocations does not establish that every matching collider was returned. [OverlapSphereNonAlloc][S04-29]

| Observed state                   | What it establishes                                  | What it does not establish                                 |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Query scheduled                  | Work was submitted                                   | A result already exists                                    |
| Broadphase candidate             | Bounds/filter conditions admitted it                 | Exact surface intersection                                 |
| Completed zero-hit query         | No admitted hit in that query's represented snapshot | No relevant object in omitted/unloaded/unsynchronized data |
| Full fixed-capacity result array | The available result capacity was filled             | The complete set was returned                              |
| Completed older result           | The requested calculation finished                   | Its assumptions remain valid after world changes           |

The table is analytical synthesis of the preceding contracts. It is not an additional engine API or an OpenLegend result protocol.

## 7. Current Unity Physics Core 2D deserves separate treatment

Physics Core 2D is not a renamed interface to the familiar 2D components. The current manual describes contiguous storage, direct struct-based objects, batched creation, 64 collision layers, multiple isolated worlds, and integration with job-based code. Its documented platform requirement includes compute-shader support, even though the described simulation work uses CPU workers. The page's performance and determinism claims are vendor descriptions, not comparative measurements performed for this research. [Physics Core 2D introduction][S04-05]

A body owns position, rotation, and velocity; shapes supply its geometric area. Definitions hold creation settings. Creating physical objects does not automatically move a GameObject's Transform or supply a sprite; that connection is explicit. This separates physical data from scene-object presentation. [Physics Core 2D workflow][S04-30]

Unity creates a default world and recreates it at Editor/Play-mode lifecycle boundaries. Additional worlds can be created and individually paused. World isolation is a simulation boundary: bodies in one world do not automatically interact with bodies in another. [World lifecycle][S04-31]; [PhysicsWorld API][S04-40]

The multithreading guide describes many simultaneous readers and one writer per world. Different worlds can accept writes concurrently. Creation and destruction operations, including their batch variants, are explicitly excluded from the operations guaranteed safe in jobs. The simulation-worker setting is also distinct from application jobs calling queries. “Thread-safe API” therefore cannot be interpreted as permission to mutate every object concurrently in every phase. [Physics Core 2D multithreading][S04-32]

Destroying a body destroys its shapes, chains, and attached joints; destroying a world destroys its contained objects. Handles expose validity checks. Allocating NativeArray results have an explicit allocator/disposal obligation, separate from destroying physical bodies. The guide also uses broad language about disposing spans; this dossier does not convert that into a general .NET rule that ReadOnlySpan itself owns or disposes memory. Ownership must follow the exact return type and allocation contract. [Object and memory lifecycle][S04-33]

Its query API distinguishes direct geometry intersections, world ray/shape casts, boolean overlap tests, and queries returning matching objects. These allow callers to request different answer sizes without first representing every query shape as a persistent body. [Physics Core 2D intersections][S04-34]

Contact callbacks require world-level callback dispatch plus shape-level event enablement and a callback target. Thus contact generation, physical response, and application notification remain distinct concerns even in this newer API. [Physics Core 2D contact callbacks][S04-35]

**Interpretation.** This API makes world ownership and data/presentation separation unusually explicit. It also demonstrates why “Unity 2D physics” is now an insufficient version or architecture description. Findings about this API must not be silently applied to Rigidbody2D components, Unity Physics' 3D ECS package, or PhysX GameObjects.

## 8. Destruction, fields, cloth, and soft bodies limit coupling deliberately

Unreal destruction uses Geometry Collections, clustering, damage thresholds, and connection/support structures. Cached simulation can replay transforms and events while selected portions return to simulation on interaction. That separates repeatable recorded motion from actively solved motion. The overview does not establish that arbitrary cached motion responds to every new circumstance as a fresh solve would. [Physics in Unreal Engine][S04-01]

Physics Fields describe spatially varying effects such as forces, strain, anchoring, and disabling. Transient fields execute and disappear; persistent fields continue evaluation until removed; construction fields configure retained setups. State/type filters restrict affected particles. World-field sampling by materials or Niagara is distinct from applying a field to Chaos simulation, and approximate clipmap sampling differs from analytic field evaluation. [Physics Fields overview][S04-38]

The Chaos Cloth asset workflow separates simulation and render meshes and authors simulation through Dataflow. The current overview describes XPBD constraints and level-set-volume collision, with additional component/rendering overhead from independently rendered cloth assets. It retains its 5.3 introduction; that introduction is historical provenance, not evidence that these features first appeared in 5.8. The page does not establish one maturity label for every cloth option. [Panel Cloth overview][S04-41]

Unity's built-in Cloth is attached to a Skinned Mesh Renderer. It interacts only with explicitly supplied supported colliders, and its response is one-way: cloth reacts without applying equal forces back into the world. Its supported collider families and per-vertex constraints restrict the problem being solved. Visually plausible clothing therefore does not establish a general two-way deformable-body model. [Unity Cloth][S04-42]

**Chaos Flesh remains Experimental.** It uses tetrahedral volume geometry, kinematic/weak constraints, a separate solver actor, and transfer to a rendering surface. The overview describes low-resolution runtime solving and cached higher-resolution results, with configurable ordering relative to the world solver and explicit limits on environmental coupling. These distinctions matter more than the general label “soft-body physics”: a cached surface, an actively simulated volume, and a rigid-body interaction have different work and causal behavior. [Chaos Flesh maturity][S04-43]; [Chaos Flesh overview][S04-44]

**Interpretation.** One-way coupling and recorded motion are legitimate ways to avoid expensive feedback. They also define what the simulation can affect. Reducing a visual mesh's detail and removing a mechanically meaningful interaction are different operations. This chapter makes no assumption that every visual effect must participate in authoritative world simulation, or that a visually convincing effect proves that it does.

## 9. Diagnostics reveal stage boundaries; they do not supply missing semantics

Chaos Visual Debugger records physical data and distinguishes game-thread frames, solver frames, and within-step stages. A game frame can correspond to multiple solver frames. Separate timelines allow a discrepancy to be located before contact generation, during solving, or after integration rather than inferred only from the final rendered pose. Its documented recording/playback mechanisms were inspected; the embedded talk was not watched for this chapter. [Chaos Visual Debugger][S04-36]

Unity's Physics Debug window visualizes collision geometry, contacts, queries, body information, centers of mass, and inertia. The view exposes what the physics representation contains rather than assuming the visual mesh is the collision truth. [Physics Debug window][S04-37]

**Interpretation.** A useful explanation of a missed or delayed interaction follows the evidence through representation, residency, synchronization, filtering, candidate generation, detailed testing, solving, and result delivery. A single frame-time number cannot identify which boundary failed. Conversely, a geometric debugger cannot establish that an NPC legitimately knew a fact or that an asynchronous consumer interpreted a full result buffer correctly.

## Evidence limits

- This chapter does not claim the engines use one universal broadphase, solver, threading schedule, or determinism guarantee across all integrations and platforms.
- The current documentation describes controls and API contracts more completely than worst-case overload behavior. Strict latency, fairness, and memory ceilings are not inferred where unspecified.
- Source pages with newer version headers sometimes retain old prose, incomplete enumerations, or loose explanations. The identified conflicts are retained as provenance findings rather than silently normalized.
- No engine was run and no performance numbers were measured. A source describing an optimization establishes a mechanism or vendor claim, not its benefit for OpenLegend.

## Source and provenance register

All sources below were inspected on **2026-10-23**. “Current” means the specified version or live page as retrieved, not a guarantee that every sentence was recently rewritten. Sources support the nearby claims only; publication dates are not invented for undated manuals. The Unity 6000.6 manuals inspected here generally carry October 2026 build stamps. Package API metadata identifies Unity Physics **6.6.0**.

| ID     | Source                                       | Version/date and medium                                | Inspection and limits                                                               |
| ------ | -------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| S04-01 | [Physics in Unreal Engine][S04-01]           | UE 5.8, undated manual                                 | Physics family and destruction mechanisms read; no performance measurement inferred |
| S04-02 | [Physics integrations in Unity][S04-02]      | Unity 6.6, manual built 2026-10-22                     | Backend distinctions read; extra Havok link is not compatibility evidence           |
| S04-03 | [Unity subscription/support updates][S04-03] | Live official notice; relevant announcement 2025-11-10 | Havok support continuation/removal scope read; pricing not researched here          |
| S04-04 | [Unity 6000.5.0f1][S04-04]                   | 2026-06-15 release notes                               | Deprecated-package section read solely as removal provenance                        |
| S04-05 | [Physics Core 2D introduction][S04-05]       | Unity 6.6 manual                                       | API/backend distinction, platform requirement, data/thread model read               |
| S04-06 | [ECollisionEnabled::Type][S04-06]            | UE 5.8 current API                                     | All six values read                                                                 |
| S04-07 | [Collision Response Reference][S04-07]       | UE 5.8 manual, inherited text                          | Four-state description conflicts with current enum completeness                     |
| S04-08 | [Simple versus Complex Collision][S04-08]    | UE 5.8 manual                                          | Shape routing, simulation limitation, memory tradeoff read                          |
| S04-09 | [Collider types and performance][S04-09]     | Unity 6.6 manual                                       | Shape families and dynamic-body limitations read                                    |
| S04-10 | [Mesh cooking options][S04-10]               | Unity 6.6 manual                                       | Setup/runtime cost and cleaning/welding read; no universal cost ranking adopted     |
| S04-11 | [Broadphase optimization][S04-11]            | Unity 6.6 manual                                       | Pruning methods and subdivision tradeoffs read                                      |
| S04-12 | [Console Variables Reference][S04-12]        | UE 5.8 current generated reference                     | Selected Chaos acceleration controls inspected; not a full source-code audit        |
| S04-13 | [PhysicsStep][S04-13]                        | Unity Physics 6.6.0 API, built 2026-10-16              | Incremental broadphase, solver/substep/synchronization fields read                  |
| S04-14 | [CollisionFilter][S04-14]                    | Unity Physics 6.6.0 API                                | Masks and group overrides read                                                      |
| S04-15 | [Physics pipeline][S04-15]                   | Unity Physics 6.6.0 manual                             | Phase ordering and ECS boundaries read                                              |
| S04-16 | [Unity Physics design][S04-16]               | Unity Physics 6.6.0 manual                             | Stateless/deterministic vendor description read; scope qualification retained       |
| S04-17 | [FPBDIsland][S04-17]                         | UE 5.8 API                                             | Connectivity, ownership, merge and sleep interfaces read                            |
| S04-18 | [FPBDCollisionSolver][S04-18]                | UE 5.8 API                                             | Contact-manifold and iterative correction methods read                              |
| S04-19 | [UPhysicsSettings][S04-19]                   | UE 5.8 API, mixed-age comments                         | Modern Chaos/async fields read; legacy PhysX/APEX remarks not generalized           |
| S04-20 | [Physics project settings][S04-20]           | Unity 6.6 manual                                       | Solver, iterations, sleep, and determinism scope read                               |
| S04-21 | [Manual simulation][S04-21]                  | Unity 6.6 manual                                       | Cadence, local scenes, fixed-step caveat read                                       |
| S04-22 | [Sweep-based CCD][S04-22]                    | Unity 6.6 manual                                       | Linear sweep, impact handling, angular limitation read                              |
| S04-23 | [Speculative CCD][S04-23]                    | Unity 6.6 manual                                       | Expanded bounds, possible ghost/missed contacts read                                |
| S04-24 | [Collision queries][S04-24]                  | Unity Physics 6.6.0 manual                             | Collectors, query kinds, snapshot synchronization read                              |
| S04-25 | [Transform synchronization][S04-25]          | Unity 6.6 manual, built 2026-10-22                     | Deferred state and explicit synchronization read                                    |
| S04-26 | [Query-only physics][S04-26]                 | Unity 6.6 manual                                       | Queries without default stepping read; loose deprecation wording not adopted        |
| S04-27 | [AsyncLineTraceByChannel][S04-27]            | UE 5.8 API                                             | Callback/polling and next-frame result window read                                  |
| S04-28 | [RaycastCommand][S04-28]                     | Unity 6.6 API                                          | Job completion, result layout, invalid sentinel, profiling limit read               |
| S04-29 | [OverlapSphereNonAlloc][S04-29]              | Unity 6.6 API                                          | Fixed-capacity behavior read; ambiguity conclusion explicitly inferred              |
| S04-30 | [Physics Core 2D workflow][S04-30]           | Unity 6.6 manual                                       | Bodies, shapes, definitions, presentation separation read                           |
| S04-31 | [Physics Core 2D worlds][S04-31]             | Unity 6.6 manual, built 2026-10-22                     | Default-world recreation and pause lifecycle read                                   |
| S04-32 | [Physics Core 2D multithreading][S04-32]     | Unity 6.6 manual                                       | Per-world locking and excluded create/destroy methods read                          |
| S04-33 | [Physics Core 2D memory lifecycle][S04-33]   | Unity 6.6 manual, built 2026-10-22                     | Destruction and NativeArray ownership read; broad span wording not generalized      |
| S04-34 | [Physics Core 2D intersections][S04-34]      | Unity 6.6 manual                                       | Geometry/world query families read                                                  |
| S04-35 | [Physics Core 2D contacts][S04-35]           | Unity 6.6 manual                                       | World/shape/target event admission read                                             |
| S04-36 | [Chaos Visual Debugger introduction][S04-36] | UE 5.8 manual                                          | Recording and timelines/stages read; embedded video not watched                     |
| S04-37 | [Physics Debug window][S04-37]               | Unity 6.6 manual                                       | Diagnostic tabs and geometry/contact/query display read                             |
| S04-38 | [Physics Fields overview][S04-38]            | UE 5.8 manual                                          | Field lifetimes, filters, physics/world sampling distinction read                   |
| S04-39 | [Rigidbody sleeping][S04-39]                 | Unity 6.6 manual, built 2026-10-22                     | Wake/sleep behavior read; energy threshold taken from settings reference            |
| S04-40 | [PhysicsWorld][S04-40]                       | Unity 6.6 API                                          | World isolation/capacity overview and acceleration-bound remarks inspected          |
| S04-41 | [Panel Cloth overview][S04-41]               | UE 5.8 manual with retained 5.3 introduction           | Simulation/render separation and current documented capabilities read               |
| S04-42 | [Cloth][S04-42]                              | Unity 6.6 manual, built 2026-10-22                     | One-way interaction and supported colliders read                                    |
| S04-43 | [Chaos Flesh plugin][S04-43]                 | UE 5.8 plugin index, Experimental                      | Current maturity label inspected                                                    |
| S04-44 | [Chaos Flesh overview][S04-44]               | UE 5.8 manual                                          | Tetrahedra, constraints, solver ordering, coupling and caching read                 |

### Inspected leads not used as current implementation evidence

The [incremental-static-broadphase issue tracker entry](https://issuetracker.unity.com/issues/21481) returned only the site shell. Its title suggests a specific failure mode, but the affected/fixed versions and body were unavailable, so this chapter makes no claim that the bug affects the current baseline. The [PhysicsWorld.GetBodyEvents URL](https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Unity.U2D.Physics.PhysicsWorld.GetBodyEvents.html) was inaccessible; no event-buffer ownership conclusion was taken from it. Older Unity/Havok manuals, PhysX SDK links embedded in current manuals, and older cloth tutorials were not used to infer uncorroborated current behavior.

[S04-01]: https://dev.epicgames.com/documentation/en-us/unreal-engine/physics-in-unreal-engine
[S04-02]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-integrations.html
[S04-03]: https://unity.com/products/pricing-updates
[S04-04]: https://unity.com/releases/editor/whats-new/6000.5.0f1
[S04-05]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-introduction.html
[S04-06]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/ECollisionEnabled__Type
[S04-07]: https://dev.epicgames.com/documentation/en-us/unreal-engine/collision-response-reference-in-unreal-engine
[S04-08]: https://dev.epicgames.com/documentation/en-us/unreal-engine/simple-versus-complex-collision-in-unreal-engine
[S04-09]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-collider-types.html
[S04-10]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-mesh-cooking-options.html
[S04-11]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-broad-phase.html
[S04-12]: https://dev.epicgames.com/documentation/en-us/unreal-engine/unreal-engine-console-variables-reference
[S04-13]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/api/Unity.Physics.PhysicsStep.html
[S04-14]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/api/Unity.Physics.CollisionFilter.html
[S04-15]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/manual/physics-pipeline.html
[S04-16]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/manual/design.html
[S04-17]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Chaos/FPBDIsland
[S04-18]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Chaos/FPBDCollisionSolver
[S04-19]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UPhysicsSettings
[S04-20]: https://docs.unity3d.com/6000.6/Documentation/Manual/class-PhysicsManager.html
[S04-21]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-manual-simulation.html
[S04-22]: https://docs.unity3d.com/6000.6/Documentation/Manual/sweep-based-ccd.html
[S04-23]: https://docs.unity3d.com/6000.6/Documentation/Manual/speculative-ccd.html
[S04-24]: https://docs.unity3d.com/Packages/com.unity.physics@6.6/manual/collision-queries.html
[S04-25]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-transform-sync.html
[S04-26]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-query-only.html
[S04-27]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UWorld/AsyncLineTraceByChannel
[S04-28]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/RaycastCommand.html
[S04-29]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Physics.OverlapSphereNonAlloc.html
[S04-30]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-workflow.html
[S04-31]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-world.html
[S04-32]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-multithreading.html
[S04-33]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-destroy.html
[S04-34]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-raycasting.html
[S04-35]: https://docs.unity3d.com/6000.6/Documentation/Manual/2d-physics-api/2d-physics-api-collision-handle.html
[S04-36]: https://dev.epicgames.com/documentation/en-us/unreal-engine/getting-started-with-chaos-visual-debugger
[S04-37]: https://docs.unity3d.com/6000.6/Documentation/Manual/PhysicsDebugVisualization.html
[S04-38]: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-physics-fields-in-unreal-engine
[S04-39]: https://docs.unity3d.com/6000.6/Documentation/Manual/physics-optimization-cpu-rigidbody-sleeping.html
[S04-40]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/Unity.U2D.Physics.PhysicsWorld.html
[S04-41]: https://dev.epicgames.com/documentation/en-us/unreal-engine/panel-cloth-editor-overview
[S04-42]: https://docs.unity3d.com/6000.6/Documentation/Manual/class-Cloth.html
[S04-43]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/ChaosFlesh
[S04-44]: https://dev.epicgames.com/documentation/en-us/unreal-engine/chaos-flesh-overview

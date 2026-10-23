# AI execution, navigation, and crowds

| Research status | Scope | Reviewed |
| --- | --- | --- |
| Complete for the documented mechanisms below | Current behavior execution, environment queries, interaction reservations, learned policies, navigation, and local avoidance | 2026-10-23 |

The central distinction in this chapter is between choosing an intention, finding an available interaction or route, and executing movement or an action. A system can accelerate one of these without solving the others. This research examines Unreal Engine 5.8 and Unity 6.6, with **Behavior 1.0.16**, **AI Navigation 2.0.16**, **ML-Agents 4.1.0**, and **com.unity.ai.inference 2.6.1**. The last package's current display name is **Sentis**. Package identities matter: similarly named older packages are not interchangeable evidence. [Unity package metadata][S03-09] [S03-12] [S03-15] [S03-24]

The chapter contains no OpenLegend feature designs, adoption recommendations, or benchmark claims. It uses OpenLegend's broad concern with authored character behavior and persistent simulation as a research lens, while preserving the boundary between engine mechanisms and game-specific meaning.

## 1. Behavior execution: avoiding unchanged decisions while retaining active work

### Unreal Behavior Trees

Unreal's Behavior Trees use Blackboard data and conditional decorators to control executable branches. Their documented event-driven model observes relevant changes and can abort lower-priority work without repeatedly traversing the entire tree. This removes redundant selection work when observed facts are unchanged. It does not remove periodic work inside an active branch: services can request interval callbacks while their subtree remains active. The Simple Parallel construct combines a primary task with a secondary subtree. “Parallel” here describes concurrent behavior; Epic explicitly warns that behavior-tree parallelism need not mean multiple processor threads. [Behavior Tree overview][S03-01]

**Interpretation.** Event-driven selection is valuable only relative to the events actually observed. If a condition can change without a corresponding notification, changing the tree's scheduling alone cannot make its decision correct. Conversely, a movement task may legitimately keep updating while the decision to move remains unchanged. Measuring the tree traversal alone would miss sensing, navigation, animation, and task work initiated by that tree.

### Unreal StateTree

StateTree combines hierarchical states with selection governed by entry conditions and transitions. A selected leaf and its active ancestors can contribute tasks. Transitions are considered from the leaf upward; selection occurs when a transition requests it. Data bindings connect parameters, schema context, evaluators, and eligible task outputs. Global tasks span the tree's running lifetime. A tick-tested transition and a completion-triggered transition have different recurring costs, even when drawn in the same editor. The overview's general comparison with continuously evaluating behavior trees must not be read as contradicting Unreal's separately documented event-driven Behavior Tree implementation. [StateTree overview][S03-02]

Current task APIs make scheduling more explicit than an undifferentiated per-frame state-machine description. A task can be considered for completion or scheduling independently, can request tick calls only when events exist, and can control whether bound properties are copied on ticks or state exit. The API also distinguishes entering/exiting a state from reselection of an already active state. These flags expose work and lifecycle choices that a high-level graph diagram would conceal. [FStateTreeTaskBase][S03-03]

The next scheduled tick can represent sleeping, one next-frame invocation, continuous frame invocation, or a custom interval. The documented tick reasons include tasks, transitions, external transition requests, pending delayed transitions, asynchronous completion, and delegates. A reason marked forced means the schema does not support scheduling. Thus, the API supports sleeping until relevant work exists, but its presence does not prove every schema or authored task runs without periodic updates. [FStateTreeScheduledTick][S03-04]; [ETickReason][S03-05]

### Environment Query System: candidate generation has its own cost

Unreal EQS generates candidate items, evaluates them relative to contexts, filters them, and scores survivors. The manual explains that filtering precedes scoring, reducing later work on rejected candidates. This is a query pipeline, not a general intelligence model: the result is only as meaningful as the generator, context, tests, and scoring functions supplied. [EQS overview][S03-06]

The manager exposes time slicing and query cancellation. Its configuration separately describes a testing-time allowance per update, breadth-first progress between queries versus completing one query's tests first, and warnings for generation, execution, and result-handler durations. Those separate diagnostics are significant: limiting testing time does not establish an equally strict bound for candidate creation or arbitrary completion callbacks. [UEnvQueryManager][S03-07]; [FEnvQueryManagerConfig][S03-08]

**Interpretation.** A small final result does not imply a small search. Producing candidates, checking eligibility, running geometric tests, and ranking survivors are different cost terms. A query that has not completed within its admitted work remains incomplete. It does not establish that no suitable place or object exists. Public configuration describes scheduling controls, not a proof of bounded worst-case latency under arbitrary custom generators and tests.

### Unity Behavior: control flow, event admission, and continuation

Unity Behavior graphs separate actions from control flow. Actions can complete in one frame or remain running. Sequences, conditional abort/restart, parallel branches, and joins determine continuation; the public status model distinguishes uninitialized, running, waiting, success, and failure. A visual stack of actions compiles to an ordinary sequence at runtime. These features make graph execution inspectable, but visual parallel branches alone do not establish CPU job parallelism. [Behavior graphs][S03-09]

Current event nodes expose materially different handling of arrivals while work is active: the default mode ignores messages received while busy; restart stops children and begins again; once handles one message; queue retains messages until the node becomes idle. Static subgraphs are embedded, whereas dynamically selected subgraphs communicate through a Blackboard asset interface. Navigation nodes can fall back from a NavMeshAgent to direct Transform movement. That last detail means a friendly node name such as “navigate” is insufficient evidence that route finding or obstacle constraints ran. [Behavior node types][S03-10]

**Interpretation.** Ignoring, replacing, and queuing events are different behaviors, not interchangeable performance implementations. A retained queue also creates a backlog dimension: a graph that processes messages eventually is not automatically a graph with bounded latency or memory. The inspected node reference does not specify a universal maximum queue length or overflow policy, so none is assumed here.

Running graph state can be serialized. Predefined nodes include serialization support; custom nodes require the relevant serializable properties, and object references require an application-provided resolver that maps identifiers back to GameObjects. Saving the graph's execution state therefore does not automatically restore every external participant or validate the continued action against a changed world. [Save and load running graph state][S03-11]

## 2. Trained policies and inference are separate from authored behavior graphs

Unity ML-Agents' C# package instruments environments and embeds trained behavior. Its companion Python package owns training algorithms. Agents supply observations, receive policy outputs, and execute actions through application code; chapter 02 details decision cadence. Training support is not evidence that a shipped game must train online, nor does executing a network prove that its observations respect character knowledge or that its output is mechanically admissible. [ML-Agents overview][S03-12]; [Simulation and perception](02-simulation-and-perception.md)

### Current Unity inference package

The inspected **com.unity.ai.inference 2.6.1** manual explicitly states that its display name changed from Inference Engine to Sentis in 2.4. It is a released local neural inference library, with supported model formats and operators dependent on the package contract. This avoids confusing current branding with the older package identity. [Sentis overview][S03-15]

A worker schedules model operations on CPU or GPU backends. The CPU implementation uses Burst jobs and dependencies; GPU implementations schedule compute or pixel-shader work. A returned tensor object may still represent pending computation. Synchronously reading a CPU copy can force completion and, for GPU output, a transfer. Thus moving inference off the main thread or onto the GPU does not remove synchronization cost if the caller immediately needs the answer on the CPU. [How Sentis runs a model][S03-13]

The worker can schedule a model incrementally across frames through a layer iterator. This reduces how much is scheduled at once at the cost of later completion. Layer count is not a universal millisecond budget because different layers and devices have different costs; that qualification is an inference from the interface, not a measured result. [Split inference over multiple frames][S03-14]

The backend reference documents CPU, GPU compute, and GPU pixel choices, including DirectML acceleration on supported DirectX 12 platforms. An unsupported layer can cause an assertion, and performance depends on operators, platform support, transfers, and competing application work. The first scheduled run can incur compilation and allocation that later runs reuse. These are reasons to distinguish setup, warm inference, and result readback; this research does not rank the backends by an invented benchmark. [Create a worker][S03-16]; [Run a model][S03-17]

### Unreal NNE and Learning Agents

Unreal's **Beta** Neural Network Engine exposes a common interface over runtime plugins. CPU inference uses CPU buffers; its GPU interface accepts CPU inputs/outputs and requires transfer/synchronization; its render-graph interface uses GPU buffers integrated into rendering. Runtime availability and model creation can fail independently of successful asset import. Models can share immutable weights between instances, while instances retain their own buffers. Callers own input/output lifetime and thread safety throughout inference. The documented separation is therefore between reusable model data, mutable execution instances, and the memory supplied for one evaluation. [Neural Network Engine overview][S03-18]

The **Experimental** IREE runtime compiles networks to game code using IREE, MLIR, and LLVM. That is a distinct deployment mechanism from merely loading a model into an interpreter or execution provider; the plugin page does not establish universal platform coverage or a performance result. [NNERuntimeIREE][S03-19]

Unreal **Learning Agents remains Experimental** in the current plugin index and supports reinforcement and imitation learning. Its interactor contract requires explicit observation/action schemas, gathering observations, and performing actions; it exposes batched agent operations, per-agent observation/action iteration information, and add/remove/reset callbacks. The learning library therefore does not erase the application's responsibility for the world-facing interpretation of policy inputs and outputs. [Learning Agents][S03-20]; [ULearningAgentsInteractor][S03-21]

**Interpretation.** A neural policy, a behavior graph, a navigation search, and an action executor can all participate in one character's behavior, but answer different questions. Their runtime cost includes input preparation and world queries as well as the central decision operation. The reviewed sources provide no basis for claiming that replacing a decision algorithm alone would eliminate expensive perception or route preparation.

## 3. Navigation represents traversability, then searches that representation

### Surface construction and fidelity

Unreal builds a tiled navigation mesh from collision geometry and searches its polygon connectivity with traversal costs. Static, dynamic, and dynamic-modifiers-only generation modes distinguish what can change at runtime. A dynamic modifier can change navigation treatment without implying a full recapture of arbitrary changed geometry. [Navigation System][S03-22]

Unreal's current mesh-resolution system permits low, default, and high resolution in different regions. Coarser cells reduce generation work, but the documentation demonstrates that a narrow passage can disappear from the navigable representation. This is a change to available routes, not simply a cheaper encoding with identical answers. The guide includes tile-resolution visualization and build-time heatmaps. [Navigation Mesh Resolutions][S03-23]

Unity's AI Navigation 2.0.16 provides surfaces for specific agent types, with selectable source geometry and collection scope. Voxel size changes geometric detail retained during baking. Tiles support parallel construction and bounded regional rebuilds, while smaller tiles can fragment the mesh and affect paths. Height-mesh data is optional additional information. These controls trade construction/memory cost against geometric representation; the manual's numeric examples are not adopted as universal tuning values here. [NavMesh Surface][S03-24]

Unity documents convex polygons with adjacency, A* search, a corridor of polygons, local adjustment of that corridor after avoidance, and steering toward the next visible corner. Its local simulation accounts for acceleration and constrains the simulated agent to the mesh after movement. “Visible corner” in this context belongs to route geometry; it does not mean the character noticed or knows the entire route. [Navigation system inner workings][S03-25]

Unity area costs weight distance, while area masks control allowed regions. The documentation cautions that polygon node placement can make the resulting route differ from the shortest geometric line. A graph-optimal result is therefore relative to its representation and costs; it is not proof of optimal travel in continuous space. [Navigation Areas and Costs][S03-26]

### Streaming and local construction

Unreal navigation invokers request runtime tile generation around actors. Generation is spatially restricted rather than requiring the whole world to be built at startup; configured distance from player seeds can also restrict which invokers are active. Local availability of tiles does not, by itself, provide a complete route across distant unloaded regions. [Navigation Invokers][S03-27]

**World-Partitioned Navigation Mesh remains Experimental** in the inspected 5.8 guide. It stores chunks as actors that stream with the world. Dynamic generation operates within loaded space, and streaming existing base-mesh content is treated specially to avoid unnecessary dirtying/rebuilding. New navigation-relevant actors can still dirty the base representation. This is a concrete example of distinguishing a representation becoming resident from underlying traversability actually changing. [World-Partitioned Navigation Mesh][S03-28]

Unity's asynchronous NavMesh update API hashes sources and build settings to rebuild changed portions. It still requires the complete relevant source collection: omitting an unchanged source is interpreted as a removal, and unstable ordering can introduce unnecessary hash changes. Settings changes can trigger broader rebuilding. Incremental update therefore depends on a complete dependency description, not on passing only the objects an application happens to consider changed. [UpdateNavMeshDataAsync][S03-29]

### Dynamic obstacles and topology

Unity distinguishes a moving local obstruction from a hole carved into the route representation. Without carving, nearby avoidance may fail to escape clutter or a blocked corridor. With the default stationary-only carving mode, moving removes the hole and local avoidance takes over; the hole returns after the stationary delay. The other mode updates after a movement threshold. The documented navigation result lags obstacle changes by a frame. This saves repeated rebuilding while accepting a specific delay and a difference in what global planning knows. [About NavMesh Obstacles][S03-30]

| Changing situation | Engine mechanism described above | Distinct consequence |
| --- | --- | --- |
| A moving neighbor enters the next few steps of travel | Local avoidance | Changes immediate velocity; does not necessarily find another global route |
| A stationary obstacle blocks a corridor | Carving or mesh update | Changes route connectivity used by pathfinding |
| Unchanged world content streams into memory | Navigation chunk residency | Makes an existing representation available |
| Underlying geometry changes | Dirty-region rebuild | Recalculates affected traversability |
| Construction uses coarser geometry | Mesh-resolution change | Can remove a passage that the detailed geometry permits |

The table is an analytical separation of the documented mechanisms, not a proposed policy for when OpenLegend should use them.

### Links connect route segments; execution still has a separate contract

Unity NavMesh links connect surfaces for the same agent type and can span a width rather than a single point. Overlapping mesh surfaces do not automatically become connected. [NavMesh Link][S03-31]

Unreal's current automatic navigation-link generation is **Experimental**. It generates connections for jump/fall situations using configured geometric constraints such as distance, depth, and height. [Automatic Navigation Link Generation][S03-32]

**Interpretation.** A link asserts a connection in the route graph. It does not prove that a particular jump animation, changing support surface, door interaction, or current character capability will execute successfully. Those are separate world-facing operations. Likewise, a path queried against engine navigation data does not establish that the character has learned the route.

## 4. Search scheduling, pending states, and movement ownership

Unity's asynchronous pathfinding has a configurable number of nodes expanded per frame. A long search can span multiple frames; allowing more expansions trades response delay against work in each frame. The documentation scopes this control to asynchronous requests such as destination updates, not every possible synchronous query. [pathfindingIterationsPerFrame][S03-33]

The NavMeshAgent API exposes separate facts: whether it has a path, whether a computation is pending, whether the path is stale, whether the agent is attached to a mesh, and whether the path is complete, partial, or invalid. Changing allowed areas makes a path stale. Desired velocity includes avoidance, while transform synchronization can be controlled separately. These are distinct states that a single “route exists” Boolean would collapse. [NavMeshAgent][S03-34]

Unreal's asynchronous path request returns an identifier and later invokes a completion delegate with success/failure. It can choose agent-appropriate navigation data and normal or hierarchical search modes. Returning the request identifier is acknowledgement of a request, not completion of a route. [FindPathAsync][S03-35]

Unity explicitly documents a conflict when both a non-kinematic Rigidbody and NavMeshAgent try to move the same object. Root-motion animation and navigation can similarly compete to write position. Its integration guidance calls for a clear direction of control between movement, animation, and physics. This is a correctness constraint, not only a performance concern. Navigation avoidance itself does not require physics colliders. [Using NavMeshAgent with other components][S03-36]

**Interpretation.** Deferring a search, failing to find a complete path, becoming detached from navigation data, and stopping movement are different causes of an apparently stationary character. The documented status interfaces expose enough information to distinguish several of them. They do not provide a global guarantee of search fairness or eventual arrival in a changing world.

## 5. Crowds and interactions: local work with explicit limitations

### Three documented avoidance families

Unreal's Character Movement RVO adjusts velocity relative to nearby agents without using the NavMesh; it can therefore move a character outside mesh bounds. Detour Crowd uses adaptive velocity sampling and corridor optimizations, supports pawns beyond Character subclasses, and has configured agent capacity. Epic presents the two as independent avoidance alternatives. Neither description constitutes a proof of collision-free motion or complete navigation through every dense configuration. [Unreal navigation avoidance][S03-37]

Unity's current navigation explanation identifies reciprocal velocity obstacles for local velocity selection, balancing preferred travel with predicted collisions. This is the algorithm documented in the current package; its historical origin does not make a newer undocumented algorithm the engine's current implementation. [Navigation system inner workings][S03-25]

Unreal **Mass Avoidance is Experimental**. It computes steering forces from separation and predicted future impacts. Nearby obstacles come from a two-dimensional spatial hash grid; only the closest entities are considered. Entities use capsule/pill representations, while boundaries are edges. Separate processors handle moving and standing entities, update grid membership, and build boundary edges from cached ZoneGraph lanes. These details identify work avoided through local candidate selection and simplified shapes, as well as the representation's limits. They do not establish general volumetric flying navigation or an exact multi-body contact solve. [Mass Avoidance overview][S03-38]

**Interpretation.** Crowd steering predicts near-term motion to choose a useful velocity; rigid-body collision response enforces another set of physical constraints; global pathfinding searches another representation again. Similar words such as “collision,” “prediction,” and “agent” do not make those contracts equivalent. Sparse nearest-neighbor work can reduce cost substantially in principle, while concentrated crowds still increase local work and difficult interactions. No capacity number is inferred from the word “Mass.”

### Smart Objects: shared definitions, claims, and streamed actors

Unreal Smart Objects register searchable interaction slots in a spatially partitioned subsystem. Shared immutable definitions hold eligibility/activity data; agents search, claim a slot, approach it, occupy it, and release it after completion or interruption. A claim prevents another claim on that slot, but the agent executes the behavior. Persistent collections can retain runtime interaction data when its actor streams out; ordinary dynamically spawned components do not gain that persistence automatically. Object invalidation releases claims and notifies agents, while an agent abort must release its own claim. Search results therefore precede a separate claim attempt that can fail. [Smart Objects overview][S03-39]

**Interpretation.** Spatial discovery, eligibility filtering, exclusivity, approach, execution, and cleanup are separate phases. A previously returned free slot is not a perpetual reservation. Persisting an interaction record beyond actor residency is also different from keeping the actor's entire simulation alive. The source describes those boundaries without proving arbitrary application actions are transactional or recoverable after a process restart.

## 6. Research conclusions and unresolved evidence

The strongest common mechanisms in these sources are dependency-directed execution, explicit running/pending states, candidate filtering before expensive tests, regional rebuilding, shared immutable definitions, and separation of search from execution. These are comparative observations, not a selection of components for OpenLegend.

Their tradeoffs differ. An event observer avoids an unchanged decision; an asynchronous path request delays an answer; coarser navigation can change reachability; a crowd approximation changes local motion; a queued behavior event retains future obligations. A claim that all of them simply “make AI cheaper” would hide the behavior that changes or the work that moves elsewhere.

The inspected sources do not establish worst-case queue latency, global deadlock-free crowd navigation, complete whole-world route availability under streaming, policy quality after training, or measured OpenLegend speedups. Custom callbacks, observation collection, and environment-query generation remain application work. Runtime diagrams and package samples are not substitutes for those missing measurements, and this study does not invent them.

## Source and provenance register

All sources were accessed **2026-10-23**. UE pages identify **5.8** and are undated live documentation unless stated otherwise. Unity package build dates below are documentation generator dates, not claimed feature-introduction dates. “Read” means the relevant technical sections were inspected. The StateTree selectors landing page and guessed Unity event/blackboard/subgraph URLs returned no usable content; their unavailable bodies are not evidence. The current node reference supplied the event and subgraph details used here.

| ID | First-party source | Version/date; medium | Inspected scope |
| --- | --- | --- | --- |
| S03-01 | [Behavior Tree overview][S03-01] | UE 5.8; manual | Events, observers, services, conceptual concurrency |
| S03-02 | [StateTree overview][S03-02] | UE 5.8; manual | Selection, transitions, data bindings, global tasks |
| S03-03 | [FStateTreeTaskBase][S03-03] | UE 5.8; API | Completion, scheduling, event-only ticks, lifecycle |
| S03-04 | [FStateTreeScheduledTick][S03-04] | UE 5.8; API | Sleep, custom cadence, one-frame and every-frame requests |
| S03-05 | [ETickReason][S03-05] | UE 5.8; API | Reasons for scheduling and forced fallback |
| S03-06 | [EQS overview][S03-06] | UE 5.8; manual | Generation, contexts, filtering before scoring |
| S03-07 | [UEnvQueryManager][S03-07] | UE 5.8; API | Time slicing and cancellation |
| S03-08 | [FEnvQueryManagerConfig][S03-08] | UE 5.8; API | Testing allowance, breadth/depth policy, separate duration warnings |
| S03-09 | [Behavior graphs][S03-09] | Behavior 1.0.16; built 2026-05-28; manual | Control flow and statuses |
| S03-10 | [Behavior node types][S03-10] | Behavior 1.0.16; built 2026-05-28; manual | Event modes, static/dynamic subgraphs, navigation fallback |
| S03-11 | [Save and load running graph state][S03-11] | Behavior 1.0.16; built 2026-05-28; manual | Serialization and external-object resolution |
| S03-12 | [ML-Agents overview][S03-12] | ML-Agents 4.1.0; built 2026-07-29; manual | C# environment/runtime versus Python training |
| S03-13 | [How Sentis runs a model][S03-13] | com.unity.ai.inference 2.6.1; built 2026-04-02; manual | Backends, dependencies, pending output, readback |
| S03-14 | [Split inference over multiple frames][S03-14] | Same package/version; manual | Incremental layer scheduling |
| S03-15 | [Sentis overview][S03-15] | Same package/version; manual | Metadata, display-name change, released status |
| S03-16 | [Create a worker][S03-16] | Same package/version; manual | Backend differences, DirectML, unsupported operators |
| S03-17 | [Run a model][S03-17] | Same package/version; manual | Initial compilation/allocation and reuse |
| S03-18 | [Neural Network Engine overview][S03-18] | UE 5.8; **Beta**; manual | Interfaces, model/instance lifetime, memory ownership, failure |
| S03-19 | [NNERuntimeIREE][S03-19] | UE 5.8; **Experimental**; plugin index | Compiler-based runtime description |
| S03-20 | [Learning Agents][S03-20] | UE 5.8; **Experimental**; plugin index | Purpose, modules, dependencies |
| S03-21 | [ULearningAgentsInteractor][S03-21] | UE 5.8; API | Schemas, observation/action batches, agent lifecycle |
| S03-22 | [Navigation System][S03-22] | UE 5.8; manual | Tiled polygons, costs, generation modes |
| S03-23 | [Navigation Mesh Resolutions][S03-23] | UE 5.8; manual | Regional resolution and disappearing passage example |
| S03-24 | [NavMesh Surface][S03-24] | AI Navigation 2.0.16; built 2026-10-07; manual | Source collection, voxels, tiles, height data |
| S03-25 | [Navigation system inner workings][S03-25] | Same package/version; manual | A*, corridors, steering, RVO, movement constraints |
| S03-26 | [Navigation Areas and Costs][S03-26] | Same package/version; manual | Masks, weighted costs, discretization limits |
| S03-27 | [Navigation Invokers][S03-27] | UE 5.8; manual | Local generation and seed-distance restriction |
| S03-28 | [World-Partitioned Navigation Mesh][S03-28] | UE 5.8; **Experimental**; manual | Streaming chunks, base mesh, dirtying rules |
| S03-29 | [UpdateNavMeshDataAsync][S03-29] | Unity 6.6; API | Hashes, complete source set, ordering, settings changes |
| S03-30 | [About NavMesh Obstacles][S03-30] | AI Navigation 2.0.16; manual | Movement thresholds, stationary carving, one-frame delay |
| S03-31 | [NavMesh Link][S03-31] | Same package/version; manual | Agent types, widths, surface connection |
| S03-32 | [Automatic Navigation Link Generation][S03-32] | UE 5.8; **Experimental**; manual | Jump/fall connectivity constraints |
| S03-33 | [pathfindingIterationsPerFrame][S03-33] | Unity 6.6; API | Per-frame asynchronous search-node allowance |
| S03-34 | [NavMeshAgent][S03-34] | Unity 6.6; API | Pending/stale/partial/invalid and movement state |
| S03-35 | [FindPathAsync][S03-35] | UE 5.8; API | Request identity, completion callback, navigation data |
| S03-36 | [Using NavMeshAgent with other components][S03-36] | AI Navigation 2.0.16; manual | Transform ownership and physics/animation integration |
| S03-37 | [Unreal navigation avoidance][S03-37] | UE 5.8; manual | RVO and Detour differences and boundaries |
| S03-38 | [Mass Avoidance overview][S03-38] | UE 5.8; **Experimental**; manual | Hash-grid neighbors, simplified shapes, predictive forces |
| S03-39 | [Smart Objects overview][S03-39] | UE 5.8; manual | Shared definitions, claims, execution and invalidation lifecycle |

[S03-01]: https://dev.epicgames.com/documentation/en-us/unreal-engine/behavior-tree-in-unreal-engine---overview
[S03-02]: https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine
[S03-03]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/StateTreeModule/FStateTreeTaskBase
[S03-04]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/StateTreeModule/FStateTreeScheduledTick
[S03-05]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Plugins/StateTreeModule/UE__StateTree__ETickReason
[S03-06]: https://dev.epicgames.com/documentation/en-us/unreal-engine/environment-query-system-overview-in-unreal-engine
[S03-07]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/UEnvQueryManager
[S03-08]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/AIModule/FEnvQueryManagerConfig
[S03-09]: https://docs.unity3d.com/Packages/com.unity.behavior@1.0/manual/behavior-graph.html
[S03-10]: https://docs.unity3d.com/Packages/com.unity.behavior@1.0/manual/node-types.html
[S03-11]: https://docs.unity3d.com/Packages/com.unity.behavior@1.0/manual/serialization.html
[S03-12]: https://docs.unity3d.com/Packages/com.unity.ml-agents@4.1/manual/index.html
[S03-13]: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/manual/how-sentis-runs-a-model.html
[S03-14]: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/manual/split-inference-over-multiple-frames.html
[S03-15]: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/manual/index.html
[S03-16]: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/manual/create-an-engine.html
[S03-17]: https://docs.unity3d.com/Packages/com.unity.ai.inference@2.6/manual/run-a-model.html
[S03-18]: https://dev.epicgames.com/documentation/en-us/unreal-engine/neural-network-engine-overview-in-unreal-engine
[S03-19]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/NNERuntimeIREE
[S03-20]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/PluginIndex/LearningAgents
[S03-21]: https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/LearningAgents/ULearningAgentsInteractor?lang=en-US
[S03-22]: https://dev.epicgames.com/documentation/en-us/unreal-engine/navigation-system-in-unreal-engine
[S03-23]: https://dev.epicgames.com/documentation/en-us/unreal-engine/navigation-mesh-resolutions-user-guide
[S03-24]: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavMeshSurface.html
[S03-25]: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavInnerWorkings.html
[S03-26]: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/AreasAndCosts.html
[S03-27]: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-navigation-invokers-in-unreal-engine
[S03-28]: https://dev.epicgames.com/documentation/en-us/unreal-engine/world-partitioned-navigation-mesh
[S03-29]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/AI.NavMeshBuilder.UpdateNavMeshDataAsync.html
[S03-30]: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/AboutObstacles.html
[S03-31]: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/NavMeshLink.html
[S03-32]: https://dev.epicgames.com/documentation/en-us/unreal-engine/automatic-navigation-link-generation
[S03-33]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/AI.NavMesh-pathfindingIterationsPerFrame.html
[S03-34]: https://docs.unity3d.com/6000.6/Documentation/ScriptReference/AI.NavMeshAgent.html
[S03-35]: https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/NavigationSystem/UNavigationSystemV1/FindPathAsync
[S03-36]: https://docs.unity3d.com/Packages/com.unity.ai.navigation@2.0/manual/MixingComponents.html
[S03-37]: https://dev.epicgames.com/documentation/en-us/unreal-engine/using-avoidance-with-the-navigation-system-in-unreal-engine
[S03-38]: https://dev.epicgames.com/documentation/en-us/unreal-engine/mass-avoidance-overview-in-unreal-engine
[S03-39]: https://dev.epicgames.com/documentation/en-us/unreal-engine/smart-objects-in-unreal-engine---overview
